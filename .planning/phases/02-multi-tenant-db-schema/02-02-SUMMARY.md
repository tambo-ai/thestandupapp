---
phase: 02-multi-tenant-db-schema
plan: 02
subsystem: database
tags: [kysely, turso, workos, auth-callback, middleware, team-cookie, multi-tenant, upsert]

# Dependency graph
requires:
  - phase: 02-multi-tenant-db-schema
    provides: Schema types, dual database accessor (db + teamDb), migration files
  - phase: 01-workos-auth-migration
    provides: WorkOS AuthKit middleware and handleAuth callback
provides:
  - User upsert on login via handleAuth onSuccess hook
  - Personal team auto-creation on first login
  - Middleware-based user profile sync with 5-minute staleness check
  - Self-healing middleware that recreates missing personal teams
  - Auto-sync of personal team name when WorkOS profile changes
  - active_team_id HttpOnly cookie management
  - setActiveTeam server action with membership verification
  - Verification tests proving tenant scoping and upsert correctness
affects: [03-workos-pipes, 04-team-formation, 05-team-owner-controls, 06-team-scoped-ai]

# Tech tracking
tech-stack:
  added: []
  patterns: [user-upsert-on-conflict, middleware-staleness-check, cookie-team-context, self-healing-personal-team]

key-files:
  created:
    - src/lib/team-actions.ts
    - tests/test-team-scope.ts
    - tests/test-user-upsert.ts
  modified:
    - src/app/api/auth/callback/route.ts
    - src/middleware.ts
    - src/app/app/page.tsx
    - src/app/app/app-shell.tsx

key-decisions:
  - "Used authkit function instead of authkitMiddleware wrapper to get session data in middleware -- authkitMiddleware does not expose session to custom middleware logic"
  - "Used getSessionFromCookie (internal) via authkit() which returns {session, headers} for middleware-level session access"
  - "Tests require --env-file=.env.local flag since tsx does not auto-load .env.local like Next.js does"

patterns-established:
  - "User upsert pattern: INSERT ... ON CONFLICT(id) DO UPDATE SET with eb.ref('excluded.*') for conflict resolution"
  - "Middleware staleness check: query last_synced_at, only write if older than 5 minutes"
  - "Self-healing: if user exists but personal team missing, recreate team + membership in transaction"
  - "Team cookie pattern: HttpOnly, SameSite=Lax, path=/, Secure in prod, 30-day maxAge"
  - "Test scripts use __test_ prefix for IDs and clean up after themselves"

requirements-completed: [DATA-02, DATA-03]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 2 Plan 02: Auth-DB Integration Summary

**User upsert on login with personal team auto-creation, middleware staleness-based sync with self-healing, HttpOnly team cookie management, and verification tests proving tenant isolation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T03:19:16Z
- **Completed:** 2026-03-04T03:24:29Z
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 4

## Accomplishments
- Auth callback upserts user record with WorkOS ID as primary key and creates personal team on first login
- Middleware syncs user profile only when stale (> 5 min), self-heals missing personal team, validates active_team_id cookie
- team-actions.ts provides setActiveTeam server action with membership verification
- Verification tests prove teamDb scopes SELECT/UPDATE/DELETE by team_id and user upsert handles conflicts correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend auth callback, middleware, team cookie, page** - `a26a041` (feat)
2. **Task 2: Create verification tests** - `1bd9fdc` (test)

## Files Created/Modified
- `src/app/api/auth/callback/route.ts` - Extended with onSuccess hook for user upsert and personal team creation
- `src/middleware.ts` - Extended with user sync staleness check, self-healing, cookie validation, auto-select
- `src/lib/team-actions.ts` - Server action for setting active team cookie with membership verification
- `src/app/app/page.tsx` - Reads active_team_id cookie and passes to AppShell
- `src/app/app/app-shell.tsx` - Accepts activeTeamId prop
- `tests/test-team-scope.ts` - Proves teamDb scopes SELECT, UPDATE, DELETE by team_id
- `tests/test-user-upsert.ts` - Proves user upsert uses WorkOS user ID as primary key

## Decisions Made
- Used `authkit()` instead of wrapping `authkitMiddleware` because `authkitMiddleware` does not expose session data to custom middleware logic. The `authkit()` function returns `{ session, headers }` which allows the middleware to access the authenticated user for sync operations.
- Test scripts require `npx tsx --env-file=.env.local` to load Turso credentials since tsx does not auto-load `.env.local` like Next.js does.
- Used `getFullDb()` for cross-table joins (teams + memberships) in both auth callback and middleware, consistent with Plan 01's established pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing .selectAll() in test queries**
- **Found during:** Task 2 (Verification tests)
- **Issue:** Kysely `selectFrom().where().executeTakeFirst()` without a `.select()` clause generates invalid SQL (`SELECT FROM table`)
- **Fix:** Added `.selectAll()` to queries that were missing a select clause
- **Files modified:** tests/test-user-upsert.ts
- **Verification:** Both tests pass successfully
- **Committed in:** 1bd9fdc (Task 2 commit)

**2. [Rule 3 - Blocking] Replaced authkitMiddleware with authkit function**
- **Found during:** Task 1 (Middleware extension)
- **Issue:** `getSessionFromCookie` is not exported from `@workos-inc/authkit-nextjs` public API; `authkitMiddleware` does not expose session data
- **Fix:** Used exported `authkit()` function which returns `{ session, headers }`, then manually handled unauthenticated redirect logic
- **Files modified:** src/middleware.ts
- **Verification:** npm run build succeeds, middleware correctly wraps authkit session
- **Committed in:** a26a041 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - Turso database credentials already configured in .env.local from Phase 2 Plan 01.

## Next Phase Readiness
- Phase 2 complete: all schema, auth integration, and verification in place
- Ready for Phase 3 (WorkOS Pipes) -- connections table exists, user records keyed on WorkOS ID
- Ready for Phase 4 (Team Formation) -- team creation, membership, and cookie patterns established
- Team switcher UI deferred to Phase 4 as planned

## Self-Check: PASSED

All 7 files verified present. Both task commit hashes verified in git log.

---
*Phase: 02-multi-tenant-db-schema*
*Completed: 2026-03-04*
