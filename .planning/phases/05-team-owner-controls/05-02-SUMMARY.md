---
phase: 05-team-owner-controls
plan: 02
subsystem: ui
tags: [react, members-tab, action-menus, inline-confirm, animate-out]

requires:
  - phase: 05-01
    provides: API routes for members DELETE, invitations GET/POST, leave POST
provides:
  - Interactive Members tab with member removal, invitation management, and leave team
  - Three-dot action menus for owner on non-owner members and pending invitations
  - Inline confirmation pattern with animate-out and refetch
  - Leave team button with last-owner guard
affects: [05-team-owner-controls]

tech-stack:
  added: []
  patterns: [inline-confirmation, animate-out-refetch, click-outside-menu-dismiss]

key-files:
  created: []
  modified:
    - src/components/team-settings-modal.tsx
    - src/app/app/app-shell.tsx

key-decisions:
  - "Combined relativeTime helper inline in modal file rather than extracting to utils -- keeps the component self-contained"
  - "Used summary line inside tab content (N members, N pending) instead of modifying tab label -- avoids prop-drilling complexity"
  - "Merged Task 2 code into Task 1 commit since both modify the same MembersTab in the same file"

patterns-established:
  - "Inline confirmation: row content swaps to confirm/cancel buttons, no nested modal"
  - "Animate-out: set removingId, wait 300ms with opacity-0 -translate-x-4 h-0, then refetch"
  - "Menu dismiss: useEffect with mousedown listener + Escape key + menuRef"

requirements-completed: [TEAM-06, TEAM-07, TEAM-08, TEAM-09]

duration: 2min
completed: 2026-03-05
---

# Phase 5 Plan 2: Members Tab Overhaul Summary

**Interactive Members tab with member removal, invitation management, three-dot action menus, inline confirmation, animate-out pattern, and leave team with last-owner guard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T00:41:39Z
- **Completed:** 2026-03-05T00:44:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rewrote MembersTab to fetch both members and pending invitations in parallel
- Added three-dot action menus: Remove for members, Resend/Revoke for email invitations, Copy link/Revoke for link invitations
- Inline confirmation for member removal with 300ms fade+slide animate-out
- Leave team button at bottom with last-owner error guard
- Pending invitation rows with silhouette avatar, Pending badge, and relative time display
- Click-outside and Escape key handling for dropdown menus
- Threaded userId prop from AppShell through to MembersTab

## Task Commits

Each task was committed atomically:

1. **Task 1: Add userId prop and rewrite MembersTab with pending invitations and action menus** - `3178b92` (feat)
2. **Task 2: Add relative time helper and verify full Members tab integration** - included in `3178b92` (code was part of Task 1 implementation)

## Files Created/Modified
- `src/components/team-settings-modal.tsx` - Extended Members tab with invitations, menus, inline confirm, leave button (789 lines)
- `src/app/app/app-shell.tsx` - Added userId prop to TeamSettingsModal usage

## Decisions Made
- Combined relativeTime helper inline in modal file rather than extracting to utils -- keeps the component self-contained
- Used summary line inside tab content ("N members, N pending") instead of modifying tab label -- avoids prop-drilling complexity
- Merged Task 2 code into Task 1 commit since both modify the same MembersTab in the same file

## Deviations from Plan

None - plan executed exactly as written. Task 2's relativeTime helper and verification items were implemented as part of Task 1 since they're in the same component.

## Issues Encountered
- ESLint has a pre-existing config error (unrelated to this plan) -- build with type checking passes successfully

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Members tab fully interactive for owners and members
- API routes from Plan 01 consumed successfully
- Ready for Plan 03 (if applicable) or phase completion

---
*Phase: 05-team-owner-controls*
*Completed: 2026-03-05*
