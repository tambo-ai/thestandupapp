---
phase: 02-multi-tenant-db-schema
plan: 01
subsystem: database
tags: [kysely, turso, libsql, multi-tenant, migrations, sqlite]

# Dependency graph
requires:
  - phase: 01-workos-auth-migration
    provides: WorkOS AuthKit session and middleware foundation
provides:
  - TypeScript schema types for all 5 tables (users, teams, memberships, connections, invite_links)
  - Dual database accessor pattern (db for global, teamDb for tenant-scoped queries)
  - FullDatabase type for bootstrap transactions
  - 5 versioned migration files with foreign keys and constraints
  - Migration runner script (scripts/migrate.ts)
  - Schema verification script (scripts/verify-schema.ts)
affects: [02-02, 03-workos-pipes, 04-team-formation, 05-team-owner-controls]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-database-accessor, team-scoped-where-injection, kysely-file-migration-provider]

key-files:
  created:
    - src/lib/schema.ts
    - src/lib/db.ts
    - migrations/001_create_users.ts
    - migrations/002_create_teams.ts
    - migrations/003_create_memberships.ts
    - migrations/004_create_connections.ts
    - migrations/005_create_invite_links.ts
    - scripts/migrate.ts
    - scripts/verify-schema.ts
  modified: []

key-decisions:
  - "Used as-any cast on Kysely .where() call in teamDb to resolve TypeScript union type incompatibility with generic table parameter"
  - "Used __dirname instead of import.meta.dirname in scripts since tsx transpiles to CJS where import.meta.dirname is undefined"

patterns-established:
  - "Dual accessor pattern: db (global) for users/teams, teamDb(teamId) for scoped tables with auto-injected WHERE team_id"
  - "getFullDb() for bootstrap transactions spanning both global and team-scoped tables"
  - "Migration files in migrations/ directory with numbered naming (001_, 002_, etc.)"
  - "PRAGMA foreign_keys = ON executed before migration runs"

requirements-completed: [DATA-01, DATA-03]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 2 Plan 01: Multi-Tenant DB Schema Summary

**Kysely schema types, dual database accessor (db + teamDb), 5 migration files with foreign keys/constraints, migration runner, and schema verification script**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T03:11:26Z
- **Completed:** 2026-03-04T03:16:06Z
- **Tasks:** 3
- **Files created:** 9

## Accomplishments
- TypeScript interfaces for all 5 tables with Generated<> types for auto-populated columns
- Dual database accessor enforcing tenant isolation at the type level (db for global, teamDb(teamId) for scoped)
- All 5 tables created in Turso with foreign keys, CHECK constraints, and UNIQUE constraints
- Schema verification script confirming all columns, foreign keys, and unique constraints

## Task Commits

Each task was committed atomically:

1. **Task 1: Create schema types and dual database accessor** - `19fde56` (feat)
2. **Task 2: Create migration files and migration runner** - `2597800` (feat)
3. **Task 3: Create schema verification script** - `a7dae0a` (feat)

## Files Created/Modified
- `src/lib/schema.ts` - TypeScript interfaces for all tables + GlobalDatabase, TeamScopedDatabase, FullDatabase types
- `src/lib/db.ts` - Kysely instances: db (global), teamDb(teamId) (scoped), getFullDb() (bootstrap)
- `migrations/001_create_users.ts` - Users table with WorkOS user ID as PK, UNIQUE email
- `migrations/002_create_teams.ts` - Teams table with slug UNIQUE, is_personal INTEGER
- `migrations/003_create_memberships.ts` - Memberships table with FK constraints, UNIQUE(user_id, team_id)
- `migrations/004_create_connections.ts` - Connections stub table with provider CHECK constraint
- `migrations/005_create_invite_links.ts` - Invite links table with token UNIQUE, max_uses nullable
- `scripts/migrate.ts` - CLI migration runner using Kysely Migrator + FileMigrationProvider
- `scripts/verify-schema.ts` - Schema smoke test verifying columns, foreign keys, and unique constraints

## Decisions Made
- Used `as any` cast on the `.where()` chain in teamDb because Kysely's generic type resolution cannot unify `.where()` overloads across a union of table types. The cast is internal to the wrapper; callers still get full type safety.
- Used `__dirname` instead of `import.meta.dirname` in scripts because tsx (the TypeScript runner) transpiles to CommonJS where `import.meta.dirname` is `undefined`. Node.js 22 supports `import.meta.dirname` in native ESM but scripts run via tsx need the CJS fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed import.meta.dirname undefined in tsx**
- **Found during:** Task 2 (Migration runner)
- **Issue:** Plan specified `import.meta.dirname` per Node 22 support, but tsx transpiles to CJS where `import.meta.dirname` is undefined
- **Fix:** Used `__dirname` which is available in tsx's CJS output
- **Files modified:** scripts/migrate.ts
- **Verification:** Migration runner executes successfully
- **Committed in:** 2597800 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed TypeScript union type error in teamDb where() calls**
- **Found during:** Task 1 (Schema types and db accessor)
- **Issue:** Kysely's `.where()` method produces incompatible union types when the table parameter is a generic `keyof TeamScopedDatabase`
- **Fix:** Cast `selectFrom(table)`, `updateTable(table)`, `deleteFrom(table)` to `any` before calling `.where()`. Internal-only cast; callers retain type safety.
- **Files modified:** src/lib/db.ts
- **Verification:** TypeScript compiles without errors, runtime PASS
- **Committed in:** 19fde56 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. Turso database already had credentials configured in .env.local.

## Next Phase Readiness
- Schema foundation complete for Phase 2 Plan 02 (auth callback upsert, middleware sync, team cookie)
- All 5 tables ready with correct constraints for Phase 3 (Pipes connections) and Phase 4 (Team formation)
- teamDb pattern ready for use in all tenant-scoped queries

## Self-Check: PASSED

All 9 created files verified present. All 3 task commit hashes verified in git log.

---
*Phase: 02-multi-tenant-db-schema*
*Completed: 2026-03-04*
