---
phase: 03-workos-pipes-connections
plan: 01
subsystem: api
tags: [workos, pipes, oauth, github, linear, server-side-tokens]

# Dependency graph
requires:
  - phase: 01-workos-auth-migration
    provides: WorkOS AuthKit session, getWorkOS() singleton, withAuth() helper
provides:
  - Server-side GitHub token retrieval via WorkOS Pipes (withGitHubToken)
  - Server-side Linear token retrieval via WorkOS Pipes (withLinearClient)
  - Connection status API endpoint (GET /api/connections/status)
  - Server-side connection status in AppShell props
affects: [03-workos-pipes-connections, 04-workos-organizations]

# Tech tracking
tech-stack:
  added: ["@workos-inc/widgets ^1.9.0", "@radix-ui/themes ^3.3.0", "@tanstack/react-query ^5.90.21"]
  patterns: [pipes-getAccessToken-wrapper, server-side-connection-status]

key-files:
  created:
    - src/app/api/connections/status/route.ts
  modified:
    - src/lib/github-client.ts
    - src/lib/linear-client.ts
    - src/app/app/page.tsx
    - src/app/app/app-shell.tsx
    - src/app/globals.css
    - package.json

key-decisions:
  - "Kept withGitHubToken and withLinearClient wrapper signatures identical -- no API route changes needed"
  - "Used Pipes getAccessToken directly in each wrapper rather than a shared withPipesToken abstraction -- simpler and more readable"
  - "Removed linearClientFromRequest entirely -- only withLinearClient wrapper needed"
  - "Did not modify API route files -- wrapper signature compatibility means zero route changes"

patterns-established:
  - "Pipes token wrapper: withAuth -> getWorkOS().pipes.getAccessToken -> handler(token)"
  - "Connection status: Promise.all both providers with .catch fallback for not_installed"

requirements-completed: [CONN-07]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 3 Plan 01: WorkOS Pipes Server-Side Token Retrieval Summary

**Server-side GitHub and Linear token retrieval via WorkOS Pipes, replacing header-based token passing, with connection status API endpoint and AppShell integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T05:10:21Z
- **Completed:** 2026-03-04T05:13:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced header-based token extraction in withGitHubToken and withLinearClient with server-side WorkOS Pipes getAccessToken calls
- Created GET /api/connections/status endpoint returning per-provider connection status
- Server component (page.tsx) now queries connection status and passes it to AppShell
- All 7 existing API routes (2 GitHub + 5 Linear) continue working with zero modifications via unchanged wrapper signatures
- Installed @workos-inc/widgets, @radix-ui/themes, and @tanstack/react-query for Pipes widget support

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Pipes dependencies and add CSS imports** - `9905ef1` (chore)
2. **Task 2: Replace header-based token wrappers with Pipes server-side retrieval** - `4122b75` (feat)

## Files Created/Modified
- `package.json` - Added @workos-inc/widgets, @radix-ui/themes, @tanstack/react-query
- `src/app/globals.css` - Added Radix Themes and WorkOS Widgets CSS imports
- `src/lib/github-client.ts` - Rewrote withGitHubToken to use WorkOS Pipes getAccessToken
- `src/lib/linear-client.ts` - Rewrote withLinearClient to use WorkOS Pipes getAccessToken, removed linearClientFromRequest
- `src/app/api/connections/status/route.ts` - New endpoint returning {github, linear} connection status
- `src/app/app/page.tsx` - Added server-side connection status query, passes connectionStatus to AppShell
- `src/app/app/app-shell.tsx` - Added connectionStatus to Props interface and component destructure

## Decisions Made
- Kept wrapper signatures identical (withGitHubToken, withLinearClient) so no API route files needed changes
- Used Pipes getAccessToken directly in each wrapper rather than a shared withPipesToken abstraction for simplicity
- Removed linearClientFromRequest entirely since it is no longer needed with server-side tokens
- Did not use the connections database table for status checks -- relying on getAccessToken() directly (table becomes relevant in Phase 6)

## Deviations from Plan

### Auto-fixed Issues

**1. [Out of scope] ESLint config error from @radix-ui/themes**
- **Found during:** Task 1 (dependency installation)
- **Issue:** `npm run lint` fails with ConfigValidator error after @radix-ui/themes install. This is a pre-existing compatibility issue between @radix-ui/themes eslintConfig and the project's ESLint v9 flat config.
- **Action:** Logged to deferred-items.md. Not fixed as it is out of scope (pre-existing ESLint config issue, not caused by this task's changes).

---

**Total deviations:** 0 auto-fixed. 1 out-of-scope issue logged to deferred-items.md.
**Impact on plan:** No scope changes. Plan executed as written.

## Issues Encountered
None -- build succeeds, all type checks pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server-side token infrastructure is in place for Plans 03-02 (UI) and 03-03 (cleanup)
- Connection status is available both via API endpoint and server-side props
- Wrapper signatures are backward-compatible with all existing API routes

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 03-workos-pipes-connections*
*Completed: 2026-03-04*
