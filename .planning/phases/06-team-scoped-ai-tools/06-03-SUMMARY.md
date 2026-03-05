---
phase: 06-team-scoped-ai-tools
plan: 03
subsystem: ai
tags: [tambo, tools, scope, cross-member, aggregation, attribution]

requires:
  - phase: 06-team-scoped-ai-tools
    provides: Cross-member API routes with forUserId support (06-01) and contextHelpers with team_roster (06-02)
provides:
  - Scope-aware Tambo tools (listTeams, getTeamMembers, findGitHubUser, searchIssues, getPullRequests) with team aggregation
  - apiFetchForMembers helper for parallel cross-member API queries with error isolation
  - memberName attribution on all cross-team query results
affects: [07-live-standup]

tech-stack:
  added: []
  patterns:
    - "apiFetchForMembers pattern: parallel fetch with forUserId per member, Promise.allSettled for error isolation"
    - "Scope parameter pattern: tools accept scope='personal'|'team' with memberIds from team_roster context"
    - "Attribution pattern: team-scope results include memberName on each item, personal scope omits it"

key-files:
  created: []
  modified:
    - src/lib/tambo.ts
    - src/app/app/app-shell.tsx

key-decisions:
  - "Merged Task 1 and Task 2 into single commit since tool modifications, schemas, and descriptions are inseparable"
  - "Used Array<{id, name}> for memberIds so names are always available in aggregated output without extra lookup"
  - "listTeams and getTeamMembers use visibleTo array for attribution (dedup pattern) while searchIssues and getPullRequests use memberName per item (flat results pattern)"
  - "Added getPullRequests as explicit tool replacing implicit getMyPRs system prompt reference"

patterns-established:
  - "apiFetchForMembers: never throws, returns { results, errors } for partial failure handling"
  - "Scope-aware tool pattern: scope + memberIds in inputSchema, team_roster provides member data"

requirements-completed: [AI-03, AI-04]

duration: 3min
completed: 2026-03-05
---

# Phase 06 Plan 03: Scope-Aware Tool Aggregation Summary

**All Tambo tools gain scope parameter for cross-team queries with parallel member aggregation, per-item attribution, and graceful partial failure handling via apiFetchForMembers helper**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T02:39:29Z
- **Completed:** 2026-03-05T02:42:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created apiFetchForMembers helper that queries API routes for multiple team members in parallel using Promise.allSettled, capturing per-member errors without blocking other results
- All 5 tools (listTeams, getTeamMembers, findGitHubUser, searchIssues, getPullRequests) accept scope and memberIds parameters
- Team-scope results include attribution (memberName or visibleTo) on each item
- Added getPullRequests tool for explicit PR fetching with team support (replaces getMyPRs prompt reference)
- Updated component descriptions to guide AI toward SummaryPanel for cross-team aggregated views
- Updated system prompt to reference all scope-aware tools and team_roster usage

## Task Commits

Each task was committed atomically:

1. **Task 1: Add team-aware aggregation helper and scope parameter to tools** - `3d9957b` (feat)
2. **Task 2: Update component descriptions and system prompt tool references** - completed within Task 1 commit (tightly coupled changes)

## Files Created/Modified
- `src/lib/tambo.ts` - Added apiFetchForMembers helper, scope/memberIds to all tools, getPullRequests tool, updated component descriptions
- `src/app/app/app-shell.tsx` - Updated system prompt tool references from getMyPRs to getPullRequests, added scope instructions

## Decisions Made
- Merged Task 1 and Task 2 into a single commit because tool modifications, output schemas, and descriptions are inseparable -- modifying a tool's behavior requires updating its schema and description simultaneously
- Used `Array<{id, name}>` for memberIds parameter so member names are always available in aggregated output without requiring a separate lookup
- Used different attribution patterns per tool type: `visibleTo` array for deduplication-based tools (listTeams, getTeamMembers) vs `memberName` per item for flat result tools (searchIssues, getPullRequests)
- Created explicit getPullRequests tool instead of relying on implicit getMyPRs reference in system prompt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated system prompt getMyPRs reference to getPullRequests**
- **Found during:** Task 1
- **Issue:** System prompt in app-shell.tsx referenced getMyPRs which no longer exists as a tool name
- **Fix:** Updated both references in buildSystemPrompt to use getPullRequests and added scope instructions
- **Files modified:** src/app/app/app-shell.tsx
- **Verification:** Build passes
- **Committed in:** 3d9957b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to keep system prompt aligned with actual tool names. No scope creep.

## Issues Encountered
- ESLint has pre-existing config error (noted in 06-02-SUMMARY) -- lint command fails but build succeeds. Not caused by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All tools are scope-aware and ready for team-wide queries
- AI has full context via team_roster contextHelper and updated system prompt
- Phase 6 complete -- ready for Phase 7 (live standup)

---
*Phase: 06-team-scoped-ai-tools*
*Completed: 2026-03-05*

## Self-Check: PASSED
