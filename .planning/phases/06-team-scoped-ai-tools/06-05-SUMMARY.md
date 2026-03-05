---
phase: 06-team-scoped-ai-tools
plan: 05
subsystem: ai
tags: [tambo, zod, tool-descriptions, partial-errors, ux]

requires:
  - phase: 06-team-scoped-ai-tools
    provides: scope-aware tool aggregation with cross-member attribution (06-03)
provides:
  - Partial-error handling guidance in AI tool descriptions for getPullRequests and searchIssues
  - .describe() annotations on outputSchema errors fields with partial-success semantics
affects: [07-live-standup-generation]

tech-stack:
  added: []
  patterns: [tool-description-driven AI behavior, outputSchema .describe() for semantic guidance]

key-files:
  created: []
  modified: [src/lib/tambo.ts]

key-decisions:
  - "Description-only changes to tool definitions — no logic or schema shape modifications needed"

patterns-established:
  - "Partial-error guidance pattern: tool descriptions and outputSchema .describe() instruct AI to present partial results alongside error notes"

requirements-completed: [AI-03, AI-04]

duration: 1min
completed: 2026-03-05
---

# Phase 6 Plan 05: Partial Error Handling in AI Tool Descriptions Summary

**Added partial-error handling guidance to getPullRequests and searchIssues tool descriptions and outputSchema errors fields so AI presents successful results alongside per-member error notes**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-05T03:16:42Z
- **Completed:** 2026-03-05T03:17:48Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- getPullRequests and searchIssues tool descriptions now instruct AI to present partial results when some members have errors
- Both outputSchema errors fields have .describe() with explicit partial-success semantics
- AI will no longer treat a single member's unauthorized error as a blanket failure for the entire team query

## Task Commits

Each task was committed atomically:

1. **Task 1: Add partial-success guidance to tool descriptions and outputSchema errors fields** - `9450aa0` (feat)

## Files Created/Modified
- `src/lib/tambo.ts` - Updated getPullRequests and searchIssues tool descriptions and outputSchema errors .describe() with partial-error handling guidance

## Decisions Made
- Description-only changes to tool definitions -- no logic or schema shape modifications needed since the underlying code (Promise.allSettled, error arrays) already works correctly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT test 7 scenario (team PR query with disconnected member) should now produce partial results with error notes
- All gap closure plans for phase 6 complete

---
*Phase: 06-team-scoped-ai-tools*
*Completed: 2026-03-05*

## Self-Check: PASSED
