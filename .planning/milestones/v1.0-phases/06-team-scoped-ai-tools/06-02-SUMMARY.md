---
phase: 06-team-scoped-ai-tools
plan: 02
subsystem: ai
tags: [tambo, contextHelpers, userKey, system-prompt, thread-scoping]

requires:
  - phase: 04-team-management-ui
    provides: Team switching and activeTeamId cookie
  - phase: 03-workos-pipes-migration
    provides: WorkOS Pipes getAccessToken for connection status checks
provides:
  - contextHelpers (team_roster) providing member list with connection status to AI
  - Composite userKey (userId:teamId) for per-team thread isolation
  - Standup-focused system prompt with scope rules and write restrictions
  - Thread name display and rename support in sidebar
affects: [06-team-scoped-ai-tools, 07-live-standup]

tech-stack:
  added: []
  patterns:
    - "contextHelpers for passing dynamic team data to AI on every message"
    - "Composite userKey pattern for per-team thread scoping"
    - "Promise.allSettled for parallel per-member connection status checks"

key-files:
  created: []
  modified:
    - src/app/app/page.tsx
    - src/app/app/app-shell.tsx
    - src/components/tambo/thread-history.tsx

key-decisions:
  - "Used contextHelpers (team_roster) instead of embedding member list in system prompt -- keeps prompt focused on behavior, dynamic data flows through context"
  - "Composite userKey format userId:teamId scopes threads per team; personal workspace uses userId alone"
  - "Promise.allSettled for per-member connection checks so one member failure does not block the roster"

patterns-established:
  - "contextHelpers pattern: dynamic data passed to AI via named helpers, not prompt stuffing"
  - "userKey scoping: composite key for multi-tenant thread isolation"

requirements-completed: [AI-01, AI-06]

duration: 4min
completed: 2026-03-05
---

# Phase 06 Plan 02: Team Context & Thread Scoping Summary

**Server-side team roster with contextHelpers, composite userKey for per-team thread isolation, and standup-focused system prompt with scope/attribution rules**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T02:33:17Z
- **Completed:** 2026-03-05T02:37:20Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Team member roster fetched server-side with per-member connection status via Promise.allSettled
- contextHelpers (team_roster) provides fresh team data to AI on every message
- Composite userKey (userId:teamId) ensures threads are scoped per team
- System prompt rewritten with standup persona, query scope rules, write restrictions, and attribution instructions
- Thread names displayed in sidebar with rename support via updateThreadName

## Task Commits

Each task was committed atomically:

1. **Task 1: Fetch team member roster and wire context into AI** - `3d5afe8` (feat)
2. **Task 2: Display thread names and support renaming** - `6e2bc9e` (feat)

## Files Created/Modified
- `src/app/app/page.tsx` - Added team member roster query with per-member connection status
- `src/app/app/app-shell.tsx` - Added contextHelpers, userKey, updated system prompt with standup persona
- `src/components/tambo/thread-history.tsx` - Thread name display, rename via updateThreadName, search by name

## Decisions Made
- Used contextHelpers (team_roster) instead of embedding member list in system prompt -- keeps prompt focused on behavior, dynamic data flows through context
- Composite userKey format `userId:teamId` scopes threads per team; personal workspace uses `userId` alone
- Promise.allSettled for per-member connection checks so one member failure does not block the roster

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- ESLint config has pre-existing error (unrelated to this plan's changes) -- lint command fails but build succeeds

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- AI now has team context via contextHelpers and thread isolation via userKey
- System prompt ready for Phase 7 live standup extension (placeholder comment in place)
- Tool modifications for cross-team queries can reference team_roster context

---
*Phase: 06-team-scoped-ai-tools*
*Completed: 2026-03-05*

## Self-Check: PASSED
