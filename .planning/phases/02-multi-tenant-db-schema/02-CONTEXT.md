# Phase 2: Multi-Tenant DB Schema - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend Turso with users, teams, memberships, connections, and invite_links tables. All multi-tenant queries scoped by team_id so no data leaks across teams. Auth callback upserts a user row on first login. This phase creates the schema and DB access layer — no UI beyond what's needed to verify the schema works.

</domain>

<decisions>
## Implementation Decisions

### Table Design
- Users can belong to multiple teams (full multi-tenant from day one)
- Two membership roles only: owner and member (no admin tier for v1)
- Teams table includes an `is_personal` boolean flag to distinguish personal workspaces
- Include a connections table now (user_id, provider, workos_connection_id, status) — Phase 3 fills it in
- Include an invite_links table for shareable invite links (custom tokens, not WorkOS-managed)
- No local invitations table for email invites — WorkOS Invitations API is the source of truth
- Use versioned migration files (numbered SQL), not a single schema script

### User Upsert on Login
- Middleware-based upsert: check/create user record on every authenticated request
- Staleness check: only write to DB if last_synced_at is older than N minutes (avoid unnecessary writes)
- Auto-create a personal team on first login, named "{User's Name}'s Workspace"
- Personal team is visible in the team switcher alongside real teams
- Self-healing: if user exists but personal team is missing, middleware recreates it
- Auto-sync: when WorkOS profile changes (name, avatar), update both user record and personal team name

### Tenant Isolation
- Two separate Kysely exports: `db` (global tables: users) and `teamDb(teamId)` (scoped tables: memberships, connections, invite_links)
- `teamDb(teamId)` structurally enforces WHERE team_id = ? on every query — cannot query scoped tables without it
- Team context passed via cookie — set when user switches teams, read by API routes and server components
- Team picker screen shown on login when user has multiple teams and no cookie set
- If user has only one team (personal), auto-select it without showing picker

### Invite Links
- Custom token-based shareable invite links stored in local invite_links table
- Configurable: max_uses field lets owner choose single-use or reusable
- Default 7-day expiration; owner can set custom expiration or "never expires"
- Any team member can create invite links
- Owner can revoke any link; members can only revoke their own
- Email invitations handled entirely by WorkOS Invitations API (no local state)

### Claude's Discretion
- Team identifier approach (slug vs UUID vs both) for URLs and DB primary keys
- User profile fields to cache locally (email, name, avatar, timestamps — balance between completeness and simplicity)
- Active team selection strategy (last-used vs URL-based vs cookie-only)
- Soft deletes vs hard deletes for teams and memberships
- Cookie configuration (HttpOnly vs client-accessible, validation frequency)
- Which tables require withTeamContext scoping vs direct query
- Invite link usage tracking approach (count-only vs full join log)
- Middleware org membership sync (user-only vs user+org in Phase 2 scope)

</decisions>

<specifics>
## Specific Ideas

- Personal team named "{Name}'s Workspace" (e.g., "Avi's Workspace") — not generic "Personal"
- Team picker feels like a workspace switcher, not a login gate — only shown when there's a real choice to make
- The `teamDb(teamId)` pattern should make it impossible at the type level to accidentally query team-scoped data without providing a team_id

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@libsql/kysely-libsql` and `kysely` packages already installed in package.json
- `scripts/drop-better-auth-tables.ts`: Shows the Kysely + LibsqlDialect connection pattern (Turso URL + auth token from env)
- `next.config.ts`: Already externalizes `@libsql/client`, `@libsql/kysely-libsql`, `libsql` for server-side use

### Established Patterns
- Server-component-first architecture: user data fetched server-side, passed as props to client components (Phase 1 pattern)
- Middleware already handles auth via `authkitMiddleware` — will be extended to handle user upsert and team cookie validation
- API routes use request headers for context (`x-linear-api-key`, `x-github-token`) — team context via cookie follows this pattern
- `src/lib/auth-actions.ts`: Server actions pattern for auth operations (signOut) — can extend for team switching

### Integration Points
- `src/middleware.ts` — Extend to add user upsert logic and team cookie validation after WorkOS auth check
- `src/app/api/auth/callback/route.ts` — Currently just `handleAuth`. May need post-auth hook for initial user creation
- `src/app/app/page.tsx` — Server component that fetches user; will also need to resolve active team
- New: `src/lib/db.ts` — Central DB module exporting `db` (global) and `teamDb(teamId)` (scoped)
- New: `src/lib/schema.ts` — Kysely type definitions for all tables
- New: `migrations/` directory — Numbered SQL migration files

</code_context>

<deferred>
## Deferred Ideas

- Team switcher UI — Phase 4 (Team Formation)
- Team picker screen on login — Phase 4 (Team Formation)
- WorkOS Organization creation/sync — Phase 4 (Team Formation)
- Connection status tracking UI — Phase 3 (WorkOS Pipes)

</deferred>

---

*Phase: 02-multi-tenant-db-schema*
*Context gathered: 2026-03-03*
