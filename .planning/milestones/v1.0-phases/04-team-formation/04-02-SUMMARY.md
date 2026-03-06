---
phase: 04-team-formation
plan: 02
subsystem: api
tags: [nextjs-routes, workos, team-crud, invite, kysely]

requires:
  - phase: 04-team-formation
    provides: switchTeam/joinTeam server actions, workos_organization_id column, invite middleware
  - phase: 02-multi-tenant-db-schema
    provides: teams, memberships, invite_links tables and teamDb/getFullDb helpers
provides:
  - POST /api/teams/create endpoint (WorkOS org + team + membership + invite link + cookie)
  - POST /api/teams/switch endpoint (delegates to switchTeam server action)
  - GET /api/teams/members endpoint (member list with user details)
  - GET/POST /api/teams/invite-link endpoint (retrieve or regenerate invite link)
  - POST /api/teams/invite-email endpoint (batch WorkOS email invitations)
  - POST /api/teams/join endpoint (join via invite token)
affects: [04-03, 04-04]

tech-stack:
  added: []
  patterns: [api-route-delegates-to-server-action, owner-only-regeneration, batch-email-with-allSettled]

key-files:
  created:
    - src/app/api/teams/create/route.ts
    - src/app/api/teams/switch/route.ts
    - src/app/api/teams/members/route.ts
    - src/app/api/teams/invite-link/route.ts
    - src/app/api/teams/invite-email/route.ts
    - src/app/api/teams/join/route.ts
  modified: []

key-decisions:
  - "Switch and join API routes delegate to server actions rather than reimplementing logic -- keeps switchToOrganization redirect handling in server action context"
  - "Invite link regeneration is owner-only; invite email sending is any-member"

patterns-established:
  - "API route as thin wrapper over server action: validate input, call server action, map result to HTTP response"
  - "Owner-only operations check membership.role before proceeding"
  - "Batch operations use Promise.allSettled and return sent/failed counts"

requirements-completed: [TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05]

duration: 2min
completed: 2026-03-04
---

# Phase 4 Plan 2: Team API Routes Summary

**Six API route handlers for team CRUD, invite link management, batch email invitations, and token-based joining via WorkOS**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T22:55:16Z
- **Completed:** 2026-03-04T22:57:16Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created 6 API route files under src/app/api/teams/ covering full team lifecycle
- Team creation provisions WorkOS Organization, creates team+membership+invite link in transaction, and sets active_team_id cookie
- Switch and join routes delegate to existing server actions to preserve correct redirect behavior
- Invite email uses WorkOS sendInvitation with Promise.allSettled for batch resilience

## Task Commits

Each task was committed atomically:

1. **Task 1: Team CRUD API routes (create, switch, members)** - `725040f` (feat)
2. **Task 2: Invite and join API routes** - `030a29d` (feat)

## Files Created/Modified
- `src/app/api/teams/create/route.ts` - Team creation with WorkOS org, membership, invite link, cookie
- `src/app/api/teams/switch/route.ts` - Delegates to switchTeam server action
- `src/app/api/teams/members/route.ts` - Member list with user details and roles
- `src/app/api/teams/invite-link/route.ts` - GET active link, POST owner-only regeneration
- `src/app/api/teams/invite-email/route.ts` - Batch email invitations via WorkOS
- `src/app/api/teams/join/route.ts` - Join via invite token, delegates to joinTeam server action

## Decisions Made
- Switch and join API routes delegate to server actions rather than reimplementing logic, keeping switchToOrganization redirect handling in server action context where Next.js handles it correctly
- Invite link regeneration restricted to team owner; email invitation sending open to any member (per CONTEXT.md decisions)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 API routes ready for UI consumption in Plans 03 and 04
- Team creation, switching, member listing, invite link, email invites, and joining all operational
- Plan 03 (team switcher UI) can call POST /api/teams/create and POST /api/teams/switch
- Plan 04 (invite/join UI) can call the invite-link, invite-email, and join endpoints

---
*Phase: 04-team-formation*
*Completed: 2026-03-04*
