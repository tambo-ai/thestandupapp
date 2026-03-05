# Requirements: The Standup App

**Defined:** 2026-03-03
**Core Value:** A team can see what everyone is working on across GitHub and Linear through a single AI-powered conversation

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up and sign in via WorkOS AuthKit (replaces Better Auth)
- [x] **AUTH-02**: User session persists across browser refreshes via WorkOS session management
- [x] **AUTH-03**: User can log out from any page
- [x] **AUTH-04**: User is redirected to intended destination after login
- [x] **AUTH-05**: Better Auth is fully removed from the codebase

### Connections

- [x] **CONN-01**: User can connect their GitHub account via WorkOS Pipes widget
- [x] **CONN-02**: User can connect their Linear account via WorkOS Pipes widget
- [x] **CONN-03**: User can see the status of their connected accounts (connected/disconnected/needs reauth)
- [x] **CONN-04**: User can reauthorize a broken connection via Pipes widget
- [x] **CONN-05**: User can disconnect an account
- [x] **CONN-06**: New user sees a prompt to connect accounts on first use
- [x] **CONN-07**: Connected account tokens are managed server-side via WorkOS Pipes (never in localStorage)
- [x] **CONN-08**: Client-side encrypted token storage (user-tokens.ts) is fully removed

### Team Management

- [x] **TEAM-01**: User can create a new team (workspace) which creates a WorkOS Organization
- [x] **TEAM-02**: User can invite team members via email (WorkOS Invitations API)
- [x] **TEAM-03**: User can invite team members via shareable invite link
- [x] **TEAM-04**: Invited user can accept invitation and join the team
- [x] **TEAM-05**: User can view all team members
- [x] **TEAM-06**: User can leave a team
- [x] **TEAM-07**: Workspace owner can remove a team member
- [x] **TEAM-08**: Workspace owner can view pending invitations
- [x] **TEAM-09**: Workspace owner can resend or revoke a pending invitation

### Database

- [x] **DATA-01**: Multi-tenant schema with users, teams, memberships, and connection references in Turso
- [x] **DATA-02**: All multi-tenant queries are scoped by team ID (no cross-tenant data leaks)
- [x] **DATA-03**: User record stores WorkOS user ID as primary identifier

### Cross-Team AI

- [x] **AI-01**: AI system prompt is rebuilt from server-side team and connection data (not localStorage)
- [x] **AI-02**: AI tools use WorkOS Pipes token lookup per member for read operations
- [ ] **AI-03**: AI can answer "what is the team working on" by aggregating across all members' connections
- [ ] **AI-04**: AI results from cross-team queries include attribution (which member each result belongs to)
- [x] **AI-05**: Write operations (create PR, open issue) use only the requesting user's connection
- [x] **AI-06**: Each user retains their own personal conversation threads

### Live Standup

- [ ] **LIVE-01**: Team member can start a live standup session
- [ ] **LIVE-02**: Team members can join an active standup session
- [ ] **LIVE-03**: All participants see the same AI conversation in real-time
- [ ] **LIVE-04**: One person is the "driver" who controls the AI conversation input at a time
- [ ] **LIVE-05**: Driver role can be transferred/rotated during a session
- [ ] **LIVE-06**: All participants can see who is in the session (presence list)
- [ ] **LIVE-07**: Session can be ended by the owner or driver
- [ ] **LIVE-08**: AI generates a post-standup summary when session ends

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Async Standups

- **ASYNC-01**: Scheduled standup reminders via email
- **ASYNC-02**: Async standup responses collected and summarized by AI

### Analytics

- **ANLYT-01**: Dashboard showing team activity trends over time
- **ANLYT-02**: Individual contribution metrics

### Notifications

- **NOTIF-01**: In-app notifications for team activity
- **NOTIF-02**: Email digest of team standup summaries

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom OAuth token management | WorkOS Pipes owns token storage and refresh entirely |
| Role-based permissions beyond Owner/Member | v1 complexity trap — two roles are sufficient |
| Slack bot integration | This product replaces Slack standup bots, not joins them |
| Native mobile app | Web-first, responsive only |
| Billing / payments | Free for v1 |
| Webhook-based real-time notifications | On-demand queries are sufficient for standup cadence |
| Manual API key entry (old pattern) | Entire point of WorkOS Pipes is to eliminate this |
| Storing raw OAuth tokens in database | Security risk — only store WorkOS connection references |
| Workspace-level GitHub/Linear org config | Each member connects their own account; AI aggregates |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| CONN-01 | Phase 3 | Complete |
| CONN-02 | Phase 3 | Complete |
| CONN-03 | Phase 3 | Complete |
| CONN-04 | Phase 3 | Complete |
| CONN-05 | Phase 3 | Complete |
| CONN-06 | Phase 3 | Complete |
| CONN-07 | Phase 3 | Complete |
| CONN-08 | Phase 3 | Complete |
| TEAM-01 | Phase 4 | Complete |
| TEAM-02 | Phase 4 | Complete |
| TEAM-03 | Phase 4 | Complete |
| TEAM-04 | Phase 4 | Complete |
| TEAM-05 | Phase 4 | Complete |
| TEAM-06 | Phase 5 | Complete |
| TEAM-07 | Phase 5 | Complete |
| TEAM-08 | Phase 5 | Complete |
| TEAM-09 | Phase 5 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| AI-01 | Phase 6 | Complete |
| AI-02 | Phase 6 | Complete |
| AI-03 | Phase 6 | Pending |
| AI-04 | Phase 6 | Pending |
| AI-05 | Phase 6 | Complete |
| AI-06 | Phase 6 | Complete |
| LIVE-01 | Phase 7 | Pending |
| LIVE-02 | Phase 7 | Pending |
| LIVE-03 | Phase 7 | Pending |
| LIVE-04 | Phase 8 | Pending |
| LIVE-05 | Phase 8 | Pending |
| LIVE-06 | Phase 7 | Pending |
| LIVE-07 | Phase 7 | Pending |
| LIVE-08 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation — traceability complete*
