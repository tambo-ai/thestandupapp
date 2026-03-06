---
phase: 04-team-formation
plan: 01
subsystem: database, api
tags: [kysely, workos, server-actions, middleware, invite, migration]

requires:
  - phase: 02-multi-tenant-db-schema
    provides: teams, memberships, invite_links tables and teamDb/getFullDb helpers
  - phase: 01-workos-auth-migration
    provides: WorkOS AuthKit integration with withAuth, switchToOrganization
provides:
  - workos_organization_id column on teams table
  - switchTeam server action for team switching with WorkOS org context
  - joinTeam server action for invite-based team joining
  - setPendingInvite server action for unauthenticated invite flow
  - Middleware exception for /invite/* routes
affects: [04-02, 04-03, 04-04]

tech-stack:
  added: []
  patterns: [server-action-with-workos-org-switching, invite-token-validation-pattern, pending-invite-cookie-pattern]

key-files:
  created:
    - migrations/006_add_workos_org_id.ts
  modified:
    - src/lib/schema.ts
    - src/lib/team-actions.ts
    - src/middleware.ts

key-decisions:
  - "Used prefix matching for unauthenticated paths in middleware to support /invite/[token] sub-routes"
  - "Added /invite/:path* to middleware matcher for authkit session handling on invite pages"

patterns-established:
  - "Server actions with switchToOrganization: let redirect propagate naturally, do not wrap in try/catch"
  - "Pending invite cookie: short-lived (10min) httpOnly cookie to bridge unauthenticated invite flow through auth redirect"

requirements-completed: [TEAM-01, TEAM-04]

duration: 2min
completed: 2026-03-04
---

# Phase 4 Plan 1: Team Formation Backend Foundation Summary

**Migration adding workos_organization_id to teams, plus switchTeam/joinTeam/setPendingInvite server actions and invite middleware exception**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T22:51:02Z
- **Completed:** 2026-03-04T22:53:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added workos_organization_id column to teams table via migration 006
- Created switchTeam server action that handles both real teams (WorkOS org switch) and personal workspace (cookie only)
- Created joinTeam server action with full invite token validation, membership creation, and WorkOS org membership
- Created setPendingInvite server action for unauthenticated invite flow cookie
- Updated middleware to allow unauthenticated access to /invite/* routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration and schema update for workos_organization_id** - `fac59d0` (feat)
2. **Task 2: Server actions and middleware updates** - `66eb84b` (feat)

## Files Created/Modified
- `migrations/006_add_workos_org_id.ts` - ALTER TABLE teams ADD COLUMN workos_organization_id
- `src/lib/schema.ts` - TeamsTable interface updated with workos_organization_id: string | null
- `src/lib/team-actions.ts` - switchTeam, joinTeam, setPendingInvite server actions added
- `src/middleware.ts` - /invite paths added to unauthenticated paths, prefix matching, matcher config

## Decisions Made
- Used prefix matching (`startsWith(path + '/')`) for unauthenticated paths to support nested invite routes like `/invite/[token]`
- Added `/invite/:path*` to middleware matcher so authkit session handling runs on invite pages (even though unauthenticated access is allowed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added prefix matching for unauthenticated paths**
- **Found during:** Task 2 (middleware updates)
- **Issue:** Existing middleware used exact path matching (`=== path`), which would not match `/invite/some-token`
- **Fix:** Added `startsWith(path + '/')` as an alternative match condition
- **Files modified:** src/middleware.ts
- **Verification:** Build passes, logic correctly matches both exact and nested paths
- **Committed in:** 66eb84b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for invite routes to work correctly with path parameters. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend foundation complete for team formation
- Plan 02 can now build API routes for team creation (POST /api/teams/create) and team switching
- Plan 03 can build team switcher UI using switchTeam server action
- Plan 04 can build invite flow UI using joinTeam and setPendingInvite

---
*Phase: 04-team-formation*
*Completed: 2026-03-04*
