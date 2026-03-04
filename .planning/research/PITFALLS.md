# Domain Pitfalls

**Domain:** Team standup app — WorkOS AuthKit migration, multi-tenancy, server-side token storage, live standup mode
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH (WorkOS-specific items verified against official docs and GitHub issues; real-time pitfalls from multiple sources)

---

## Critical Pitfalls

Mistakes that cause data leaks, rewrites, or user lockouts.

---

### Pitfall 1: Existing Users Locked Out During Auth Migration

**What goes wrong:**
Better Auth and WorkOS use different user ID formats and session formats. Better Auth session cookies (`better-auth` JWT) are unreadable by WorkOS middleware. All existing encrypted localStorage tokens use Better Auth's `userId` as the PBKDF2 key derivation input. When WorkOS issues a new user ID (`user_01KBT...`), the decryption key changes and every stored token becomes permanently unreadable — silently, with no error surfaced to users.

**Why it happens:**
The current `user-tokens.ts` encryption uses `userId` as the PBKDF2 salt input. The salt is hardcoded (`"tambo-standup-token-salt"`) and tied to Better Auth's user ID. WorkOS generates its own user IDs that do not match Better Auth IDs. There is no migration path in the current code.

**Consequences:**
- Every existing user's GitHub token and Linear API key silently becomes unreadable
- Users encounter empty tool responses with no explanation
- If this isn't handled before launch, users must manually re-enter tokens (acceptable only if WorkOS Pipes completely replaces token entry — which it should for the new flow)

**Prevention:**
This migration is actually a forcing function: the migration to WorkOS Pipes eliminates localStorage token storage entirely. The correct approach is:
1. On first post-migration login, detect stale localStorage keys by format (`user-github-token::` prefix with old ID) and clear them, showing a one-time prompt to re-connect via WorkOS Pipes
2. Do NOT attempt to migrate encrypted values — just clear and re-onboard
3. Ship the WorkOS Pipes connection flow before or simultaneously with the auth migration, never after

**Warning signs:**
- Any code path that reads `user-github-token::${userId}` or `user-linear-api-key::${userId}` from localStorage after migration
- `withGitHubToken()` or `withLinearClient()` returning 401 for all users immediately post-launch

**Phase:** Auth migration phase (must be addressed before shipping)

---

### Pitfall 2: Middleware Only Handles Authentication, Not Authorization

**What goes wrong:**
`authkitMiddleware` verifies that a session cookie exists and is valid — it does NOT verify that the authenticated user has access to the specific team or resource being requested. Without explicit organization/team scoping in each API route, any authenticated user can call `/api/linear/team?teamId=X` with another team's ID and receive data.

**Why it happens:**
This is the exact pattern the project currently uses: API routes accept parameters from the request, validate only that a session exists, and pass those parameters straight to Linear/GitHub. Adding WorkOS auth doesn't change this pattern — it only upgrades the session check.

CVE-2025-29927 (patched in Next.js 14.2.25/15.2.3) demonstrated that middleware-only auth is not sufficient; defense-in-depth requires checking authorization at the data layer. This project's current architecture mirrors the vulnerable pattern.

**Consequences:**
- Horizontal privilege escalation: authenticated user from Team A can query Team B's Linear/GitHub data
- Particularly dangerous for the "read across team members" feature if orgId is not validated

**Prevention:**
Every API route that accepts a `teamId`, `orgId`, or member-related parameter must:
1. Extract the authenticated user's WorkOS user ID from the session (via `withAuth()` in server component or route handler)
2. Query the local database to verify the user is a member of the requested team
3. Reject with 403 if the membership check fails
Never trust client-supplied team/org IDs without server-side membership verification.

**Warning signs:**
- API routes that accept `?teamId=` or `?orgId=` without a corresponding `SELECT * FROM memberships WHERE user_id = $1 AND team_id = $2` check
- Middleware configured to protect routes but no authorization check inside the route handler

**Phase:** Multi-tenancy phase and auth migration phase (must be in place before any team data endpoints are live)

---

### Pitfall 3: Missing `tenant_id` Filter on Database Queries

**What goes wrong:**
When extending the existing Turso/Kysely schema to add teams, memberships, and WorkOS connection references, any query that omits a `team_id` or `org_id` filter exposes all tenants' data. A single missing `WHERE team_id = ?` clause becomes a cross-tenant data leak.

**Why it happens:**
Single-user apps have no tenant context. When the schema is extended incrementally — adding `team_id` columns to existing tables — it's easy to miss adding the filter in existing queries. Kysely does not enforce tenant scoping; it is purely structural.

**Consequences:**
- AI aggregation queries (e.g., "what is the team working on") accidentally return data from all teams in the database
- WorkOS connection tokens for all users (not just team members) are returned when listing connected accounts

**Prevention:**
1. Add `team_id` as a non-nullable column at schema creation, not as an afterthought
2. Create a typed `withTeamContext(db, teamId)` wrapper that always injects `.where('team_id', '=', teamId)` for multi-tenant tables — make it structurally impossible to query without tenant context
3. Never use `SELECT *` across multi-tenant tables in application code; always go through the wrapper
4. Write explicit tests that verify cross-team queries return empty (not data)

**Warning signs:**
- Kysely queries on `connections`, `threads`, or `memberships` tables without a `team_id` or `user_id` filter
- AI tool functions that call `/api/linear/team` without forwarding the team context from session

**Phase:** Multi-tenancy schema design (Phase 1 of team features — hardest to retrofit later)

---

### Pitfall 4: WorkOS Pipes Token Fetch Called From Client Side

**What goes wrong:**
WorkOS Pipes connection tokens must only be retrieved from the backend. The access token endpoint is authenticated with your WorkOS API key (a server secret). Calling `getAccessToken()` from a Next.js client component or exposing it through a public API route without session verification would expose GitHub/Linear tokens to any caller.

**Why it happens:**
The current architecture passes tokens via client-readable headers (`x-linear-api-key`, `x-github-token`). Developers may replicate this pattern when migrating to Pipes — keeping the header-passing approach but now fetching from WorkOS first, then re-exposing the token in a response.

**Consequences:**
- OAuth tokens for all connected users are accessible without membership verification
- Violates the "write operations use only the requesting user's connection" requirement

**Prevention:**
1. Token retrieval via WorkOS Pipes must happen inside a Server Action or a protected API route that first validates session + team membership
2. The token must NEVER appear in an HTTP response body or client-side accessible state — it should be used server-side to make the downstream API call and only the result returned
3. Remove all `x-linear-api-key` and `x-github-token` header patterns from client-side code during migration

**Warning signs:**
- Any React component importing or calling a WorkOS Pipes token fetch function
- API routes that return a `{ token: "..." }` response
- Client-side code that reads a token from a response and stores it (even temporarily)

**Phase:** Auth migration phase + API route refactor

---

## Moderate Pitfalls

---

### Pitfall 5: Refresh Token Race Condition with Concurrent Requests

**What goes wrong:**
When multiple API calls fire simultaneously (e.g., several Tambo tool invocations in parallel during an AI response), they may all attempt to refresh an expired WorkOS session at the same time. Only the first succeeds; subsequent callers receive "refresh token already exchanged" errors, causing infinite redirect loops or authentication failures.

**Why it happens:**
WorkOS refresh token rotation invalidates a token on use. The `authkit-nextjs` SDK handles refresh automatically in middleware, but concurrent requests can race to use the same refresh token before it's rotated. This is a known filed issue (authkit-nextjs issue #28). WorkOS added a grace period server-side, but concurrent parallel requests can still exceed it.

**Consequences:**
- During live standup mode (multiple users + multiple AI tool calls), random auth failures mid-session
- Development Fast Refresh triggers spurious refresh races

**Prevention:**
1. In middleware, ensure `authkitMiddleware` runs once per request path, not for API sub-requests
2. Exclude `/api/*` routes from triggering middleware refresh where possible (verify user in route handler instead)
3. Implement retry logic with exponential backoff on 401 responses in the Tambo `apiFetch` wrapper
4. Test with concurrent tool invocations before launch

**Warning signs:**
- Console errors containing "refresh token already exchanged"
- Intermittent 401s that resolve on page reload
- Auth failures specifically during multi-tool AI responses

**Phase:** Auth migration phase (verify during integration testing)

---

### Pitfall 6: Custom Middleware Overrides WorkOS Auth Response

**What goes wrong:**
If the existing `src/middleware.ts` (currently using `better-auth/cookies`) is extended with custom logic (rewrites, header injection, org-routing) while also calling `authkitMiddleware`, the response ordering matters. Custom middleware that returns a `NextResponse` before `authkitMiddleware` completes will silently swallow the auth redirect, leaving protected routes accessible.

**Why it happens:**
`authkitMiddleware` must be called last in the middleware chain and its response returned. Wrapping it in `try/catch` causes `NEXT_REDIRECT` to throw (Next.js redirects must not be caught). Developers commonly put custom logic after the auth call without returning the auth response.

**Consequences:**
- Routes appear accessible when they should redirect to login
- Subtle: does not error, just fails silently

**Prevention:**
Structure middleware as:
```typescript
export default async function middleware(request: NextRequest) {
  // custom logic that does NOT return a response
  // e.g., add headers, log, detect locale

  // authkitMiddleware must be last and its response returned
  return authkitMiddleware()(request);
}
```
Never wrap the authkit call in try/catch. Never return a response before it unless it's an early exit (e.g., static asset bypass).

**Warning signs:**
- Middleware file has `try { return authkitMiddleware()(...) } catch (e) { ... }` pattern
- Protected routes accessible without a session cookie in development

**Phase:** Auth migration phase

---

### Pitfall 7: WorkOS Organization vs. App-Level Team — Conflating Two Models

**What goes wrong:**
WorkOS has a native "Organization" concept with membership management. If the app uses WorkOS Organizations as the team model, it inherits WorkOS's user management UI and SSO/SCIM machinery — which is overkill for a simple standup team. But if the app builds a parallel team model entirely in Turso without referencing WorkOS Organizations, WorkOS Pipes connections may not be scoped correctly per team, and the app loses the ability to use WorkOS's organization membership APIs.

**Why it happens:**
The WorkOS docs show organizations primarily as enterprise SSO containers. Developers either over-adopt (making every standup "team" a WorkOS Organization with domain verification) or under-adopt (ignoring WorkOS's org model and building a fully custom team table that doesn't reference WorkOS at all).

**Consequences:**
- Over-adoption: every team creation triggers WorkOS org provisioning flows; invite links become SSO onboarding flows — too complex
- Under-adoption: team membership and WorkOS user data go out of sync; invite flows must be built entirely from scratch with no WorkOS support

**Prevention:**
The right model for this app is a hybrid:
- Store teams in Turso with a `workos_org_id` reference (create a WorkOS Org per team for Pipes scoping, but don't expose its SSO features)
- Use WorkOS membership APIs only for the Pipes connection scoping
- Build invite links and email invitations as app-level features against Turso membership tables
- Keep team management UI entirely in-app, not delegated to WorkOS's admin portal

**Warning signs:**
- Creating WorkOS Organizations for every standup team signup
- Invite link flows that require a WorkOS admin accepting the invite

**Phase:** Multi-tenancy design (architectural decision must be made before building team creation)

---

### Pitfall 8: Read-Across-Members Feature Exposes One Member's Token to Another's Request Context

**What goes wrong:**
The "AI can answer what the team is working on by aggregating across members' connections" feature requires the server to use multiple users' WorkOS Pipes tokens in a single request. If this aggregation is implemented carelessly, one team member's GitHub token could be used to make API calls that are attributed to or readable by a different member's session.

**Why it happens:**
The aggregation function must iterate over team members, fetch each member's Pipes token, and call Linear/GitHub. The pitfall is running this in a context that has no audit trail, or worse, accidentally returning raw token data alongside results.

**Consequences:**
- Privacy violation: member A can see member B's exact token (even if indirectly via an API call it enables)
- Write operations accidentally use the wrong member's token (e.g., creating an issue as member B while logged in as member A)

**Prevention:**
1. The aggregation function must be server-only, never client-callable
2. Each Pipes token must be fetched immediately before use and discarded after — never stored in a shared variable
3. Write operations must ALWAYS use only the session-authenticated user's Pipes connection — never iterate to find "a token that works"
4. Add a server-side `connectionUserId` audit log field to every write API call

**Warning signs:**
- A single server function that holds multiple users' tokens in memory simultaneously and passes them to a client response
- Write operation handlers that accept a `userId` parameter from the client

**Phase:** Multi-tenancy + aggregation feature phase

---

### Pitfall 9: Live Standup Session State Race Condition

**What goes wrong:**
During a live standup, multiple team members connect to the same session. The AI is actively generating a response. A second user sends a new message, or a user assumes "input control" while the AI is mid-stream. Without explicit state management, two concurrent writes arrive at the Tambo thread, producing interleaved or duplicated AI responses, or the floor-control lock is acquired before the previous response completes.

**Why it happens:**
WebSocket/SSE connections don't inherently serialize writes. The window between "initial fetch of session state" and "WebSocket connection established" is a race: events that arrive during that window are missed. This is documented as the "join during connection gap" problem.

**Consequences:**
- Duplicate AI responses in the shared view
- Input control indicator shows wrong user as driver
- Team members see different states briefly (split-brain view)

**Prevention:**
1. Maintain a single server-side session state (who has the floor, current AI generation status) in a short-lived store (Redis, or a simple DB row with a `locked_by` and `locked_at` field)
2. Use an event log approach: new participants replay events since their connection epoch to catch up, not just fetch current state
3. Implement optimistic UI with server-confirm: floor request is pending until server ACKs
4. Disable the "send" input while `ai_generating = true` in the shared session state

**Warning signs:**
- Session state stored only in React component state on one user's client
- No server-side "AI is currently generating" flag in the standup session record
- Floor control implemented as a client-side lock with no server enforcement

**Phase:** Live standup mode phase

---

### Pitfall 10: Vercel Serverless Functions Cannot Hold Long-Lived WebSocket Connections

**What goes wrong:**
If the live standup mode is implemented using WebSockets or long-lived SSE within Next.js API routes on Vercel, they will fail in production. Vercel's serverless functions time out after 10-25 seconds. The Edge runtime can hold longer connections but cannot maintain shared state between concurrent connections (no global variables, no singletons across invocations).

**Why it happens:**
Next.js API routes work perfectly with WebSockets in local development (Node.js server). The behavior changes silently in Vercel's serverless deployment. Many developers discover this only after deploying to production.

**Consequences:**
- Live standup sessions disconnect every 10-25 seconds
- Multiple users cannot share session state at all (each request is isolated)

**Prevention:**
Pick a real-time transport strategy before building the feature:
- **Option A (recommended for simplicity):** Use a managed real-time service (Ably, Pusher Channels, or PartyKit) for the standup session pub/sub. Next.js routes only read/write session metadata to the DB; the real-time layer is fully external.
- **Option B:** Deploy a separate WebSocket service on Railway or Render alongside the Next.js app on Vercel
- **Option C:** Use polling with short intervals (5s) for standup sessions — acceptable for a low-frequency use case

Do not attempt to implement persistent WebSocket state inside Next.js API routes on Vercel.

**Warning signs:**
- WebSocket server code inside `src/app/api/` routes
- Long-lived SSE connections that store `clientId -> WritableStream` in a module-level Map

**Phase:** Live standup mode phase (architectural decision must be made before any implementation)

---

## Minor Pitfalls

---

### Pitfall 11: Middleware Matcher Accidentally Intercepts Static Assets

**What goes wrong:**
A catch-all middleware matcher like `matcher: ['/(.*)', '/api/(.*)']` causes `authkitMiddleware` to run on every static file request (`/_next/static/`, `/_next/image`, `/favicon.ico`). This breaks CSS loading, causes redirect loops on fonts, and significantly slows down cold starts.

**Prevention:**
Use the WorkOS-recommended matcher pattern that explicitly excludes static files:
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```
Test that Tailwind CSS classes load correctly after configuring the matcher.

**Phase:** Auth migration phase

---

### Pitfall 12: Better Auth Database Tables Left in Place Post-Migration

**What goes wrong:**
Better Auth creates its own session, account, and user tables in Turso. After migrating to WorkOS, these tables remain. If any code still reads from them (e.g., old session-checking logic), users appear logged in via stale Better Auth sessions while WorkOS considers them unauthenticated — causing inconsistent behavior.

**Prevention:**
1. Delete or rename Better Auth tables as part of the migration schema change (after verifying no code references them)
2. Search for all imports of `better-auth` and `better-auth/cookies` and remove them
3. Drop environment variables `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` after confirming WorkOS handles all auth

**Warning signs:**
- Import of `better-auth` remaining in `src/middleware.ts` or any API route
- Users able to access protected routes with old session cookies after WorkOS migration

**Phase:** Auth migration phase (cleanup step)

---

### Pitfall 13: Invite Link Tokens Are Guessable or Reusable

**What goes wrong:**
If invite links are implemented as `/invite?teamId=abc` (predictable) or with a short token that doesn't expire, any person with the link can join any team indefinitely, or attackers can enumerate team IDs to join arbitrary teams.

**Prevention:**
1. Generate invite tokens as cryptographically random 32-byte hex strings (not sequential IDs or UUIDs)
2. Expire invite tokens after 48-72 hours or after first use (configurable by team owner)
3. Store invite tokens server-side in Turso; validate against DB on accept
4. Rate-limit invite link acceptance (3-5 attempts per IP per hour)

**Phase:** Team management phase

---

### Pitfall 14: Cache Keys Don't Include Team Context

**What goes wrong:**
The existing HTTP cache headers on Linear/GitHub routes (e.g., `Cache-Control: private, max-age=300`) use route-level caching. In a multi-tenant app, if server-level caching (Redis, CDN) is added later without team-scoped cache keys, response data for Team A could be returned to Team B.

**Prevention:**
Cache keys must always include the user/team context:
```
cache_key = `${route}:${userId}:${teamId}:${queryParams}`
```
The existing `private` cache directive prevents CDN caching, so this is low risk now — but document the requirement for any future caching layer additions.

**Phase:** Performance optimization (future), but note the requirement now during multi-tenancy design

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| WorkOS AuthKit swap | Existing localStorage tokens become unreadable | Clear stale tokens, ship Pipes simultaneously |
| WorkOS middleware config | Static assets intercepted, CSS breaks | Explicit exclusion matcher |
| Middleware + custom logic | Auth response overwritten silently | authkitMiddleware called last, no try/catch |
| Refresh token concurrency | Parallel Tambo tool calls cause race | Retry on 401, exclude API routes from middleware refresh |
| Team schema design | Missing `team_id` WHERE clauses | Typed `withTeamContext` query wrapper |
| WorkOS Org vs app team | Over-engineering or under-connecting | Hybrid: Turso team + WorkOS Org ID reference |
| WorkOS Pipes token use | Token exposed client-side or used for wrong user | Server-only, per-request fetch, never in response |
| Read-across aggregation | Cross-user token context confusion | Tokens fetched inline, discarded immediately, never shared |
| Live standup sessions | WebSocket not supported on Vercel serverless | External real-time service (Ably/Pusher/PartyKit) |
| Live standup input control | Race condition on floor grab + AI generation | Server-side lock, event log for catch-up |
| Invite links | Guessable or non-expiring tokens | Random tokens, expiry, server-side validation |
| Next.js version | CVE-2025-29927 middleware bypass | Verify Next.js >= 15.2.3 before shipping auth migration |

---

## Sources

- [WorkOS authkit-nextjs GitHub — Middleware composition issue #47](https://github.com/workos/authkit-nextjs/issues/47)
- [WorkOS authkit-nextjs GitHub — Refresh token race condition issue #28](https://github.com/workos/authkit-nextjs/issues/28)
- [WorkOS — Auth in middleware pitfalls](https://workos.com/blog/auth-in-middleware-or-how-i-learned-to-stop-worrying-and-love-the-edge)
- [WorkOS — Migrate from Better Auth](https://workos.com/docs/migrate/better-auth)
- [WorkOS — Pipes documentation](https://workos.com/docs/pipes)
- [WorkOS — Modeling your app (Organizations)](https://workos.com/docs/authkit/modeling-your-app)
- [CVE-2025-29927 Next.js middleware bypass — Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)
- [CVE-2025-29927 technical analysis — ProjectDiscovery](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Tenant isolation in multi-tenant systems — WorkOS](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems)
- [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
- [Tenant data isolation patterns and anti-patterns — Propelius](https://propelius.ai/blogs/tenant-data-isolation-patterns-and-anti-patterns)
- [SSE on Vercel limitations — GitHub Discussion #48427](https://github.com/vercel/next.js/discussions/48427)
- [Real-time collaboration race conditions — DEV Community](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8)
- [PartyKit + Next.js + AI example](https://docs.partykit.io/examples/app-examples/chat-app-with-ai-and-auth/)
- [WorkOS multi-tenant developer guide](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)
