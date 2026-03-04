# Project Research Summary

**Project:** The Standup App — Milestone 2 (WorkOS Auth + Teams + Live Standup)
**Domain:** Multi-tenant AI standup tool with managed auth, server-side OAuth connections, and live shared sessions
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH

## Executive Summary

This milestone transforms the existing single-user Tambo AI standup app into a multi-tenant team product. The migration involves three parallel structural changes: replacing Better Auth with WorkOS AuthKit for session management, replacing localStorage-based OAuth token storage with WorkOS Pipes for server-side token management, and adding a multi-tenant data model with live shared standup sessions. Each change has a strict dependency on the previous: WorkOS AuthKit must be fully operational before Pipes can be configured, the multi-tenant schema must exist before team management features can be built, and live standup depends on all of the above.

The recommended approach is a clean-break migration rather than a compatibility shim. WorkOS AuthKit and WorkOS Pipes together eliminate two of the largest infrastructure concerns in the current design (custom auth and manual OAuth token handling). The decision to use SSE over WebSockets for live standup sessions is the key architectural constraint — Next.js App Router Route Handlers support SSE via ReadableStream but cannot hold persistent WebSocket connections in serverless deployment. For v1 with single-server deployments, an in-process SSE store is sufficient. If Vercel multi-instance deployment is needed immediately, an external real-time service (PartyKit or Ably) should be used instead.

The critical risk in this milestone is a silent data loss on auth migration: existing users' encrypted localStorage tokens use Better Auth user IDs as key derivation inputs and will become permanently unreadable when WorkOS issues new user IDs. The correct mitigation is to ship WorkOS Pipes as the replacement simultaneously with the auth migration — not after — and to clear stale localStorage entries on first post-migration login. Do not attempt to decrypt and re-encrypt existing tokens; force re-connection via the Pipes widget.

## Key Findings

### Recommended Stack

The new dependencies are minimal and purposeful. WorkOS provides three packages covering the full auth and OAuth surface: `@workos-inc/authkit-nextjs` (session management and middleware), `@workos-inc/node` (server-side API calls to orgs, memberships, and Pipes), and `@workos-inc/widgets` (the drop-in Pipes OAuth connection widget). All three have confirmed Next.js 15 compatibility. `better-auth` is removed entirely.

For live standup real-time sync, the research evaluated PartyKit, Liveblocks, Ably, and SSE. SSE inside Next.js Route Handlers (via `ReadableStream`) is the recommended approach for v1 because it avoids a separate deployment target and is sufficient for small-team standup use. If Vercel multi-instance deployment is required, PartyKit (deployed to Cloudflare Workers) is the cleanest external real-time option — it maps a standup session directly to a "room" with stable broadcast semantics.

**Core technologies:**
- `@workos-inc/authkit-nextjs` 2.15.0: AuthKit session management, middleware, server helpers — official Next.js SDK with confirmed peer dep compatibility
- `@workos-inc/node` 8.8.0: All server-side WorkOS API calls (orgs, memberships, invitations, Pipes token retrieval) — single SDK for entire WorkOS surface
- `@workos-inc/widgets` 1.9.0: Drop-in Pipes widget — eliminates building a custom OAuth connect screen entirely
- SSE via `ReadableStream`: Live standup broadcast — serverless-compatible, sufficient for single-instance v1
- PartyKit / partysocket (contingency): External real-time if Vercel multi-instance is needed — Cloudflare Workers-based, minimal API surface

### Expected Features

**Must have (table stakes):**
- WorkOS-managed sign in/out with session persistence — AuthKit hosted UI handles all UI/UX
- GitHub and Linear OAuth connection via Pipes widget — users expect one-click connect, not token pasting
- Connection status, reauth, and disconnect — widget handles all three states natively
- Create team workspace and invite teammates via email — standard SaaS collaboration baseline
- Join via invite link — flexible onboarding alternative to email
- Team member list and owner controls (remove member, revoke invite)
- AI conversation threads that persist after WorkOS migration
- AI can query across all team members' connected accounts — core value proposition of a team tool
- Prompt to connect on first use — clear empty-state call to action for new users

**Should have (competitive differentiators):**
- Live shared standup session where all members see the same AI conversation in real time
- Presenter/driver role — one person controls input at a time, mirrors how standups work
- Driver rotation — teams pass the mic
- Session participants presence list
- Post-standup AI-generated summary
- "What is [person] working on?" cross-account resolution by name
- Empty-state AI guidance for new users and first-standup walkthrough prompts

**Defer (v2+):**
- Async standup scheduling and reminder bots
- Slack integration (this product is the alternative to Slack bots)
- Webhook-based real-time notifications from GitHub/Linear
- Advanced RBAC beyond Owner/Member
- Billing and paywall UI
- Native mobile app

### Architecture Approach

The architecture adds three new layers to the existing Next.js 15/Tambo AI/Turso foundation. Layer one is WorkOS AuthKit at the middleware and server component level, replacing Better Auth's cookie model and exposing `userId`, `organizationId`, and `accessToken` to all server-side code. Layer two is the multi-tenant data model: `users`, `teams`, `memberships`, `invitations`, and `standup_sessions` tables in Turso, with WorkOS user IDs used directly as primary keys and WorkOS org IDs stored as foreign references. Layer three is the live standup session: an in-process `Map<sessionId, Set<ReadableStreamController>>` allows the server to broadcast SSE events to all connected participants when the driver submits a query or transfers the floor. All Tambo tool calls are updated to use `withPipesToken()` for single-user writes and `getTeamTokens()` for cross-member reads, eliminating all client-side header-based token passing.

**Major components:**
1. `authkitMiddleware` + `withAuth()` — session validation at middleware and API route level (defense-in-depth per CVE-2025-29927 pattern)
2. `withPipesToken(provider)` / `getTeamTokens(provider, teamId)` — server-side token fetching wrappers replacing all header-based token extraction
3. Multi-tenant Turso schema (users, teams, memberships, invitations, standup_sessions) — single shared database with team_id WHERE clauses enforced via typed `withTeamContext` wrapper
4. WorkOS Organizations (one per team) — used only for Pipes connection scoping, not SSO or SCIM
5. SSE broadcast layer (`/api/standup/[id]/events`) — in-process ReadableStream per session, closed on abort or session end
6. Updated Tambo tools and system prompt — team context injected server-side; AI knows team members and can issue team-scoped tool calls

### Critical Pitfalls

1. **Auth migration silently corrupts existing tokens** — Ship WorkOS Pipes simultaneously with Better Auth removal. Clear stale localStorage entries (`user-github-token::` prefix) on first post-migration login. Do not attempt decryption migration. See PITFALLS.md Pitfall 1.

2. **Middleware-only auth allows horizontal privilege escalation** — Every API route that accepts a `teamId` or `orgId` parameter must verify membership server-side via `withAuth()` + a DB membership check. Middleware checks presence of a session, not team membership. See PITFALLS.md Pitfall 2.

3. **Missing `team_id` WHERE clause causes cross-tenant data leaks** — Use a typed `withTeamContext(db, teamId)` query wrapper that structurally injects the tenant filter. Never query multi-tenant tables with SELECT without an explicit team/user scope. See PITFALLS.md Pitfall 3.

4. **WorkOS Pipes token fetched or returned client-side** — `getAccessToken()` is a server-only call authenticated with `WORKOS_API_KEY`. Tokens must never appear in API response bodies or client state. Remove all `x-linear-api-key` / `x-github-token` header patterns. See PITFALLS.md Pitfall 4.

5. **SSE (or WebSocket) inside Vercel serverless functions disconnects every 10-25s** — Vercel serverless functions cannot hold long-lived connections. Either use SSE with in-process state (single-instance deploy only) or use an external real-time service (PartyKit/Ably). Decide this before writing any live standup code. See PITFALLS.md Pitfall 10.

## Implications for Roadmap

Based on research, suggested phase structure (directly maps to ARCHITECTURE.md build order):

### Phase 1: WorkOS AuthKit Migration
**Rationale:** Every subsequent feature depends on `userId` and `organizationId` from the WorkOS session. The Pipes widget requires `accessToken` from this session. The DB schema uses WorkOS user IDs as primary keys. Nothing else can be built until auth is stable.
**Delivers:** Authenticated sessions with WorkOS-managed login/logout. Middleware protection. Callback handler that upserts user row.
**Addresses:** All auth table-stakes features (sign in/out, session persistence, post-login redirect)
**Avoids:** Pitfall 1 (stale token migration), Pitfall 2 (middleware-only auth), Pitfall 6 (middleware composition), Pitfall 11 (static asset interception), Pitfall 12 (Better Auth cleanup)
**Key decisions:** Remove `better-auth` entirely. Add `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `WORKOS_REDIRECT_URI`. Clear stale localStorage on first login.

### Phase 2: Multi-Tenant DB Schema
**Rationale:** Required before WorkOS Pipes can associate connections to users, before team management UI can write memberships, and before invite flows can store tokens. Auth callback in Phase 1 needs a user row to exist.
**Delivers:** Turso schema with `users`, `teams`, `memberships`, `invitations`, `standup_sessions`. Kysely-typed DB client. `withTeamContext` query wrapper.
**Addresses:** Multi-tenant data isolation (Pitfall 3), invite token security (Pitfall 13), cache key tenant scoping (Pitfall 14 groundwork)
**Key decisions:** `users.id` is the WorkOS user ID directly. `teams.workos_org_id` nullable until team created. Connection state NOT stored in DB — WorkOS Pipes owns it.

### Phase 3: WorkOS Pipes Integration
**Rationale:** Requires Phase 1 (WorkOS session for userId+organizationId) and Phase 2 (user row must exist). Unblocks all API route refactoring and team read aggregation in Phase 5.
**Delivers:** `/settings/connections` page with Pipes widget. `withPipesToken()` wrapper. `getTeamTokens()` helper. All API routes migrated off header-based token extraction.
**Addresses:** GitHub and Linear connection table-stakes features. Eliminates token client-exposure pattern (Pitfall 4). Removes anti-feature of manual token entry.
**Avoids:** Pitfall 4 (client-side token exposure), Pitfall 8 (cross-user token context)
**Key risk:** Linear as a Pipes provider needs verification in the WorkOS dashboard before committing to this path. Fallback is manual OAuth with server-side encrypted token storage.

### Phase 4: Team Management
**Rationale:** Requires Phase 2 (DB schema). Can run after Phase 3 but does not strictly depend on it. Must complete before Phase 5 (team reads need at least one team with members).
**Delivers:** Team creation flow (creates WorkOS org + local team record). Email invitation via WorkOS Invitations API. Invite link flow. Member list. Owner controls (remove member, revoke invite).
**Addresses:** All team/workspace table-stakes and owner-control features from FEATURES.md.
**Avoids:** Pitfall 7 (WorkOS Org vs app team model — hybrid approach: Turso team with workos_org_id reference), Pitfall 13 (invite token security)
**Key decisions:** WorkOS Organization created per team for Pipes scoping only. Invite and membership UI stays entirely in-app. Two roles only: Owner/Member.

### Phase 5: Team-Scoped AI Tools
**Rationale:** Depends on Phase 3 (Pipes tokens) and Phase 4 (team membership resolution). First phase that delivers the core value proposition: "AI can answer team-wide questions."
**Delivers:** Updated Tambo system prompt with team context (team name, member names, teamId). New team-aggregate tool variants (`getTeamWorkSummary`, `getTeamPRSummary`). Write tools remain self-only.
**Addresses:** Cross-account data intelligence differentiators, connected account aggregation table stakes, "what is the team working on?" core value.
**Avoids:** Pitfall 8 (cross-user token context — `getTeamTokens` fetches inline, discards immediately)

### Phase 6: Live Standup Mode
**Rationale:** Depends on all previous phases. Requires team context (Phase 4), Pipes tokens for team queries (Phases 3 and 5), and WorkOS session for participant identity (Phase 1). The deployment model (SSE in-process vs. external real-time service) must be decided before writing any code.
**Delivers:** Start/end standup session lifecycle. Real-time shared AI conversation via SSE. Driver role with input lock. Driver rotation. Participants presence list. Post-standup AI summary.
**Addresses:** All live standup differentiator features from FEATURES.md.
**Avoids:** Pitfall 9 (session state race condition — server-side lock, event log for catch-up), Pitfall 10 (Vercel serverless SSE limits — choose architecture before building)
**Key decisions:** For single-instance Vercel deploy, use in-process `Map<sessionId, Set<ReadableStreamController>>`. For multi-instance, use PartyKit (pre-researched). Disable send input while `ai_generating = true` in shared session state.

### Phase Ordering Rationale

- Phase 1 before everything: WorkOS session provides the `userId` and `organizationId` on which all subsequent server-side calls depend.
- Phase 2 before Phase 3: Pipes widget needs a user row to associate connections to; the callback handler that creates user rows is part of Phase 1/2.
- Phase 3 before Phase 5: Team tool aggregation uses `getTeamTokens()` which is defined in Phase 3.
- Phase 4 before Phase 5: Team reads require resolved team membership.
- Phase 6 last: Depends on all previous phases and introduces a separate architectural concern (real-time transport) that should not be mixed into earlier phases.
- Phases 3 and 4 can be partially parallelized by separate contributors since they share Phase 2 as a foundation but do not depend on each other.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 6 (Live Standup):** Real-time transport decision (SSE in-process vs. PartyKit) has deployment implications not fully resolved. Vercel streaming limits and cold start behavior with long-lived SSE connections need verification before committing to the in-process approach. If PartyKit is chosen, `partykit.json` configuration and separate deploy pipeline need planning.
- **Phase 3 (Pipes):** Linear provider availability in WorkOS Pipes must be confirmed in the dashboard. The research confirmed official blog content supports it, but the public provider list changelog did not name Linear explicitly. This is a go/no-go gate for the Pipes-first approach.

Phases with standard patterns (skip research-phase):
- **Phase 1 (AuthKit Migration):** Official WorkOS docs are comprehensive. Migration path from Better Auth is documented. Pattern is straightforward configuration swap.
- **Phase 2 (DB Schema):** Standard row-level multi-tenant SQLite pattern. Kysely libSQL dialect already confirmed working in codebase. No novel patterns.
- **Phase 4 (Team Management):** WorkOS Invitations API is well-documented. Standard SaaS invite flow patterns apply.
- **Phase 5 (Team AI Tools):** Tambo tool registration pattern is already established in the codebase. The change is additive (new tools + updated system prompt).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | WorkOS SDK versions verified via npm registry. Peer dependencies confirmed for Next.js 15. Only uncertainty is Linear as a Pipes provider (MEDIUM). |
| Features | MEDIUM-HIGH | WorkOS auth and team features verified against official docs. Live standup feature patterns inferred from Spinach.ai competitor analysis and general real-time collaboration research. |
| Architecture | HIGH | WorkOS session data shape confirmed from authkit-nextjs source. Pipes token retrieval pattern confirmed from official Linear tutorial. SSE in Route Handlers confirmed from Next.js 15 documentation. CVE-2025-29927 pattern verified from Vercel postmortem. |
| Pitfalls | MEDIUM-HIGH | Auth migration pitfalls verified against WorkOS GitHub issues (#28 refresh race, #47 middleware composition). Multi-tenant SQL pitfalls are well-documented general patterns. Vercel SSE limitation confirmed from Next.js GitHub discussions. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Linear as a Pipes provider:** Verify Linear appears in the WorkOS dashboard's Pipes configuration before Phase 3 begins. If absent, the fallback is manual OAuth with server-side encrypted token storage in Turso (adds 1-2 days of scope to Phase 3).
- **Vercel SSE limits for live standup:** Test whether Vercel's function timeout (10-25s default) applies to streaming Route Handlers or only to non-streaming responses. If streaming timeouts are enforced, Phase 6 must use PartyKit. Verify before Phase 6 planning.
- **Refresh token concurrency under parallel Tambo tool calls:** The authkit-nextjs issue #28 describes a race condition when multiple requests fire simultaneously. This is most likely to surface during Phase 6 (live standup with concurrent tool invocations). Test explicitly before shipping Phase 5.
- **Existing user migration timing:** Any existing users with encrypted localStorage tokens must be handled gracefully. The clear-and-re-onboard strategy is correct but needs explicit UI: a one-time banner or prompt on first post-migration login explaining why they need to reconnect.

## Sources

### Primary (HIGH confidence)
- [WorkOS AuthKit Next.js Docs](https://workos.com/docs/authkit/nextjs) — session management, middleware setup
- [workos/authkit-nextjs GitHub README](https://github.com/workos/authkit-nextjs/blob/main/README.md) — session data shape, withAuth return type
- [WorkOS Pipes Docs](https://workos.com/docs/pipes) — getAccessToken API, token lifecycle
- [Fetch Linear Data with WorkOS Pipes (official tutorial)](https://workos.com/blog/fetch-data-from-linear-with-pipes-tutorial) — server-side token retrieval pattern
- [WorkOS Pipes Widget Docs](https://workos.com/docs/widgets/pipes) — Pipes component, authToken prop
- [WorkOS Invitations Docs](https://workos.com/docs/authkit/invitations) — sendInvitation, revokeInvitation
- [WorkOS Organization Membership API](https://workos.com/docs/reference/authkit/organization-membership) — membership CRUD
- [CVE-2025-29927 Vercel postmortem](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) — defense-in-depth auth pattern
- [WorkOS authkit-nextjs issue #28](https://github.com/workos/authkit-nextjs/issues/28) — refresh token race condition
- [WorkOS authkit-nextjs issue #47](https://github.com/workos/authkit-nextjs/issues/47) — middleware composition

### Secondary (MEDIUM confidence)
- [WorkOS Pipes: Nine New Providers changelog](https://workos.com/changelog/nine-new-providers-in-workos-pipes) — provider list (Linear not explicitly named)
- [PartyKit Docs](https://docs.partykit.io/) — room model, React hook
- [PartyKit + Next.js Tutorial](https://docs.partykit.io/tutorials/add-partykit-to-a-nextjs-app/) — integration pattern
- [Next.js 15 SSE with ReadableStream](https://damianhodgkiss.com/tutorials/real-time-updates-sse-nextjs) — Route Handler SSE pattern
- [SSE on Vercel limitations — GitHub Discussion #48427](https://github.com/vercel/next.js/discussions/48427) — serverless streaming constraints
- [Multi-tenant SaaS data model patterns](https://www.checklyhq.com/blog/building-a-multi-tenant-saas-data-model/) — membership table, invitations
- [WorkOS — Tenant isolation in multi-tenant systems](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems) — data isolation patterns
- [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) — SQL injection, tenant scoping
- [Spinach.ai live standup feature description](https://www.spinach.ai/content/best-standup-tools) — competitor feature baseline

### Tertiary (LOW confidence)
- [SaaS invite flow patterns](https://userpilot.com/blog/onboard-invited-users-saas/) — onboarding UX patterns
- [Real-time collaboration race conditions — DEV Community](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8) — floor control race patterns

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
