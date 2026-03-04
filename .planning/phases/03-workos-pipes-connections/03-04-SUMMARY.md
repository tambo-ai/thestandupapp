---
phase: 03-workos-pipes-connections
plan: 04
subsystem: connections
tags: [workos-pipes, polling, css-overflow, getAccessToken, organizationId]

# Dependency graph
requires:
  - phase: 03-workos-pipes-connections (plans 01-03)
    provides: Pipes OAuth widget, connection status API, withGitHubToken/withLinearClient wrappers
provides:
  - Polling-based connection status refresh with retry after modal close
  - CSS fix for Radix Inset overflow clipping Pipes dropdown menus
  - organizationId passed to all getAccessToken calls (required for org-scoped users)
affects: [phase-06-team-scoped-ai]

# Tech tracking
tech-stack:
  added: []
  patterns: [polling-with-backoff, useRef-for-stable-callbacks, organizationId-in-pipes-calls]

key-files:
  created: []
  modified:
    - src/app/app/app-shell.tsx
    - src/app/globals.css
    - src/app/api/connections/status/route.ts
    - src/app/app/page.tsx
    - src/lib/github-client.ts
    - src/lib/linear-client.ts

key-decisions:
  - "WorkOS Pipes getAccessToken requires organizationId when user belongs to an organization -- without it returns not_installed even after successful OAuth"
  - "Used polling with exponential-then-plateau backoff (500ms, 1s, 2s, 2s, 2s, 2s) for connection status refresh after modal close"
  - "Used CSS !important override on .rt-Inset to fix Radix Themes Inset overflow clipping of Pipes widget dropdown menus"

patterns-established:
  - "organizationId spread pattern: extract from withAuth, spread into Pipes calls with conditional inclusion"
  - "Polling with useRef snapshot: capture pre-poll state via ref for stable comparison without re-creating callbacks"

requirements-completed: [CONN-01, CONN-02, CONN-03, CONN-05]

# Metrics
duration: ~45min
completed: 2026-03-04
---

# Phase 3 Plan 4: UAT Gap Closure Summary

**Polling-based connection status refresh, CSS overflow fix for Pipes dropdown menus, and organizationId fix for getAccessToken returning not_installed**

## Performance

- **Duration:** ~45 min (includes checkpoint for manual UAT verification)
- **Started:** 2026-03-04T06:40:00Z
- **Completed:** 2026-03-04T07:22:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Connection status dots update from gray to green within 10 seconds of closing the Pipes modal after OAuth
- Three-dot disconnect menu in Pipes widget is visible and clickable (no longer clipped by Radix Inset overflow)
- Discovered and fixed root cause of getAccessToken returning `{ active: false, error: 'not_installed' }`: missing organizationId parameter when user belongs to a WorkOS Organization
- Both GitHub and Linear now return active tokens after connection

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix connection status refresh with polling/retry and CSS overflow** - `71c722b` (fix)
2. **Task 2: Add diagnostic logging to token retrieval endpoints** - `cc6cbb5` (fix)
3. **Task 3: Fix organizationId in getAccessToken calls** - `d6cfe64` (fix)

## Files Created/Modified
- `src/app/app/app-shell.tsx` - Added pollConnectionStatus with retry/backoff, useRef for stable state snapshot
- `src/app/globals.css` - CSS override for .rt-Inset overflow: visible
- `src/app/api/connections/status/route.ts` - Added organizationId extraction and pipeOpts helper
- `src/app/app/page.tsx` - Added organizationId to getAccessToken call
- `src/lib/github-client.ts` - Added organizationId to withGitHubToken getAccessToken call
- `src/lib/linear-client.ts` - Added organizationId to withLinearClient getAccessToken call

## Decisions Made
- **organizationId is required for Pipes getAccessToken when user belongs to an org**: Without it, WorkOS returns not_installed even after successful OAuth. This was the root cause of UAT test 10 failure.
- **Polling with exponential-then-plateau backoff**: 500ms, 1s, 2s, 2s, 2s, 2s -- gives WorkOS backend time to propagate connection state without excessive requests.
- **CSS !important override on .rt-Inset**: Radix Themes Inset component sets overflow: hidden which clips dropdown menus inside the Pipes widget. The override is scoped to the specific class.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing organizationId in all getAccessToken calls**
- **Found during:** Task 3 (checkpoint verification / UAT)
- **Issue:** WorkOS Pipes getAccessToken requires organizationId when the user belongs to an Organization. Without it, the API returns `{ active: false, error: 'not_installed' }` even after the user has successfully connected via the Pipes OAuth widget. This affected all four call sites: connections/status route, page.tsx, github-client.ts, and linear-client.ts.
- **Fix:** Extract organizationId from withAuth() return value and spread it conditionally into all getAccessToken calls using `...(organizationId ? { organizationId } : {})`.
- **Files modified:** src/app/api/connections/status/route.ts, src/app/app/page.tsx, src/lib/github-client.ts, src/lib/linear-client.ts
- **Verification:** User confirmed both GitHub and Linear return active: true with valid access tokens
- **Committed in:** d6cfe64

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The organizationId fix was the actual root cause of the not_installed error. The diagnostic logging (Task 2) served its purpose in investigation and was cleaned up in the same commit. No scope creep.

## Issues Encountered
- The plan anticipated that diagnostic logging would identify a WorkOS dashboard configuration issue. Instead, the logging helped identify a code-level issue (missing organizationId parameter). The fix was straightforward once identified.

## Next Phase Readiness
- Phase 3 (WorkOS Pipes Connections) is now fully complete -- all 4 plans executed
- All connection requirements (CONN-01 through CONN-08) are verified working
- Ready to proceed to Phase 4 (Team Formation) or Phase 6 (Team-Scoped AI Tools)
- Key learning for Phase 6: always include organizationId in Pipes API calls when operating in multi-tenant context

## Self-Check: PASSED

All 6 modified files verified on disk. All 3 task commits (71c722b, cc6cbb5, d6cfe64) verified in git history.

---
*Phase: 03-workos-pipes-connections*
*Completed: 2026-03-04*
