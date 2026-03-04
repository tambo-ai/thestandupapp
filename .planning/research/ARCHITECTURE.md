# Architecture Patterns

**Domain:** Multi-tenant team standup app with WorkOS auth, Pipes OAuth connections, and live shared sessions
**Researched:** 2026-03-03

---

## Recommended Architecture

The milestone introduces three new structural layers on top of the existing single-user app:

1. **WorkOS AuthKit** replaces Better Auth — handles login, sessions, and cookie management
2. **WorkOS Pipes** replaces localStorage token storage — manages GitHub and Linear OAuth connections server-side
3. **Multi-tenant data model** replaces single-user mental model — users belong to teams, teams share tools
4. **SSE-based live standup sessions** — server broadcasts shared Tambo thread state to all team members

```
Browser Clients
  │
  ├── GET / → Next.js App (protected by authkitMiddleware)
  │     ├── getUser() → WorkOS session (userId, organizationId, accessToken)
  │     └── TamboProvider (system prompt now includes team context)
  │
  ├── POST /api/standup/[sessionId]/events (SSE) → broadcasts session state
  │
  └── POST /api/standup/[sessionId]/submit → active driver submits input
          │
          └── API Routes (Linear/GitHub)
                ├── withAuth() → userId from session cookie
                └── workos.pipes.getAccessToken({ provider, userId, organizationId })
                      → token injected server-side (no client headers needed)
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `authkitMiddleware` (middleware.ts) | Intercepts all requests, validates WorkOS session cookie, redirects to AuthKit hosted login | WorkOS session service |
| `getUser()` / `withAuth()` | Server-side session read — extracts userId, organizationId, accessToken from encrypted cookie | WorkOS session service |
| `WorkOS.pipes.getAccessToken()` | Fetches a fresh GitHub or Linear token for a given user+org — WorkOS refreshes automatically | WorkOS Pipes service |
| DB: users table | Maps WorkOS userId to app-internal user record | Kysely, Turso |
| DB: teams table | Workspace entity — one per team, maps to WorkOS organizationId | Kysely, Turso |
| DB: memberships table | User-to-team relation, role (owner/member), invite state | Kysely, Turso |
| DB: invitations table | Pending invite tokens (email or link-based) | Kysely, Turso |
| `TeamContext` server utility | Reads memberships to resolve "which team members can I aggregate across" for a given session | DB layer |
| `withTeamContext(handler)` | API route wrapper: extracts userId, resolves team, fetches Pipes tokens for all members (read) or just self (write) | WorkOS Pipes, DB |
| `/api/auth/callback` | WorkOS OAuth callback handler — creates/updates user and team records after AuthKit redirect | WorkOS, DB |
| `<Pipes />` widget page | Renders WorkOS Pipes widget so users can connect GitHub/Linear; authenticates via `useAccessToken()` hook | WorkOS Pipes widget, AuthKit session |
| `/api/standup/sessions` | Create, list, and end standup sessions for a team | DB, session store |
| `/api/standup/[id]/events` (SSE) | Long-running SSE connection; sends session state updates to all connected viewers | In-process session store |
| `/api/standup/[id]/submit` | POST endpoint; active driver submits a query that gets forwarded to the Tambo thread | Tambo API, SSE broadcast |
| `/api/standup/[id]/control` | POST endpoint; request/release driver seat | SSE broadcast |
| `StandupSession` in-process store | Map of sessionId → { currentDriver, connectedClients: SSEController[] } | Route handlers |
| `tambo.ts` (updated) | Tools now receive teamId from system prompt context and use `withTeamContext` pattern to aggregate across members | API routes |

---

## Data Flow

### 1. Authentication Flow (WorkOS AuthKit replaces Better Auth)

```
User visits /
  → authkitMiddleware checks for WorkOS session cookie
  → Cookie missing → redirect to AuthKit hosted login (workos.com)
  → User authenticates (Google, email, etc.) on WorkOS-hosted page
  → WorkOS redirects back to /api/auth/callback?code=...
  → handleAuth() exchanges code for session, sets encrypted HTTP-only cookie
  → Callback handler upserts user row in Turso (workos_user_id, email, name)
  → Redirect to /
  → authkitMiddleware finds valid cookie → request proceeds
  → Server component calls getUser() → { user, organizationId, accessToken }
```

**Middleware change:** Replace `betterAuth.middleware()` call with `authkitMiddleware()` export. The new middleware validates the WorkOS-signed session cookie. The CVE-2025-29927 pattern (x-middleware-subrequest bypass) means auth must also be verified at data access points via `withAuth({ ensureSignedIn: true })` in API routes — not only in middleware.

**Session data available server-side (from `withAuth()`):**
- `user.id` — WorkOS user ID (replaces Better Auth's userId for token scoping)
- `user.email`, `user.firstName`, `user.lastName`
- `organizationId` — WorkOS organization ID (maps to team in our DB)
- `accessToken` — WorkOS JWT (used to authenticate the Pipes widget)

### 2. Token Flow (WorkOS Pipes replaces localStorage encryption)

```
User visits /settings/connections
  → Page renders <Pipes authToken={getAccessToken} /> widget
  → Widget shows GitHub and Linear as available providers
  → User clicks "Connect" → WorkOS handles OAuth flow entirely
  → WorkOS stores the GitHub/Linear token against (userId, organizationId)
  → Widget shows "Connected" status

API route receives a request needing a GitHub token:
  → withAuth() extracts userId and organizationId from session cookie
  → workos.pipes.getAccessToken({ provider: 'github', userId, organizationId })
  → Returns { accessToken: { access_token: 'ghs_...', expires_at: '...' } }
  → Token used directly for GitHub API call
  → Token never touches the browser or request headers from client
```

**Key difference from current design:** The client no longer sends `x-github-token` or `x-linear-api-key` headers. The `withLinearClient` and `withGitHubToken` wrappers are replaced by a `withPipesToken(provider)` wrapper that fetches the token server-side using the session's userId + organizationId.

### 3. Multi-Tenant Read (aggregate across team members)

```
User asks AI: "What is the team working on?"
  → Tambo tool: getTeamWorkSummary({ teamId })
  → Tool calls /api/linear/team-summary?teamId=X
  → API route: withAuth() → userId
  → DB query: SELECT user_id FROM memberships WHERE team_id = X AND status = 'active'
  → For each member userId:
      workos.pipes.getAccessToken({ provider: 'linear', userId: memberId, organizationId })
      → If token exists: fetch that member's Linear data
      → If not connected: skip (graceful degradation)
  → Aggregate and return combined result
```

This is the "read-across" permission model: the requesting user's session determines which team to aggregate over, but each member's own Pipes token is used to fetch their data. No impersonation — WorkOS Pipes explicitly supports multi-user token retrieval from the backend using the user's ID.

### 4. Write Operations (self only)

```
User asks AI: "Create a PR for issue LIN-42"
  → Tambo tool: createGitHubPR({ ... })
  → API route: withAuth() → { userId }  ← only the requesting user
  → workos.pipes.getAccessToken({ provider: 'github', userId, organizationId })
  → Create PR using only the requesting user's token
  → Other team members' tokens are never used for write operations
```

The API layer enforces this by design: write-endpoint wrappers only call `getAccessToken` with the session's own `userId`. Read-endpoint wrappers iterate over all member IDs from the memberships table.

### 5. Live Standup Session Flow

```
Team lead clicks "Start Standup"
  → POST /api/standup/sessions → creates session row, sessionId returned
  → Leader shares link: /standup/[sessionId]

Members visit /standup/[sessionId]
  → Page opens SSE connection: GET /api/standup/[id]/events
  → Server registers client in StandupSession store: Map<sessionId, SessionState>
  → SSE pushes current state: { driver: userId, messages: [...], participants: [...] }

Driver submits query:
  → POST /api/standup/[id]/submit { query: "what is everyone working on?" }
  → Server validates: is this user the current driver?
  → Server calls Tambo API with team context
  → As Tambo streams response, server broadcasts SSE events to all connected clients
  → All viewers see the same AI conversation update in real time

Driver control transfer:
  → POST /api/standup/[id]/control { action: 'request' | 'release' }
  → Server updates driver in session state
  → SSE broadcasts updated { driver: newUserId } to all clients
  → Previous driver's input is disabled; new driver's input is enabled

Session ends:
  → POST /api/standup/sessions/[id]/end
  → Server marks session ended, closes all SSE connections
```

**SSE implementation approach for Next.js 15 App Router:**
Use Route Handler with `ReadableStream`. Maintain an in-process `Map<sessionId, Set<ReadableStreamController>>` to track connected clients per session. When an event occurs (new message, driver change), iterate the set and enqueue to each controller. This works because live standup is a single-server scenario (not requiring cross-node broadcast at this scale).

```typescript
// /api/standup/[id]/events/route.ts
export const dynamic = 'force-dynamic';

const sessions = new Map<string, Set<ReadableStreamDefaultController>>();

export async function GET(req: Request, { params }) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const sessionId = params.id;

  const stream = new ReadableStream({
    start(controller) {
      if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
      sessions.get(sessionId)!.add(controller);

      req.signal.addEventListener('abort', () => {
        sessions.get(sessionId)?.delete(controller);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    }
  });
}
```

**Why SSE over WebSocket:** Next.js App Router Route Handlers are serverless-compatible; WebSocket servers cannot run inside them. SSE over HTTP is sufficient because the standup session is "server-pushed state" — the server owns the Tambo thread and broadcasts updates, clients only send discrete input actions via standard POST requests.

---

## Multi-Tenant Data Model

```sql
-- Maps WorkOS user identity to app user
CREATE TABLE users (
  id TEXT PRIMARY KEY,               -- WorkOS user ID (e.g., "user_01ABC...")
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL
);

-- Team workspace; maps to a WorkOS organization
CREATE TABLE teams (
  id TEXT PRIMARY KEY,               -- app-generated UUID
  workos_org_id TEXT UNIQUE,         -- WorkOS organization ID (nullable until org created)
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,  -- for invite-link joins
  created_at INTEGER NOT NULL
);

-- User membership in a team
CREATE TABLE memberships (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'member'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'pending'
  joined_at INTEGER,
  UNIQUE(team_id, user_id)
);

-- Pending invitations (email-based or link-based)
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_email TEXT,                -- NULL for link-based invites
  token TEXT NOT NULL UNIQUE,        -- random token for link/email
  invited_by TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Live standup sessions
CREATE TABLE standup_sessions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tambo_thread_id TEXT,              -- Tambo thread backing this session
  started_by TEXT NOT NULL REFERENCES users(id),
  current_driver TEXT REFERENCES users(id),  -- NULL = no active driver
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);
```

**Key design decisions:**
- `users.id` is the WorkOS user ID directly — no separate mapping needed
- `teams.workos_org_id` is nullable; WorkOS org is created when the first team is created via the WorkOS API
- `memberships.status = 'pending'` represents invited-but-not-yet-joined users (email invite flow)
- Connection status (GitHub/Linear connected) is NOT stored in this DB — WorkOS Pipes owns that state and it is queried live via `getAccessToken` (error response means not connected)
- Standup session `tambo_thread_id` allows re-loading session history if needed

---

## API Route Wrapper Pattern (Updated)

The existing `withLinearClient` and `withGitHubToken` wrappers that read from request headers become `withPipesToken` wrappers that read from the WorkOS session cookie.

```typescript
// src/lib/pipes-client.ts

type PipesProvider = 'linear' | 'github';

export function withPipesToken(
  provider: PipesProvider,
  handler: (token: string, req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });
    const result = await workos.pipes.getAccessToken({
      provider,
      userId: user.id,
      organizationId: organizationId!,
    });
    if (result.error || !result.accessToken) {
      return Response.json({ error: 'Not connected', provider }, { status: 401 });
    }
    return handler(result.accessToken.access_token, req);
  };
}

// For read-across: fetches tokens for all team members
export async function getTeamTokens(
  provider: PipesProvider,
  teamId: string,
  organizationId: string
): Promise<Array<{ userId: string; token: string }>> {
  const members = await db
    .selectFrom('memberships')
    .where('team_id', '=', teamId)
    .where('status', '=', 'active')
    .select('user_id')
    .execute();

  const results = await Promise.allSettled(
    members.map(async ({ user_id }) => {
      const result = await workos.pipes.getAccessToken({
        provider,
        userId: user_id,
        organizationId,
      });
      if (result.error || !result.accessToken) return null;
      return { userId: user_id, token: result.accessToken.access_token };
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<{ userId: string; token: string }>).value);
}
```

---

## Tambo Tools Update

The Tambo tool layer changes in two ways:

**1. System prompt gains team context:**
```typescript
// src/lib/tambo.ts - getSystemPrompt()
const systemPrompt = `
You are a standup assistant for ${user.name}'s team: ${team.name}.
Team members: ${memberNames.join(', ')}.
Organization ID: ${organizationId}.
Team ID: ${team.id}.

When asked about "the team" or "what is everyone working on", use team-scoped tools
that aggregate across all connected team members.
`;
```

**2. New team-scoped tools replace single-user tools for reads:**

| Old Tool | New Tool | Change |
|----------|----------|--------|
| `listTeams` | `listLinearTeams` | Now fetches from requester's Linear token only |
| `getTeamMembers` | `getTeamWorkSummary` | Fetches across all members' Linear connections |
| (no write tool) | `createLinearIssue` | Uses requester's token only (write-as-self) |
| `findGitHubUser` | `getTeamPRSummary` | Aggregates PRs across all members' GitHub connections |

The system prompt now includes `teamId` so AI can pass it to team-scoped tools without asking the user.

---

## Suggested Build Order

Dependencies between components determine sequencing. Each phase must be fully complete before the next can start.

### Phase 1: WorkOS AuthKit Migration (foundation — blocks everything else)

**What:** Replace Better Auth with WorkOS AuthKit end-to-end.

**Files changed:**
- `src/middleware.ts` — swap `betterAuth.middleware()` for `authkitMiddleware()`
- `src/lib/auth.ts` — remove Better Auth config; add WorkOS client init (`new WorkOS(process.env.WORKOS_API_KEY)`)
- `src/lib/auth-client.ts` — remove Better Auth client; replace `useSession` with `useAuth()` from `@workos-inc/authkit-nextjs/components`
- `src/app/api/auth/[...all]/route.ts` — replace Better Auth handler with `handleAuth()`
- `src/app/login/page.tsx` — replace Google OAuth button with WorkOS-hosted redirect (`authkit()`)
- `src/app/page.tsx` — replace `useSession()` with `useAuth()` or `getUser()` server-side

**Why first:** Every other component depends on `userId` and `organizationId` from the WorkOS session. The Pipes widget needs `accessToken` from this session. The DB schema uses WorkOS user IDs as primary keys.

**Env vars added:** `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`
**Env vars removed:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Phase 2: DB Schema + Team Data Model (blocks Pipes, memberships, invites)

**What:** Migrate Turso schema from Better Auth tables to new multi-tenant model.

**Files changed/created:**
- `src/lib/db.ts` — new Kysely DB client (replaces Better Auth's internal db usage); typed with new schema
- `src/db/schema.sql` — canonical schema (users, teams, memberships, invitations, standup_sessions)
- `src/db/migrate.ts` — migration runner using Kysely migrations

**Why second:** Needed before WorkOS Pipes (which writes to users table on callback), before team management UI, and before invite flows. Auth callback in Phase 1 needs a user row to exist, but that write can be deferred to here.

### Phase 3: WorkOS Pipes Integration (blocks team reads)

**What:** Replace localStorage token storage with WorkOS Pipes; update API route wrappers.

**Files changed/created:**
- `src/lib/pipes-client.ts` — `withPipesToken()`, `getTeamTokens()` helpers (as shown above)
- `src/lib/linear-client.ts` — remove header-based extraction; use `withPipesToken('linear')`
- `src/lib/github-client.ts` — remove header-based extraction; use `withPipesToken('github')`
- `src/lib/user-tokens.ts` — delete (no longer needed)
- `src/app/settings/connections/page.tsx` — new page with `<Pipes />` widget
- `src/components/UserHeader.tsx` — remove token settings modal; link to connections page

**Why third:** Requires Phase 1 (WorkOS session for userId+organizationId) and Phase 2 (user row must exist before Pipes can associate a connection). The API route updates also unblock Phase 5 (team reads need `getTeamTokens()`).

### Phase 4: Team Management UI (invite links, create/join team)

**What:** Create team, join via invite link, join via email, manage membership.

**Files changed/created:**
- `src/app/team/new/page.tsx` — create team form (creates WorkOS org + team row)
- `src/app/team/join/[token]/page.tsx` — accept invite link
- `src/app/team/settings/page.tsx` — owner: manage members, generate invite link, send email invite
- `src/app/api/team/route.ts` — POST create team, GET current team
- `src/app/api/team/invite/route.ts` — POST generate invite link/send email, GET validate token
- `src/app/api/team/members/route.ts` — GET list, DELETE remove member
- `src/app/api/auth/callback/route.ts` — post-auth: if invite token in state param, auto-join team

**Why fourth:** Requires Phase 2 (DB schema). Can run after Phase 3 but does not strictly depend on it. Needed before Phase 5 (team reads need at least one team with members).

### Phase 5: Team-Scoped Tambo Tools (AI aggregation across members)

**What:** Update Tambo tool definitions to use `getTeamTokens()` for reads and update system prompt with team context.

**Files changed:**
- `src/lib/tambo.ts` — update `getSystemPrompt()` to include team info; replace/update tools
- All API routes under `/api/linear/` and `/api/github/` — add team-aggregate variants

**Why fifth:** Depends on Phase 3 (Pipes tokens) and Phase 4 (team membership resolution). This is the first phase that delivers the "AI can answer team-wide questions" core value.

### Phase 6: Live Standup Session

**What:** Shared SSE-based standup mode with driver control.

**Files changed/created:**
- `src/app/standup/[id]/page.tsx` — standup view page (read-only for non-drivers)
- `src/app/api/standup/sessions/route.ts` — create/list sessions
- `src/app/api/standup/[id]/events/route.ts` — SSE broadcast endpoint
- `src/app/api/standup/[id]/submit/route.ts` — driver submits query
- `src/app/api/standup/[id]/control/route.ts` — request/release driver seat
- `src/lib/standup-session-store.ts` — in-process SSE client registry

**Why last:** Depends on all previous phases. Uses team context (Phase 4), Pipes tokens for team queries (Phase 3+5), and WorkOS session for participant identity (Phase 1).

---

## Scalability Considerations

| Concern | Now (v1) | At Scale |
|---------|----------|----------|
| Pipes token calls | One call per member per query — ~5-10 members, fine | Cache tokens for 30s (they expire after hours, not seconds) |
| Team aggregate queries | Sequential or `Promise.allSettled` per member | Fine for < 20 members; needs batching above that |
| SSE connections | In-process Map — works on single server instance | Would need Redis pub/sub if deploying to multiple instances |
| WorkOS org management | One org per team | WorkOS supports thousands of orgs per environment |
| Turso reads | Single shared database, all tenants | Per-tenant DB isolation available in Turso if needed later |

The in-process SSE store is intentionally simple and correct for the v1 use case (small teams, single deployment). Adding Redis would allow multi-instance deployment but is out of scope.

---

## Security Considerations

**Session security:** AuthKit issues encrypted HTTP-only cookies. Never expose `accessToken` to the client beyond what the Pipes widget needs (it reads it via `getAccessToken()` from the hook, not raw exposure). Follow the CVE-2025-29927 fix: always call `withAuth({ ensureSignedIn: true })` inside API routes, not just middleware.

**Pipes token security:** `workos.pipes.getAccessToken()` is called server-side only. Tokens never transit through client headers. The old `x-linear-api-key` / `x-github-token` header pattern is fully eliminated.

**Write-as-self enforcement:** The `withPipesToken()` wrapper always uses the session's own `userId`. There is no API surface that accepts a `targetUserId` parameter for write operations. This is enforced structurally, not by a runtime check.

**Team boundary enforcement:** All DB queries for team data include a `WHERE team_id = ?` bound to the session user's membership. Membership is resolved server-side; the client cannot assert a different team.

**Invite token expiry:** Invitation tokens expire after 7 days. The `accepted_at` timestamp prevents replay.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Pipes Tokens in Your Own DB
**What:** Calling `getAccessToken`, then saving the token string to Turso for reuse.
**Why bad:** Token expiry and refresh are WorkOS's responsibility. Cached tokens will expire silently. WorkOS handles refresh automatically; you only need to call `getAccessToken` again per request.
**Instead:** Call `workos.pipes.getAccessToken()` fresh on each API route invocation. The overhead is a single HTTPS call to WorkOS, not a database query of the external API.

### Anti-Pattern 2: Using Middleware-Only for Auth
**What:** Relying solely on `authkitMiddleware` to block unauthorized access to API routes.
**Why bad:** CVE-2025-29927 allows x-middleware-subrequest header manipulation to bypass middleware in some Next.js versions.
**Instead:** Always call `withAuth({ ensureSignedIn: true })` at the top of every API route handler.

### Anti-Pattern 3: Passing Team Member Tokens Back to the Client
**What:** Aggregating multi-member data by sending each member's token to the browser.
**Why bad:** Exposes tokens belonging to other users to the requesting user's browser.
**Instead:** All aggregation happens server-side in API routes. Client receives aggregated data, never raw tokens.

### Anti-Pattern 4: WebSocket Server Inside Next.js Route Handlers
**What:** Trying to establish a WebSocket upgrade inside a Next.js App Router Route Handler.
**Why bad:** Route Handlers are serverless functions; they cannot hold stateful connections. WebSocket upgrades require a persistent server.
**Instead:** Use SSE (ReadableStream in Route Handler) for server→client push. Clients send input via discrete POST requests. This is compatible with Next.js App Router and Vercel deployment.

### Anti-Pattern 5: One WorkOS Organization Per User
**What:** Creating a WorkOS organization for every individual user at signup.
**Why bad:** Pipes tokens are scoped to (userId, organizationId). A user without an org has no organizationId, blocking Pipes. But creating a personal org for every user is expensive and semantically wrong.
**Instead:** Create the WorkOS org only when a user creates a new team. Single users without a team cannot use Pipes — this is acceptable since the product is team-first. The "onboarding" flow requires joining or creating a team before connecting integrations.

---

## Sources

- WorkOS authkit-nextjs README (session data shape, withAuth return type): https://github.com/workos/authkit-nextjs/blob/main/src/session.ts — HIGH confidence
- WorkOS Pipes documentation (getAccessToken API, token lifecycle): https://workos.com/docs/pipes — HIGH confidence
- WorkOS Pipes Linear tutorial (server-side token retrieval pattern): https://workos.com/blog/fetch-data-from-linear-with-pipes-tutorial — HIGH confidence
- WorkOS Pipes widget docs (Pipes component, authToken prop): https://workos.com/docs/widgets/pipes — HIGH confidence
- Next.js 15 SSE with ReadableStream (Route Handler pattern): https://damianhodgkiss.com/tutorials/real-time-updates-sse-nextjs — MEDIUM confidence
- WebSockets vs SSE in Next.js 15 (WebSockets not supported in Route Handlers): https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events — MEDIUM confidence
- Multi-tenant SaaS data model patterns (membership table, invitations): https://www.checklyhq.com/blog/building-a-multi-tenant-saas-data-model/ — MEDIUM confidence
- CVE-2025-29927 middleware bypass (auth at data access layer): https://workos.com/blog/nextjs-app-router-authentication-guide-2026 — HIGH confidence
- better-sse for channel-based SSE broadcast (multi-client pattern): https://www.npmjs.com/package/better-sse — MEDIUM confidence (library exists; in-process Map approach preferred for simplicity)
