# Technology Stack: WorkOS Auth + Teams + Live Standup

**Project:** The Standup App — Milestone 2
**Researched:** 2026-03-03
**Scope:** New libraries only — does not re-document existing Next.js 15, Tambo AI, Turso, Kysely, Tailwind, etc.

---

## New Dependencies

### WorkOS Auth Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@workos-inc/authkit-nextjs` | 2.15.0 | AuthKit session management, middleware, server helpers | Official Next.js SDK. Provides `authkitMiddleware`, `withAuth()`, `getSession()`, `handleAuth()`. Confirmed compatible with Next.js 15 (peer dep `^15.2.3`). |
| `@workos-inc/node` | 8.8.0 | Server-side WorkOS API calls: orgs, memberships, invitations, Pipes token retrieval | Single SDK for all WorkOS API calls. `workos.pipes.getAccessToken()`, `workos.userManagement.sendInvitation()`, `workos.organizations.*` all live here. |
| `@workos-inc/widgets` | 1.9.0 | Pipes widget React component — drop-in UI for users to connect GitHub/Linear | Pre-built `<Pipes />` component handles the OAuth consent UI. Eliminates building a custom OAuth connect screen. |

**Confidence: HIGH** — Versions verified via npm registry. Peer dependencies confirmed. Official docs consulted.

### Real-Time Live Standup

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `partykit` | 0.0.115 | Server-side room host for standup sessions | Lightweight, Cloudflare Workers-based. Each standup session is a "room" with a stable ID. Handles WebSocket connection routing, broadcasting, and per-room state natively. No infrastructure to manage. |
| `partysocket` | 1.1.16 | Client-side WebSocket hook (`usePartySocket`) | Companion to `partykit`. Provides React-friendly `usePartySocket` hook with automatic reconnection. Tiny and focused. |

**Confidence: MEDIUM** — PartyKit is established (Sequoia-backed, Cloudflare Workers). Versions verified via npm. Pattern is sound for the use case but production deployment (requires Cloudflare Workers or self-host) adds an operational dependency not currently present.

---

## Why These Specific Choices (Not Alternatives)

### WorkOS AuthKit over keeping Better Auth

Better Auth is already installed and working. The migration is required by the project constraints — WorkOS AuthKit is the mandated auth provider. The `@workos-inc/authkit-nextjs` SDK provides the identical session surface (`getSession()`, middleware cookie handling) so the migration is largely a configuration swap rather than an architectural change.

**Do not use:** `next-auth` / `auth.js` with a WorkOS adapter — the project already has `@workos-inc/authkit-nextjs` as the explicit mandate, and the separate adapter layer adds unnecessary indirection.

### WorkOS Pipes over building OAuth flows manually

Pipes handles token storage, refresh, and the OAuth consent dance for both GitHub and Linear. The alternative (manual OAuth implementation) requires a callback route, token encryption, refresh cron job, and provider-specific edge cases. WorkOS has an official tutorial demonstrating Linear as a supported provider (`workos.pipes.getAccessToken({ provider: 'linear', ... })`).

**Do not use:** Storing OAuth tokens in your own database with manual refresh logic — this is exactly what Pipes eliminates. The current localStorage approach is already being replaced, and Pipes is the correct server-side replacement.

**Verify before building:** Linear is listed as a supported Pipes provider in official WorkOS blog content and the `getAccessToken` API accepts `provider: 'linear'`. However, the Pipes provider list in the public docs is incomplete and the changelog only called out 9 providers by name (not including Linear). **Confirm Linear appears in your WorkOS dashboard's Pipes configuration before assuming it works.** If Linear is absent, fallback plan is manual OAuth with server-side encrypted token storage in Turso.

### PartyKit over Liveblocks, Ably, or SSE

| Option | Verdict | Reason |
|--------|---------|--------|
| **PartyKit** | Use | Minimal API surface. Room-per-standup-session model maps directly to the use case. No CRDT overhead — standup mode is chat-like broadcast, not collaborative editing. Deploy co-located with app on Vercel + Cloudflare Workers. |
| Liveblocks | Skip | Optimized for document collaboration (CRDT, presence cursors, conflict resolution). The standup use case is simpler: broadcast AI conversation state + cursor control token. Liveblocks pricing and complexity are disproportionate. |
| Ably | Skip | Excellent infrastructure, but requires building all React presence/UI components from scratch. More effort than PartyKit for the same outcome. Overkill for a single-room broadcast scenario. |
| Server-Sent Events (SSE) | Skip | Unidirectional (server-to-client only). Cannot handle "who is driving" input control which requires bidirectional client messages. |

---

## Architecture: How These Pieces Fit Together

### Auth Flow (replacing Better Auth)

```
User visits app
  → authkitMiddleware() in middleware.ts checks wos-session cookie
  → No session → redirect to WorkOS AuthKit hosted UI
  → User signs in (Google, email, etc.)
  → WorkOS redirects to /auth/callback
  → handleAuth() in /app/auth/callback/route.ts stores encrypted session cookie
  → Subsequent requests: getSession() / withAuth() decode cookie server-side
```

**Environment variables to add (replacing Better Auth vars):**

```
WORKOS_CLIENT_ID        # from WorkOS dashboard
WORKOS_API_KEY          # sk_live_... from WorkOS dashboard
WORKOS_COOKIE_PASSWORD  # min 32 chars, generate: openssl rand -base64 24
NEXT_PUBLIC_WORKOS_REDIRECT_URI  # e.g. https://app.example.com/auth/callback
```

**Environment variables to remove:**

```
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### Team/Workspace Layer (WorkOS Organizations + Turso)

WorkOS Organizations are the canonical source for team identity and membership. Your Turso database stores app-specific team metadata alongside WorkOS org IDs.

**Schema additions needed in Turso (Kysely migrations):**

```sql
-- Teams table: maps WorkOS org IDs to app-level team config
CREATE TABLE teams (
  id TEXT PRIMARY KEY,                    -- your internal UUID
  workos_organization_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  github_org TEXT,                        -- optional GitHub org scope
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Users table: maps WorkOS user IDs to local profile + team membership
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- your internal UUID
  workos_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  team_id TEXT REFERENCES teams(id),
  role TEXT NOT NULL DEFAULT 'member',   -- 'owner' | 'member'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Invite links: for join-via-link flow (WorkOS handles email invites natively)
CREATE TABLE invite_tokens (
  token TEXT PRIMARY KEY,                 -- random UUID
  team_id TEXT NOT NULL REFERENCES teams(id),
  created_by_user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER                         -- NULL = still valid
);
```

**WorkOS org operations (via `@workos-inc/node`):**

- `workos.organizations.createOrganization({ name })` — create org when user creates team
- `workos.userManagement.createOrganizationMembership({ userId, organizationId, roleSlug })` — add member
- `workos.userManagement.sendInvitation({ email, organizationId })` — WorkOS handles invite email
- `workos.userManagement.listOrganizationMemberships({ organizationId })` — list team members

**Do not** use Turso's database-per-tenant feature. This project has one shared database at the current scale, and adding per-team databases adds operational overhead with no benefit for team sizes of 3-20 people.

### Pipes Integration (GitHub + Linear OAuth)

```
User on /settings/connections
  → Server calls workos.widgets.getToken({ userId, organizationId }) → returns auth token
  → Client renders <Pipes authToken={token} /> from @workos-inc/widgets
  → User clicks "Connect GitHub" or "Connect Linear" in widget
  → Widget handles OAuth consent redirect internally
  → On subsequent API calls: server calls workos.pipes.getAccessToken({ provider, userId, organizationId })
  → Use returned accessToken to call GitHub API / Linear SDK
```

**Remove:** `x-linear-api-key` and `x-github-token` request headers. Replace with server-side Pipes token lookup keyed on the authenticated user's WorkOS user ID.

**Connection scope:** Store at the user level (`userId`), not team level. The multi-tenant aggregation for read operations happens by iterating team members' user IDs and fetching each member's Pipes token.

### Live Standup Layer (PartyKit)

```
Team owner starts standup → creates standup session record in Turso (id, team_id, started_at)
  → All team members join via usePartySocket(room: sessionId)
  → PartyKit server (partykit/server.ts) broadcasts:
      - Active AI conversation state (message list)
      - "Driver" token (which user ID currently controls input)
  → Non-driver clients: read-only view of AI conversation
  → Driver client: full Tambo AI input active
  → Driver can "pass control" → broadcast new driver user ID to room
  → Session ends → PartyKit room closes, Turso session record updated with ended_at
```

**PartyKit deployment:** Add `partykit.json` config, deploy to `partykit.dev` subdomain (Cloudflare Workers). This is a separate deploy from the Next.js app but shares the same codebase repo.

**Do not** attempt to route standup WebSockets through Next.js API routes — Next.js does not support persistent WebSocket connections in the App Router without third-party adapters.

---

## Complete Dependency Additions

```bash
# WorkOS auth + API
npm install @workos-inc/authkit-nextjs @workos-inc/node @workos-inc/widgets

# Live standup
npm install partykit partysocket
```

## Complete Dependency Removals

```bash
npm uninstall better-auth
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| `@workos-inc/authkit-nextjs` setup | HIGH | Official docs, version confirmed, Next.js 15 peer dep confirmed |
| `@workos-inc/node` Pipes API | HIGH | Official blog tutorial confirms `workos.pipes.getAccessToken({ provider: 'linear', ... })` |
| Linear as Pipes provider | MEDIUM | Official blog content confirms Linear is supported; changelog did not explicitly list it. Verify in WorkOS dashboard before committing to this path. |
| WorkOS Organizations + invitations | HIGH | Docs confirm full SDK surface: createOrganization, sendInvitation, createOrganizationMembership |
| PartyKit for live standup | MEDIUM | Well-documented, production-ready. Cloudflare Workers deployment adds a new deploy target not currently in the project. Pattern is correct for the use case. |
| Turso schema additions | HIGH | Standard row-level multi-tenant SQLite pattern; Kysely libSQL dialect already confirmed working in codebase |

---

## Sources

- [WorkOS AuthKit Next.js Docs](https://workos.com/docs/authkit/nextjs)
- [WorkOS AuthKit Next.js SDK](https://workos.com/docs/sdks/authkit-nextjs)
- [workos/authkit-nextjs GitHub README](https://github.com/workos/authkit-nextjs/blob/main/README.md)
- [WorkOS Pipes Docs](https://workos.com/docs/pipes)
- [WorkOS Pipes Widget Docs](https://workos.com/docs/widgets/pipes)
- [Fetch Linear Data with WorkOS Pipes (official tutorial)](https://workos.com/blog/fetch-data-from-linear-with-pipes-tutorial)
- [Nine New Providers in WorkOS Pipes (changelog)](https://workos.com/changelog/nine-new-providers-in-workos-pipes)
- [WorkOS Organizations + Users Docs](https://workos.com/docs/user-management/users-organizations)
- [WorkOS Invitations Docs](https://workos.com/docs/user-management/invitations)
- [Model your B2B SaaS with WorkOS Organizations](https://workos.com/blog/model-your-b2b-saas-with-organizations)
- [PartyKit Docs](https://docs.partykit.io/)
- [PartyKit + Next.js Tutorial](https://docs.partykit.io/tutorials/add-partykit-to-a-nextjs-app/)
- [Ably: Best Realtime Collaboration SDKs comparison](https://ably.com/blog/best-realtime-collaboration-sdks)
