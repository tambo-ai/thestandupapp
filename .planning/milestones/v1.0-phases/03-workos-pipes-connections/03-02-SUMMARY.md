---
phase: 03-workos-pipes-connections
plan: 02
subsystem: ui
tags: [workos, pipes, widgets, react, modal, oauth, status-dots, onboarding]

# Dependency graph
requires:
  - phase: 03-workos-pipes-connections
    provides: Server-side Pipes token retrieval, connection status API, AppShell connectionStatus prop
provides:
  - Connections modal with embedded WorkOS Pipes OAuth widget
  - Status dots in UserHeader showing per-provider connection state
  - First-use onboarding prompt for users with no connections
  - Connection status refresh on modal close
affects: [03-workos-pipes-connections, 04-workos-organizations]

# Tech tracking
tech-stack:
  added: []
  patterns: [pipes-widget-modal, connection-status-dots, onboarding-prompt-auto-hide]

key-files:
  created:
    - src/components/connections-modal.tsx
    - src/components/connection-prompt.tsx
  modified:
    - src/components/user-header.tsx
    - src/app/app/app-shell.tsx

key-decisions:
  - "Used title attribute for dot tooltips instead of Radix tooltip component -- simpler, avoids extra CSS/component overhead"
  - "Pipes widget handles all connect/disconnect/reauth UI natively -- no custom provider cards needed"
  - "Removed filteredMemberNames from system prompt since member filter UI was deleted with old settings modal"
  - "ConnectionsModal placed inside TamboProvider but uses createPortal -- no z-index conflicts"

patterns-established:
  - "Connections modal pattern: WorkOsWidgets wrapper > Pipes component with getAccessToken"
  - "Status dot colors: green (#22C55E) = connected, gray (#DDD) = not connected, amber (#F59E0B) = needs_reauthorization"
  - "Connection refresh pattern: fetch /api/connections/status after modal close, update state"

requirements-completed: [CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 3 Plan 02: Connections UI Summary

**Connections modal with embedded WorkOS Pipes widget, status dots in UserHeader, and first-use onboarding prompt for unconnected users**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T05:16:33Z
- **Completed:** 2026-03-04T05:20:34Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created connections modal with embedded Pipes widget handling all OAuth connect/disconnect/reauth flows
- Added colored status dots to UserHeader (green = connected, gray = not connected, amber = needs reauth) with tooltip labels
- Created first-use onboarding prompt that auto-disappears when at least one account is connected
- Wired modal open/close state and connection status refresh into AppShell
- Removed filteredMemberNames and resolveFilteredMemberNames from AppShell (tied to deleted member filter UI)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create connections modal with Pipes widget and connection prompt** - `5a6a375` (feat)
2. **Task 2: Update UserHeader with status dots and wire AppShell** - `3d2490a` (feat)

## Files Created/Modified
- `src/components/connections-modal.tsx` - New: Connections modal with embedded WorkOS Pipes widget, createPortal pattern, escape key + click-outside-to-close
- `src/components/connection-prompt.tsx` - New: Inline onboarding prompt with "Connect accounts" button
- `src/components/user-header.tsx` - Rewritten: Status dots, removed all user-tokens imports, props-based connection status and modal trigger
- `src/app/app/app-shell.tsx` - Updated: Modal state management, connection status state with refresh, ConnectionPrompt conditional render, removed filteredMemberNames

## Decisions Made
- Used `title` attribute for dot tooltips instead of `@radix-ui/react-tooltip` -- simpler, avoids extra CSS/component overhead, plan's code examples showed this approach
- Pipes widget handles all connect/disconnect/reauth UI natively -- no custom per-provider cards needed, the widget IS the card UI
- Removed `filteredMemberNames` from `buildSystemPrompt` since the member filter feature was tied to the old settings modal's team selector and member checkboxes, which are being removed
- Placed `ConnectionsModal` inside `TamboProvider` since it uses `createPortal` to render at document.body level anyway

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] user-tokens.ts already deleted by prior commit**
- **Found during:** Task 1 (build verification)
- **Issue:** Build failed because `member-filter.ts` imports from `user-tokens.ts` which was deleted in a prior commit (`3f285bd chore(03-03): delete client-side token storage and old settings modal`). The `user-header.tsx` was also already simplified in commit `5b718e0`.
- **Fix:** No fix needed -- Task 2's changes to app-shell.tsx removed the `resolveFilteredMemberNames` import from `member-filter.ts`, which was the only import path pulling `user-tokens.ts` into the build. The prior commits had already applied some of the cleanup planned for 03-02/03-03.
- **Files modified:** src/app/app/app-shell.tsx (removed import)
- **Verification:** `npm run build` succeeds after Task 2
- **Committed in:** `3d2490a` (Task 2 commit)

### Disconnect UX Deviation Note

The plan flagged that the user's locked decision requires "Disconnect requires inline confirmation within the card ('Are you sure? [Yes] [Cancel]' replaces the Disconnect button)." The Pipes widget handles disconnect internally. Since the widget is a third-party component from WorkOS, its disconnect UX is controlled by the widget -- we cannot customize it to add inline confirmation without building custom UI outside the widget. **This should be verified during manual testing.** If the widget's native disconnect flow does not provide inline confirmation (e.g., it disconnects immediately on click), this is a deviation from the user's locked decision that needs user review.

---

**Total deviations:** 1 auto-fixed (blocking). 1 flagged deviation for user review (disconnect UX).
**Impact on plan:** Auto-fix was necessary because prior commits had already deleted user-tokens.ts. No scope creep. Disconnect UX deviation is widget-level and cannot be changed without abandoning the Pipes widget.

## Issues Encountered
None -- build succeeds after all changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Connections UI is fully integrated -- modal, status dots, onboarding prompt all wired
- Plan 03-03 (cleanup) can delete remaining old files and remove getTokenHeaders from remaining call sites
- Manual testing needed: verify Pipes widget OAuth flow, disconnect UX behavior, status dot updates

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 03-workos-pipes-connections*
*Completed: 2026-03-04*
