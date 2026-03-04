---
phase: 01-workos-auth-migration
plan: 01
subsystem: auth
tags: [workos, authkit, nextjs-middleware, oauth, server-actions]

# Dependency graph
requires: []
provides:
  - WorkOS authkitMiddleware protecting /app/* routes
  - OAuth callback handler at /api/auth/callback redirecting to /app
  - signOut server action with redirect to /
  - AuthKitProvider wrapping app in root layout
  - example.env.local with WorkOS environment variables
affects: [01-workos-auth-migration]

# Tech tracking
tech-stack:
  added: ["@workos-inc/authkit-nextjs"]
  patterns: ["authkitMiddleware with explicit route matchers", "server action wrapper for signOut", "AuthKitProvider in root layout"]

key-files:
  created: ["src/app/api/auth/callback/route.ts", "src/lib/auth-actions.ts"]
  modified: ["package.json", "package-lock.json", "src/middleware.ts", "src/app/layout.tsx", "example.env.local"]

key-decisions:
  - "Used explicit route matchers instead of catch-all regex to avoid breaking Tailwind CSS v4 static asset requests"
  - "Removed old Better Auth catch-all route [...all] as part of clean-break migration"

patterns-established:
  - "Explicit middleware matchers: list specific routes rather than regex catch-all to avoid intercepting static assets"
  - "Server action wrapper: signOut wrapped in 'use server' file because it is server-only and cannot be imported in client components"

requirements-completed: [AUTH-01, AUTH-02, AUTH-04]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 1 Plan 01: WorkOS Auth Infrastructure Summary

**WorkOS authkit-nextjs installed with middleware, callback route, signOut server action, and AuthKitProvider wrapping the app**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T01:43:54Z
- **Completed:** 2026-03-04T01:46:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Swapped better-auth for @workos-inc/authkit-nextjs in package.json
- Middleware protects /app/* routes, allows / and /api/auth/callback as unauthenticated
- OAuth callback route processes login and redirects to /app
- signOut server action wraps WorkOS signOut with redirect to /
- AuthKitProvider wraps the entire app in root layout
- example.env.local updated with WorkOS vars, all Better Auth vars removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Install WorkOS AuthKit and remove Better Auth dependency** - `6f0eb3e` (chore)
2. **Task 2: Create auth infrastructure files and update layout** - `e621f0f` (feat)

## Files Created/Modified
- `package.json` - Swapped better-auth for @workos-inc/authkit-nextjs
- `package-lock.json` - Updated lockfile for dependency swap
- `src/middleware.ts` - WorkOS authkitMiddleware with explicit route matchers
- `src/app/api/auth/callback/route.ts` - OAuth callback handler redirecting to /app
- `src/lib/auth-actions.ts` - Server action wrapping signOut with redirect to /
- `src/app/layout.tsx` - AuthKitProvider wrapping {children} in body
- `example.env.local` - WorkOS env vars replacing Better Auth vars

## Decisions Made
- Used explicit route matchers (`/`, `/app/:path*`, `/api/auth/callback`) instead of a catch-all regex to avoid intercepting Tailwind CSS v4 static asset requests (documented pitfall from research)
- Removed old Better Auth catch-all route `[...all]` as part of clean-break migration strategy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed old Better Auth catch-all route**
- **Found during:** Task 2 (Create auth infrastructure files)
- **Issue:** Old Better Auth `src/app/api/auth/[...all]/route.ts` catch-all route would conflict with the new callback route and still imported from `better-auth` (now uninstalled)
- **Fix:** Deleted `src/app/api/auth/[...all]/` directory and its route.ts
- **Files modified:** `src/app/api/auth/[...all]/route.ts` (deleted)
- **Verification:** New callback route created successfully at `src/app/api/auth/callback/route.ts`
- **Committed in:** e621f0f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to avoid route conflicts and broken imports. No scope creep.

## Issues Encountered
None

## User Setup Required

External services require manual configuration before the app can authenticate users:
- **WORKOS_CLIENT_ID**: From WorkOS Dashboard -> API Keys -> Client ID
- **WORKOS_API_KEY**: From WorkOS Dashboard -> API Keys -> Secret Key
- **WORKOS_COOKIE_PASSWORD**: Generate with `openssl rand -base64 32`
- **NEXT_PUBLIC_WORKOS_REDIRECT_URI**: Set to `http://localhost:3000/api/auth/callback`
- Add redirect URI `http://localhost:3000/api/auth/callback` in WorkOS Dashboard -> Redirects
- Enable Google OAuth in WorkOS Dashboard -> Authentication -> Auth Methods

## Next Phase Readiness
- Auth infrastructure is in place; Plan 02 will update page.tsx and user-header.tsx to remove remaining Better Auth imports
- Build will NOT pass until Plan 02 completes (expected: src/app/page.tsx and src/components/user-header.tsx still import from @/lib/auth-client)

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 01-workos-auth-migration*
*Completed: 2026-03-04*
