---
phase: 03-workos-pipes-connections
plan: 03
subsystem: auth
tags: [fetch, token-removal, cleanup, localStorage]

# Dependency graph
requires:
  - phase: 03-workos-pipes-connections/03-01
    provides: Server-side token retrieval via WorkOS Pipes (withGitHubToken, withLinearClient)
provides:
  - Zero client-side token management — all fetches are plain fetch()
  - user-tokens.ts and settings-modal.tsx fully removed from codebase
affects: [04-linear-data-layer, 05-github-data-layer]

# Tech tracking
tech-stack:
  added: []
  patterns: [plain-fetch-client-side, server-cookie-auth]

key-files:
  created: []
  modified:
    - src/lib/tambo.ts
    - src/lib/use-fetch-json.ts
    - src/lib/member-filter.ts
    - src/components/user-header.tsx
    - src/components/connections-modal.tsx

key-decisions:
  - "Removed settings gear button and needsSetup banner from UserHeader since SettingsModal no longer exists"
  - "Stubbed resolveFilteredMemberNames and useFilteredMemberIds to return null rather than deleting them, for API compatibility with parallel Plan 03-02"
  - "Fixed pre-existing connections-modal.tsx type assertion for getAccessToken (Rule 3 - blocking build)"

patterns-established:
  - "Plain fetch pattern: Client-side code uses fetch(url) without headers; server handles auth via session cookies"

requirements-completed: [CONN-08]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 3 Plan 03: Delete Old Token System Summary

**Removed client-side encrypted token storage (user-tokens.ts) and settings modal, simplified all fetch calls to plain fetch with server-side cookie auth**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T05:16:20Z
- **Completed:** 2026-03-04T05:18:52Z
- **Tasks:** 2
- **Files modified:** 7 (2 deleted, 5 modified)

## Accomplishments
- Deleted user-tokens.ts (156 lines of encrypted localStorage token management) and settings-modal.tsx (414 lines of manual token entry UI)
- Simplified apiFetch, useFetchJSON, and fetchTeamMembers to plain fetch without token headers
- Removed all references to the old token system from the entire codebase (zero grep matches)
- Build passes cleanly with no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete user-tokens.ts and settings-modal.tsx** - `3f285bd` (chore)
2. **Task 2: Remove all getTokenHeaders imports and simplify to plain fetch** - `5b718e0` (feat)

## Files Created/Modified
- `src/lib/user-tokens.ts` - DELETED (encrypted localStorage token system)
- `src/components/settings-modal.tsx` - DELETED (manual token entry UI with team selector)
- `src/lib/tambo.ts` - Removed getTokenHeaders import, simplified apiFetch to plain fetch
- `src/lib/use-fetch-json.ts` - Removed getTokenHeaders import, simplified to plain fetch
- `src/lib/member-filter.ts` - Removed user-tokens imports, simplified fetchTeamMembers, stubbed filter functions
- `src/components/user-header.tsx` - Removed SettingsModal and token-check logic, kept user display and logout
- `src/components/connections-modal.tsx` - Fixed type assertion for getAccessToken (pre-existing issue)

## Decisions Made
- Removed settings gear button and needsSetup banner from UserHeader since SettingsModal no longer exists — the new ConnectionsModal (from Plan 03-02) replaces this functionality
- Stubbed resolveFilteredMemberNames and useFilteredMemberIds to return null rather than deleting them, preserving API compatibility for callers being cleaned up in parallel Plan 03-02
- Fixed connections-modal.tsx type assertion as a blocking build issue (Rule 3)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed user-header.tsx imports from deleted modules**
- **Found during:** Task 2 (removing getTokenHeaders imports)
- **Issue:** user-header.tsx imported from both user-tokens.ts and settings-modal.tsx, which were not listed in the plan's files_modified
- **Fix:** Removed imports, SettingsModal usage, and needsSetup token-check logic; kept user display and logout
- **Files modified:** src/components/user-header.tsx
- **Verification:** grep finds zero references to deleted modules
- **Committed in:** 5b718e0 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed connections-modal.tsx type error preventing build**
- **Found during:** Task 2 (build verification)
- **Issue:** Pre-existing type mismatch between getAccessToken (returns Promise<string | undefined>) and Pipes authToken prop (expects Promise<string>)
- **Fix:** Added type assertion: `getAccessToken as () => Promise<string>`
- **Files modified:** src/components/connections-modal.tsx
- **Verification:** npm run build succeeds
- **Committed in:** 5b718e0 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for build to pass. No scope creep.

## Issues Encountered
- ESLint config has a pre-existing error (eslintrc config-validator crash) unrelated to our changes. Build verification used `npm run build` which passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All client-side code now uses plain fetch — server handles auth via session cookies
- CONN-08 (old token system removal) is complete
- Ready for Phase 4 (Linear data layer) and Phase 5 (GitHub data layer) which consume these simplified fetch patterns

---
*Phase: 03-workos-pipes-connections*
*Completed: 2026-03-04*
