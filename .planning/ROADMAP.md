# Roadmap: The Standup App — Milestone 2

## Overview

This milestone transforms the existing single-user Tambo AI standup app into a multi-tenant team product. The journey follows a strict dependency chain: WorkOS AuthKit replaces Better Auth and provides the session foundation, a multi-tenant database schema is layered on top, WorkOS Pipes replaces localStorage token storage for GitHub and Linear connections, team management features are built in two focused phases (creation/joining then owner controls), the AI is updated to query across all team members' connections, and finally live standup mode lets an entire team view the same AI conversation in real time. Each phase delivers a coherent, independently verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: WorkOS Auth Migration** - Replace Better Auth with WorkOS AuthKit for login, sessions, and middleware
- [ ] **Phase 2: Multi-Tenant DB Schema** - Extend Turso with users, teams, memberships, and invitations tables
- [ ] **Phase 3: WorkOS Pipes Connections** - Replace localStorage token storage with WorkOS Pipes for GitHub and Linear
- [ ] **Phase 4: Team Formation** - Create teams, invite members, and join via link or email
- [ ] **Phase 5: Team Owner Controls** - Member management, invitation management, and leave/remove flows
- [ ] **Phase 6: Team-Scoped AI Tools** - AI queries across all team members' connections for cross-team standup answers
- [ ] **Phase 7: Live Standup Sessions** - Start, join, and end shared AI sessions with real-time sync and presence
- [ ] **Phase 8: Driver Control and Summary** - Floor control, driver rotation, and post-standup AI summary

## Phase Details

### Phase 1: WorkOS Auth Migration
**Goal**: Users can securely sign in and out via WorkOS AuthKit, with sessions persisted across browser refreshes and all Better Auth code removed
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can sign up and sign in using the WorkOS AuthKit hosted UI
  2. User remains logged in after closing and reopening the browser (session persists)
  3. User can log out from any page and is returned to the login screen
  4. User is redirected to the page they originally requested after completing login
  5. No references to better-auth remain in package.json, source files, or environment config
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md — Install WorkOS AuthKit, replace middleware, create callback route and signOut action, add AuthKitProvider
- [x] 01-02-PLAN.md — Restructure routes (landing at /, app at /app), extract AppShell, update UserHeader, remove all Better Auth code

### Phase 2: Multi-Tenant DB Schema
**Goal**: The Turso database has a multi-tenant schema that stores users, teams, memberships, and invitations, with all queries tenant-scoped so no data leaks across teams
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Database contains users, teams, memberships, and invitations tables with correct foreign key relationships
  2. User record is keyed on WorkOS user ID (no separate auth-system ID)
  3. A query typed through the withTeamContext wrapper structurally cannot return rows from a different team
  4. Auth callback upserts a user row on first login without error
**Plans:** 4 plans
Plans:
- [x] 02-01-PLAN.md — Create schema types, dual database accessor (db + teamDb), migration files, migration runner, and schema verification script
- [x] 02-02-PLAN.md — Extend auth callback with user upsert and personal team creation, add middleware user sync with staleness check, team cookie management, and tenant scoping verification tests
- [x] 02-03-PLAN.md — Gap closure: Wire activeTeamId cookie prop into AppShell team context, fix middleware cookie read-after-delete edge case
- [ ] 02-04-PLAN.md — UAT gap closure: Add env self-loading to scripts so they work without --env-file flag, add npm convenience scripts

### Phase 3: WorkOS Pipes Connections
**Goal**: Users can connect their GitHub and Linear accounts via the WorkOS Pipes widget, tokens are managed server-side, and all client-side encrypted token storage is removed
**Depends on**: Phase 2
**Requirements**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06, CONN-07, CONN-08
**Success Criteria** (what must be TRUE):
  1. User can connect their GitHub account using the Pipes OAuth widget (one click, no token pasting)
  2. User can connect their Linear account using the Pipes OAuth widget
  3. User can see whether each account is connected, disconnected, or needs reauthorization
  4. User can reauthorize a broken connection directly from the connections settings page
  5. User can disconnect an account and the connection is removed
  6. A new user who has not connected any accounts sees a prompt directing them to the connections page
  7. No OAuth tokens appear in localStorage, client state, or API response bodies — server only
  8. The user-tokens.ts file and all encrypted localStorage token patterns are deleted from the codebase
**Plans:** 3 plans
Plans:
- [ ] 03-01-PLAN.md — Install Pipes dependencies, replace header-based token wrappers with server-side Pipes retrieval, create connection status API, update page.tsx
- [ ] 03-02-PLAN.md — Create connections modal with Pipes widget, add status dots to UserHeader, create onboarding prompt, wire into AppShell
- [ ] 03-03-PLAN.md — Delete user-tokens.ts and settings-modal.tsx, remove all getTokenHeaders imports, simplify to plain fetch

### Phase 4: Team Formation
**Goal**: Users can create a team workspace, invite teammates by email or shareable link, and join a team — establishing the multi-tenant group structure needed for shared AI queries
**Depends on**: Phase 2
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05
**Success Criteria** (what must be TRUE):
  1. User can create a new team which provisions a WorkOS Organization and a local team record
  2. Team owner can send an email invitation and the recipient receives a join link in their inbox
  3. Team owner can generate a shareable invite link that grants access when visited
  4. Invited user can click the link (email or shareable), complete sign-in if needed, and land in the team workspace
  5. Any team member can view the list of all current members in the workspace
**Plans**: TBD

### Phase 5: Team Owner Controls
**Goal**: Workspace owners can manage team membership and pending invitations, and any member can leave a team
**Depends on**: Phase 4
**Requirements**: TEAM-06, TEAM-07, TEAM-08, TEAM-09
**Success Criteria** (what must be TRUE):
  1. Any team member can leave a team and is immediately removed from the membership list
  2. Workspace owner can remove any non-owner member from the team
  3. Workspace owner can see a list of all pending (unaccepted) invitations
  4. Workspace owner can resend a pending invitation email
  5. Workspace owner can revoke a pending invitation so the link stops working
**Plans**: TBD

### Phase 6: Team-Scoped AI Tools
**Goal**: The AI can answer team-wide questions by aggregating data across all connected team members' accounts, while restricting write operations to the acting user only and preserving per-user conversation threads
**Depends on**: Phase 3, Phase 4
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06
**Success Criteria** (what must be TRUE):
  1. When asked "what is the team working on?", the AI returns a synthesized answer drawing from all members' GitHub and Linear connections
  2. Cross-team query results include attribution showing which team member each item belongs to
  3. Write operations (open issue, create PR) use only the requesting user's own token — never another member's
  4. Each user's conversation history is private to them and persists independently across sessions
  5. The AI system prompt reflects current team membership and connection data from the server, not from localStorage
**Plans**: TBD

### Phase 7: Live Standup Sessions
**Goal**: Team members can start, join, and end a shared live standup session where all participants see the same AI conversation in real time with a visible presence list
**Depends on**: Phase 6
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-06, LIVE-07
**Success Criteria** (what must be TRUE):
  1. A team member can start a live standup session and receive a session link to share with the team
  2. Other team members can join an active session by navigating to the link
  3. All participants see the same AI conversation update in real time as queries are made
  4. All participants can see a live list of who is currently in the session
  5. The session owner or the current driver can end the session, which closes it for all participants
**Plans**: TBD

### Phase 8: Driver Control and Summary
**Goal**: One person drives the AI conversation at a time during a standup session, the driver role can be transferred, and the AI generates a post-standup summary when the session ends
**Depends on**: Phase 7
**Requirements**: LIVE-04, LIVE-05, LIVE-08
**Success Criteria** (what must be TRUE):
  1. Only the current driver can submit queries to the AI during a live session; other participants see the input locked
  2. The current driver can pass control to another participant, who immediately becomes the new driver
  3. When the session ends, the AI generates and displays a summary of what the team discussed
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

Note: Phase 3 (Pipes) and Phase 4 (Team Formation) both depend on Phase 2 but not on each other — they can be developed in parallel if needed.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. WorkOS Auth Migration | 2/2 | Complete | 2026-03-04 |
| 2. Multi-Tenant DB Schema | 3/4 | UAT gap closure | - |
| 3. WorkOS Pipes Connections | 0/3 | Planned | - |
| 4. Team Formation | 0/? | Not started | - |
| 5. Team Owner Controls | 0/? | Not started | - |
| 6. Team-Scoped AI Tools | 0/? | Not started | - |
| 7. Live Standup Sessions | 0/? | Not started | - |
| 8. Driver Control and Summary | 0/? | Not started | - |
