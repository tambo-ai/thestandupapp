---
phase: 05-team-owner-controls
plan: 03
subsystem: ui
tags: [react, auto-save, inline-edit, danger-zone, toast-notification, middleware-cookie]

requires:
  - phase: 05-01
    provides: API routes for update PATCH, delete POST, leave POST
  - phase: 05-02
    provides: Members tab with leave button, inline confirmation pattern
provides:
  - Editable General tab with auto-save name/slug on blur for owners
  - Delete team danger zone with name confirmation (GitHub-style)
  - Leave team button on General tab (in addition to Members tab)
  - Removed-member toast notification via middleware cookie
affects: [05-team-owner-controls]

tech-stack:
  added: []
  patterns: [auto-save-on-blur, middleware-cookie-notification, 403-redirect-pattern]

key-files:
  created: []
  modified:
    - src/components/team-settings-modal.tsx
    - src/middleware.ts
    - src/app/app/app-shell.tsx

key-decisions:
  - "Auto-derive slug from name changes unless user has manually customized the slug field"
  - "Used middleware cookie (httpOnly: false, 60s maxAge) for removed-member notification -- client-side readable, auto-expires"
  - "All modal fetch calls handle 403 with redirect to /app for consistent removal detection"

patterns-established:
  - "Auto-save on blur: save field value when input loses focus, show brief saved indicator"
  - "Danger zone pattern: red-bordered section with name-confirmation input before destructive action"
  - "Middleware notification cookie: set short-lived cookie in middleware, read and clear in client component"

requirements-completed: [TEAM-06, TEAM-07]

duration: 2min
completed: 2026-03-05
---

# Phase 5 Plan 3: General Tab Editing and Removal Toast Summary

**Editable General tab with auto-save name/slug on blur, delete team danger zone with name confirmation, and removed-member toast notification via middleware cookie**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T00:46:19Z
- **Completed:** 2026-03-05T00:49:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Owners see editable name and slug inputs on General tab with auto-save on blur and green check saved indicator
- Slug auto-derives from name unless manually customized, with uniqueness error handling (409 reverts and shows inline error)
- Delete team danger zone at bottom of General tab requires typing team name to confirm (GitHub-style)
- Leave team button on General tab with inline confirmation (matches Members tab pattern)
- Members see read-only static text on General tab
- Middleware detects removed members and sets a notification cookie before clearing active_team_id
- AppShell reads cookie on mount, shows "You were removed from {teamName}" toast, auto-dismisses after 5 seconds
- All modal fetch calls handle 403 with redirect to /app

## Task Commits

Each task was committed atomically:

1. **Task 1: Editable General tab with auto-save, delete zone, and leave button** - `aa59c3c` (feat)
2. **Task 2: Removed-member toast notification via middleware cookie** - `692d50c` (feat)

## Files Created/Modified
- `src/components/team-settings-modal.tsx` - Rewrote GeneralTab with owner editable view (auto-save, delete zone, leave button) and member read-only view
- `src/middleware.ts` - Added removed_from_team cookie when clearing invalid active_team_id for non-personal teams
- `src/app/app/app-shell.tsx` - Added toast state, cookie detection on mount, and fixed-position toast notification

## Decisions Made
- Auto-derive slug from name changes unless user has manually customized the slug field
- Used middleware cookie (httpOnly: false, 60s maxAge) for removed-member notification -- client-side readable, auto-expires
- All modal fetch calls handle 403 with redirect to /app for consistent removal detection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added 403 redirect handling to Members tab refetchAll**
- **Found during:** Task 2 (Part C - 403 redirect handling)
- **Issue:** Members tab refetchAll lacked 403 status check
- **Fix:** Added 403 check to refetchAll that redirects to /app
- **Files modified:** src/components/team-settings-modal.tsx
- **Committed in:** 692d50c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for consistent removal detection. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 05 (Team Owner Controls) is now complete
- All team management UI is functional: invite, members, general settings, delete, leave
- Ready for Phase 06 (if applicable)

---
*Phase: 05-team-owner-controls*
*Completed: 2026-03-05*
