---
phase: 06-team-scoped-ai-tools
plan: 04
subsystem: ai
tags: [tambo, threads, team-isolation, userKey, composite-key]

requires:
  - phase: 06-team-scoped-ai-tools
    provides: "Team context, thread scoping pattern, composite userKey design"
provides:
  - "Server-side thread pre-creation with composite userKey (userId:teamId)"
  - "Filtered thread listing via useTamboThreadList({ userKey })"
  - "Team-scoped new thread creation via /api/tambo/threads POST route"
affects: [07-live-standup]

tech-stack:
  added: []
  patterns: [server-side-thread-precreation, composite-userkey-isolation]

key-files:
  created:
    - src/app/api/tambo/threads/route.ts
  modified:
    - src/components/tambo/thread-history.tsx
    - src/components/tambo/message-thread-full.tsx
    - src/app/app/app-shell.tsx

key-decisions:
  - "Used server-side thread pre-creation route instead of SDK client.threads.create to avoid TamboProvider auth conflict"
  - "Created TeamScopedThreadArea inner component to call useTambo() inside TamboProvider for initThread access"

patterns-established:
  - "Server-side thread pre-creation: POST /api/tambo/threads with teamId, returns thread ID for client initThread()"
  - "Composite userKey pattern: userId:teamId for team threads, userId alone for personal workspace"

requirements-completed: [AI-06]

duration: 2min
completed: 2026-03-04
---

# Phase 6 Plan 4: Thread Isolation per Team Summary

**Server-side thread pre-creation with composite userKey (userId:teamId) for per-team thread isolation without touching TamboProvider auth**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T21:36:48Z
- **Completed:** 2026-03-04T21:39:05Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Created POST /api/tambo/threads route that authenticates via WorkOS and creates Tambo threads with composite userKey
- Thread history now filters by userKey so switching teams shows only that team's threads
- New thread button uses server-side pre-creation to tag threads with the correct userKey at creation time

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server-side thread pre-creation API and wire filtered thread list** - `d51e845` (feat)

## Files Created/Modified
- `src/app/api/tambo/threads/route.ts` - POST endpoint for server-side thread pre-creation with composite userKey
- `src/components/tambo/thread-history.tsx` - Added userKey prop to useTamboThreadList and onCreateThread callback
- `src/components/tambo/message-thread-full.tsx` - Forward userKey and onCreateThread props to ThreadHistory
- `src/app/app/app-shell.tsx` - Compute tamboUserKey, create TeamScopedThreadArea with handleCreateThread

## Decisions Made
- Used server-side thread pre-creation route instead of SDK client.threads.create to avoid TamboProvider auth conflict (userKey + userToken cannot coexist on TamboProvider)
- Created TeamScopedThreadArea inner component to call useTambo() inside TamboProvider scope for initThread access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Thread isolation is now functional per team
- Ready for UAT re-testing of thread isolation scenarios

---
*Phase: 06-team-scoped-ai-tools*
*Completed: 2026-03-04*
