---
phase: 01-workos-auth-migration
plan: 02
subsystem: auth
tags: [workos, authkit, nextjs, server-components, route-restructure, better-auth-removal]

# Dependency graph
requires:
  - phase: 01-workos-auth-migration/01
    provides: WorkOS authkitMiddleware, callback route, signOut server action, AuthKitProvider
provides:
  - Public landing page at / with conditional sign-in/go-to-app button
  - Protected /app route with server-side user data via withAuth
  - Props-based UserHeader with logout server action
  - Complete removal of all Better Auth code and database tables
affects: [02-multi-tenant-db-schema]

# Tech tracking
tech-stack:
  added: []
  patterns: ["server component with withAuth for public pages", "ensureSignedIn for protected routes", "server-to-client prop passing for user data", "form action for logout"]

key-files:
  created: ["src/app/app/page.tsx", "src/app/app/app-shell.tsx", "scripts/drop-better-auth-tables.ts"]
  modified: ["src/app/page.tsx", "src/components/user-header.tsx", "src/middleware.ts", "src/lib/auth-actions.ts"]

key-decisions:
  - "Simplified signOut() to use no arguments -- logout redirect URL configured in WorkOS dashboard instead of code"
  - "Added /workos/logout to middleware matcher to allow WorkOS logout redirect to pass through"

patterns-established:
  - "Server component data fetching: protected routes use withAuth({ ensureSignedIn: true }) then pass user data as props to client components"
  - "Public page auth check: use withAuth() without ensureSignedIn, conditionally render based on user presence"
  - "Logout via form action: UserHeader uses <form action={logout}> instead of onClick handler for server action compatibility"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: ~15min
completed: 2026-03-04
---

# Phase 1 Plan 02: Route Restructure and Better Auth Removal Summary

**Landing page at / with conditional auth button, protected /app route with server-side user data, props-based UserHeader with logout, and complete Better Auth removal including DB tables**

## Performance

- **Duration:** ~15 min (across checkpoint)
- **Started:** 2026-03-04T01:50:00Z
- **Completed:** 2026-03-04T02:15:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Restructured routes: / is now a public landing page with branded UI and conditional sign-in/go-to-app button
- /app is a protected server component route that fetches user via withAuth and passes data to AppShell client component
- UserHeader accepts user data as props and uses form-based logout via server action
- All Better Auth files deleted (auth.ts, auth-client.ts, login/page.tsx, api/auth/[...all])
- Better Auth database tables dropped via one-time migration script
- Zero Better Auth references remain in src/
- Full end-to-end auth flow verified: sign in, session persistence, route protection, logout with redirect

## Task Commits

Each task was committed atomically:

1. **Task 1: Create landing page, /app route, and extract AppShell** - `3eca086` (feat)
2. **Task 2: Update UserHeader, delete Better Auth files, drop DB tables** - `64b5b86` (feat)
3. **Task 3: Verify complete auth flow end-to-end** - `469a9cf` (fix)

## Files Created/Modified
- `src/app/page.tsx` - Public landing page server component with conditional auth button (withAuth without ensureSignedIn)
- `src/app/app/page.tsx` - Protected /app server component fetching user via withAuth({ ensureSignedIn: true })
- `src/app/app/app-shell.tsx` - Client component extracted from old page.tsx, receives user data as props
- `src/components/user-header.tsx` - Props-based user display with form action logout
- `src/middleware.ts` - Added /workos/logout to matcher for logout redirect
- `src/lib/auth-actions.ts` - Simplified to plain signOut() (redirect configured in WorkOS dashboard)
- `src/lib/auth.ts` - Deleted (Better Auth server config)
- `src/lib/auth-client.ts` - Deleted (Better Auth client)
- `src/app/login/page.tsx` - Deleted (content moved to landing page)
- `scripts/drop-better-auth-tables.ts` - One-time migration script for dropping Better Auth DB tables

## Decisions Made
- Simplified signOut() to use no arguments -- the logout redirect URL is configured in the WorkOS dashboard rather than passed as a code parameter. This avoids issues with returnTo URL validation.
- Added /workos/logout to the middleware matcher so the WorkOS logout redirect flow can complete without being intercepted by authkitMiddleware.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed middleware matcher missing /workos/logout**
- **Found during:** Task 3 (end-to-end verification)
- **Issue:** Logout redirect from WorkOS was being intercepted by authkitMiddleware because /workos/logout was not in the matcher list
- **Fix:** Added '/workos/logout' to the middleware config matcher array
- **Files modified:** src/middleware.ts
- **Verification:** Logout flow completes successfully, user redirected to landing page
- **Committed in:** 469a9cf (Task 3 commit)

**2. [Rule 1 - Bug] Simplified signOut to remove returnTo parameter**
- **Found during:** Task 3 (end-to-end verification)
- **Issue:** signOut({ returnTo: "/" }) was not working correctly with WorkOS dashboard configuration
- **Fix:** Changed to plain signOut() and configured redirect URL in WorkOS dashboard instead
- **Files modified:** src/lib/auth-actions.ts
- **Verification:** Logout completes and redirects to landing page as expected
- **Committed in:** 469a9cf (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were necessary for the logout flow to work correctly. No scope creep.

## Issues Encountered
None beyond the two auto-fixed bugs above.

## User Setup Required

None beyond what was already required by Plan 01 (WorkOS environment variables). The logout redirect URL should be configured in the WorkOS dashboard under "Redirects" settings.

## Next Phase Readiness
- WorkOS auth migration is fully complete -- all Better Auth code removed, auth flow working end-to-end
- Phase 2 (Multi-Tenant DB Schema) can proceed; the WorkOS user ID (from withAuth) is available as the primary user identifier
- The /app route's server component pattern (withAuth + props) establishes the pattern for adding team context in Phase 2

## Self-Check: PASSED

All files verified present. All deleted files confirmed absent. All 3 task commits verified in git log.

---
*Phase: 01-workos-auth-migration*
*Completed: 2026-03-04*
