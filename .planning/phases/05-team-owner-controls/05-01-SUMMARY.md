---
phase: 05-team-owner-controls
plan: 01
subsystem: api
tags: [nextjs, workos, kysely, team-management, api-routes]

requires:
  - phase: 04-team-formation
    provides: Team CRUD, memberships, invite links, team settings modal
provides:
  - Leave team API (POST /api/teams/leave)
  - Remove member API (DELETE /api/teams/members)
  - Invitations list + actions API (GET/POST /api/teams/invitations)
  - Team update API (PATCH /api/teams/update)
  - Team delete API (POST /api/teams/delete)
affects: [05-team-owner-controls]

tech-stack:
  added: []
  patterns: [owner-only permission check, WorkOS org membership sync on leave/remove, cascading delete order]

key-files:
  created:
    - src/app/api/teams/leave/route.ts
    - src/app/api/teams/invitations/route.ts
    - src/app/api/teams/update/route.ts
    - src/app/api/teams/delete/route.ts
  modified:
    - src/app/api/teams/members/route.ts

key-decisions:
  - "Used getFullDb() for all routes since they operate across teams/memberships/invite_links tables"
  - "WorkOS calls wrapped in try/catch -- local DB is source of truth, WorkOS sync is best-effort"
  - "Link revocation auto-regenerates a new link to ensure there is always an active invite link"

patterns-established:
  - "Owner-only route pattern: verify membership then check role === owner before mutation"
  - "Personal workspace redirect: after leave/delete, query user's is_personal=1 team for redirect"
  - "Cascading delete order: invite_links -> connections -> memberships -> teams -> WorkOS org"

requirements-completed: [TEAM-06, TEAM-07, TEAM-08, TEAM-09]

duration: 2min
completed: 2026-03-05
---

# Phase 5 Plan 1: Team Owner Controls API Routes Summary

**5 API routes for leave team, remove member, manage invitations, update team name/slug, and delete team with WorkOS sync**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T00:37:20Z
- **Completed:** 2026-03-05T00:39:59Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Leave team endpoint with last-owner guard preventing the sole owner from leaving
- Remove member endpoint (owner-only) with WorkOS org membership cleanup
- Invitations endpoint merging WorkOS email invitations and local invite links with resend/revoke actions
- Team update endpoint validating name/slug with slug uniqueness (409) and WorkOS org name sync
- Team delete endpoint with name confirmation, cascading record deletion, and WorkOS org cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Leave team, remove member, and invitations API routes** - `6b91fea` (feat)
2. **Task 2: Team update and delete API routes** - `9ba0cb6` (feat)

## Files Created/Modified
- `src/app/api/teams/leave/route.ts` - POST endpoint to leave a team with last-owner guard
- `src/app/api/teams/members/route.ts` - Extended with DELETE handler for owner-only member removal
- `src/app/api/teams/invitations/route.ts` - GET lists merged invitations, POST handles resend/revoke
- `src/app/api/teams/update/route.ts` - PATCH updates team name/slug with validation and WorkOS sync
- `src/app/api/teams/delete/route.ts` - POST deletes team with name confirmation and cascading cleanup

## Decisions Made
- Used getFullDb() for all routes since they operate across teams/memberships/invite_links tables
- WorkOS calls wrapped in try/catch -- local DB is source of truth, WorkOS sync is best-effort
- Link revocation auto-regenerates a new link to ensure there is always an active invite link

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 API routes ready for UI integration in plans 05-02 and 05-03
- Owner-only permission checks consistent across all mutation endpoints
- Personal workspace redirect data returned from leave and delete endpoints

---
*Phase: 05-team-owner-controls*
*Completed: 2026-03-05*
