# Phase 4: Team Formation - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create a team workspace, invite teammates by email or shareable link, and join a team. This phase builds the team switcher, team creation flow, invite/join flows, and team settings modal with member list. Team deletion, member removal, invitation management (resend/revoke), and team name/slug editing are Phase 5 (owner controls).

</domain>

<decisions>
## Implementation Decisions

### Team Creation Flow
- "+ New Team" option in the team switcher dropdown — only visible when user is in their personal workspace
- Form fields: team name (required) + editable URL slug (auto-suggested from name, user can customize)
- Slug uniqueness validated on submit (not real-time)
- Creating a team immediately provisions a WorkOS Organization via the Organizations API
- After creation, user lands straight in the new team's workspace (cookie set, redirect to /app)
- Soft limit on team creation (e.g., 5 teams) — show warning but don't block
- Team deletion is out of scope for Phase 4

### Team Switcher
- Always visible in the app header, even for single-team users
- Shows current team name; clicking opens dropdown with all teams
- Personal workspace shown in the dropdown but visually separated (divider or different styling) from real teams
- Active team highlighted/bold in the dropdown list
- Contains: team list, "+ New Team" (personal workspace only), team settings trigger
- Switching teams triggers a full page reload (server component re-fetches everything, clean state)

### Team Settings Modal
- Modal overlay (consistent with connections modal from Phase 3)
- Triggered from the team switcher (Claude's discretion on exact trigger placement — gear icon or menu option)
- Three tabbed sections: General, Invite, Members
- **General tab**: Read-only in Phase 4 — shows team name and slug. Editing deferred to Phase 5
- **Invite tab**: Shareable link section (primary) + email invite section (secondary)
- **Members tab**: List of team members with avatar, display name, and role badge (Owner/Member)
- Accessible from personal workspace with a stripped-down version (just your name, no invite/member tabs)

### Invite Experience
- Shareable link is primary invite method, email invite is secondary
- Any team member can send invites (not restricted to owner)
- One persistent invite link per team — owner can regenerate to invalidate the old one
- Email invites support comma-separated batch input (multiple emails at once)
- Email delivery handled by WorkOS Invitations API (no custom email infrastructure)
- Invite link URL format: Claude's discretion (token-based vs slug-based, balancing security and readability)

### Join Flow
- Invite landing page: public route showing team name + "Join [Team]" button (name only, no member count or avatars)
- Unauthenticated users: see the landing page, clicking "Join" triggers WorkOS sign-in, then auto-joins on callback
- Already a member: silently redirect to the team workspace (no error, no message)
- Expired/revoked link: error page with explanation + suggestion to request a new invite from the team owner
- After successfully joining: welcome screen with "Welcome to [Team]!" and a "Go to workspace" button
- Same flow for both email invite links and shareable invite links
- No connection prompt on welcome screen — existing Phase 3 onboarding handles that in-app

### Conversation Threads
- Threads are scoped per team — each team has its own conversation history
- Switching teams shows that team's thread history

### Claude's Discretion
- Team switcher placement in the header (left side vs near user avatar)
- Team settings modal trigger (gear icon vs dropdown menu option)
- Invite link URL format (token-based /invite/abc123 vs slug-based /join/team-slug)
- Connection scoping across teams (whether Pipes connections carry over or are team-independent — depends on WorkOS behavior)
- Whether to show pending invitations list after sending (may defer to Phase 5 per TEAM-08)
- Exact styling, spacing, and animations for the team switcher and settings modal
- Personal workspace settings view content

</decisions>

<specifics>
## Specific Ideas

- Team switcher should feel like Slack/Linear's workspace switcher — lightweight dropdown, not a full-screen picker
- The settings modal tabs pattern keeps things organized without feeling heavy — General is simple context, Invite is action-oriented, Members is a list
- Personal workspace should feel like "your space" visually separated from real teams — a divider in the dropdown does the trick
- Full page reload on team switch keeps things simple with the server-component-first architecture — no complex client-side state juggling

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/schema.ts`: Full schema with TeamsTable, MembershipsTable, InviteLinksTable already defined
- `src/lib/db.ts`: `db` (global), `teamDb(teamId)` (scoped), `getFullDb()` (bootstrap) — all ready for team queries
- `src/lib/team-actions.ts`: `setActiveTeam()` and `getActiveTeamId()` server actions already handle cookie management
- `src/middleware.ts`: User upsert, personal team creation, active_team_id cookie validation, and auto-select all working
- `src/app/app/page.tsx`: Server component already reads activeTeamId cookie and looks up team name
- `migrations/`: All 5 migration files exist (users, teams, memberships, connections, invite_links)
- Connections modal pattern (`createPortal`, backdrop blur, Escape key handling) — reusable for team settings modal

### Established Patterns
- Server-component-first: user/team data fetched server-side in page.tsx, passed as props to client AppShell
- Modal pattern from Phase 3 connections modal — portal-based rendering
- Cookie-based team context with middleware validation
- `withAuth({ ensureSignedIn: true })` for protected server components
- Full page reload aligns with existing pattern (no client-side routing for state changes)

### Integration Points
- `src/components/user-header.tsx` — Add team switcher component (currently shows user name, avatar, connection dots, gear icon)
- `src/app/app/page.tsx` — Already resolves activeTeamId and activeTeamName; will need to pass team list for switcher
- `src/middleware.ts` — May need updates for invite link routes (unauthenticated access to /invite/*)
- New: `/invite/[token]/page.tsx` or similar public route for invite landing page
- New: `/api/teams/` routes for team CRUD and invite operations
- New: Team settings modal component
- New: Team switcher dropdown component
- `src/app/app/app-shell.tsx` — Will receive team list and render team switcher

</code_context>

<deferred>
## Deferred Ideas

- Team name/slug editing — Phase 5 (owner controls)
- Team deletion/archiving — future phase
- Member removal — Phase 5 (TEAM-07)
- Invitation management (resend/revoke pending) — Phase 5 (TEAM-08, TEAM-09)
- Connection status per member in member list — Phase 6

</deferred>

---

*Phase: 04-team-formation*
*Context gathered: 2026-03-04*
