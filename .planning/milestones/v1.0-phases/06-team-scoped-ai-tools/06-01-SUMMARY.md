---
phase: 06-team-scoped-ai-tools
plan: 01
subsystem: api
tags: [workos-pipes, cross-member-token, team-context, kysely]

requires:
  - phase: 03-workos-pipes-migration
    provides: withGitHubToken and withLinearClient wrappers with WorkOS Pipes token retrieval
provides:
  - withGitHubTokenForUser wrapper for cross-member GitHub token lookup via forUserId
  - withLinearClientForUser wrapper for cross-member Linear token lookup via forUserId
  - getTeamMembersWithConnections helper returning team roster with connection status
  - All 7 read API routes accept forUserId query parameter for cross-member data access
affects: [06-02, 06-03, team-scoped-ai-tools]

tech-stack:
  added: []
  patterns: [cross-member-token-lookup-via-forUserId, shared-team-membership-validation]

key-files:
  created:
    - src/lib/team-context.ts
  modified:
    - src/lib/github-client.ts
    - src/lib/linear-client.ts
    - src/app/api/github/prs/route.ts
    - src/app/api/github/find-user/route.ts
    - src/app/api/linear/team/route.ts
    - src/app/api/linear/issues/route.ts
    - src/app/api/linear/search/route.ts
    - src/app/api/linear/risks/route.ts
    - src/app/api/linear/cycle/route.ts

key-decisions:
  - "Shared-team validation query joins teams table to get workos_organization_id in a single query"
  - "Cross-member wrappers use team's workos_organization_id (not session organizationId) for Pipes calls"

patterns-established:
  - "forUserId pattern: read API routes accept optional forUserId query param, wrapper handles team validation and token lookup"
  - "Original withGitHubToken/withLinearClient preserved for write operations (no forUserId support)"

requirements-completed: [AI-02, AI-05]

duration: 3min
completed: 2026-03-05
---

# Phase 6 Plan 1: Cross-Member Token Infrastructure Summary

**Cross-member token lookup wrappers (withGitHubTokenForUser, withLinearClientForUser) with team membership validation and all 7 read API routes updated to accept forUserId**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T02:33:27Z
- **Completed:** 2026-03-05T02:36:30Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Created withGitHubTokenForUser and withLinearClientForUser wrappers that validate shared team membership before retrieving another user's token
- Created getTeamMembersWithConnections helper that returns full team roster with per-member GitHub/Linear connection status
- Updated all 7 read API routes (2 GitHub, 5 Linear) to use cross-member wrappers
- Original withGitHubToken and withLinearClient remain exported and unchanged for write operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cross-member token wrappers and team context helper** - `d9c737f` (feat)
2. **Task 2: Update all read API routes to use cross-member wrappers** - `f1fa307` (feat)

## Files Created/Modified
- `src/lib/github-client.ts` - Added withGitHubTokenForUser with team validation and cross-member token lookup
- `src/lib/linear-client.ts` - Added withLinearClientForUser with identical cross-member pattern
- `src/lib/team-context.ts` - New file: getTeamMembersWithConnections for team roster with connection status
- `src/app/api/github/prs/route.ts` - Switched GET to withGitHubTokenForUser
- `src/app/api/github/find-user/route.ts` - Switched GET to withGitHubTokenForUser
- `src/app/api/linear/team/route.ts` - Switched GET to withLinearClientForUser
- `src/app/api/linear/issues/route.ts` - Switched GET to withLinearClientForUser
- `src/app/api/linear/search/route.ts` - Switched GET to withLinearClientForUser
- `src/app/api/linear/risks/route.ts` - Switched GET to withLinearClientForUser
- `src/app/api/linear/cycle/route.ts` - Switched GET to withLinearClientForUser

## Decisions Made
- Shared-team validation query joins the teams table to get workos_organization_id in a single query, avoiding a second DB lookup
- Cross-member Pipes calls use the team's workos_organization_id from DB rather than the session's organizationId (per RESEARCH.md recommendation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All read API routes now support forUserId parameter for cross-member data access
- Plans 06-02 and 06-03 can use these wrappers for team-wide tool queries and context helpers
- Original wrappers remain available for any future write operations

---
*Phase: 06-team-scoped-ai-tools*
*Completed: 2026-03-05*
