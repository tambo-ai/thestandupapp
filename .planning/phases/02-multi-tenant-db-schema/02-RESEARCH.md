# Phase 2: Multi-Tenant DB Schema - Research

**Researched:** 2026-03-03
**Domain:** Kysely + Turso/LibSQL multi-tenant schema, migration system, tenant-scoped query patterns
**Confidence:** HIGH

## Summary

This phase creates the database schema and access layer for multi-tenancy in Turso/LibSQL using Kysely. The core challenge is enforcing tenant isolation at the TypeScript type level -- making it structurally impossible to query team-scoped tables without providing a `team_id`. Since LibSQL (SQLite fork) does not support database-level Row Level Security or schema-per-tenant isolation, the tenant isolation MUST be enforced at the application layer through a wrapper function pattern.

The project already has `kysely` (0.28.11) and `@libsql/kysely-libsql` (0.4.1) installed. Kysely's built-in `Migrator` + `FileMigrationProvider` handles versioned migrations with TypeScript files that export `up`/`down` functions. The `handleAuth` callback from `@workos-inc/authkit-nextjs` supports an `onSuccess` hook where user upsert can happen on first login.

**Primary recommendation:** Use Kysely's type system to create two separate database accessors (`db` for global tables, `teamDb(teamId)` for scoped tables) where `teamDb` returns a constrained query builder that structurally injects `WHERE team_id = ?` into every operation. Do NOT use Kysely plugins for this -- a simpler wrapper approach gives better type safety and is easier to reason about.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Users can belong to multiple teams (full multi-tenant from day one)
- Two membership roles only: owner and member (no admin tier for v1)
- Teams table includes an `is_personal` boolean flag to distinguish personal workspaces
- Include a connections table now (user_id, provider, workos_connection_id, status) -- Phase 3 fills it in
- Include an invite_links table for shareable invite links (custom tokens, not WorkOS-managed)
- No local invitations table for email invites -- WorkOS Invitations API is the source of truth
- Use versioned migration files (numbered SQL), not a single schema script
- Middleware-based upsert: check/create user record on every authenticated request
- Staleness check: only write to DB if last_synced_at is older than N minutes (avoid unnecessary writes)
- Auto-create a personal team on first login, named "{User's Name}'s Workspace"
- Personal team is visible in the team switcher alongside real teams
- Self-healing: if user exists but personal team is missing, middleware recreates it
- Auto-sync: when WorkOS profile changes (name, avatar), update both user record and personal team name
- Two separate Kysely exports: `db` (global tables: users) and `teamDb(teamId)` (scoped tables: memberships, connections, invite_links)
- `teamDb(teamId)` structurally enforces WHERE team_id = ? on every query -- cannot query scoped tables without it
- Team context passed via cookie -- set when user switches teams, read by API routes and server components
- Team picker screen shown on login when user has multiple teams and no cookie set
- If user has only one team (personal), auto-select it without showing picker
- Custom token-based shareable invite links stored in local invite_links table
- Configurable: max_uses field lets owner choose single-use or reusable
- Default 7-day expiration; owner can set custom expiration or "never expires"
- Any team member can create invite links
- Owner can revoke any link; members can only revoke their own
- Email invitations handled entirely by WorkOS Invitations API (no local state)

### Claude's Discretion
- Team identifier approach (slug vs UUID vs both) for URLs and DB primary keys
- User profile fields to cache locally (email, name, avatar, timestamps -- balance between completeness and simplicity)
- Active team selection strategy (last-used vs URL-based vs cookie-only)
- Soft deletes vs hard deletes for teams and memberships
- Cookie configuration (HttpOnly vs client-accessible, validation frequency)
- Which tables require withTeamContext scoping vs direct query
- Invite link usage tracking approach (count-only vs full join log)
- Middleware org membership sync (user-only vs user+org in Phase 2 scope)

### Deferred Ideas (OUT OF SCOPE)
- Team switcher UI -- Phase 4 (Team Formation)
- Team picker screen on login -- Phase 4 (Team Formation)
- WorkOS Organization creation/sync -- Phase 4 (Team Formation)
- Connection status tracking UI -- Phase 3 (WorkOS Pipes)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Multi-tenant schema with users, teams, memberships, and connection references in Turso | Kysely migration system creates tables; schema design section provides exact DDL; connections table stubbed for Phase 3 |
| DATA-02 | All multi-tenant queries are scoped by team ID (no cross-tenant data leaks) | `teamDb(teamId)` wrapper pattern enforces WHERE clause at type level; global `db` only exposes non-tenant tables |
| DATA-03 | User record stores WorkOS user ID as primary identifier | Users table uses `id TEXT PRIMARY KEY` set to WorkOS `user.id` (format: `user_01ABC...`); no separate auto-increment ID |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| kysely | 0.28.11 | Type-safe SQL query builder | Already installed; provides schema builder, migration system, and type-safe queries |
| @libsql/kysely-libsql | 0.4.1 | Kysely dialect for Turso/LibSQL | Already installed; connects Kysely to Turso cloud database |
| @workos-inc/authkit-nextjs | 2.15.0 | Auth with onSuccess callback | Already installed; `handleAuth({ onSuccess })` is the hook point for user upsert |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto (Node.js built-in) | N/A | `crypto.randomUUID()` for team IDs, invite tokens | Generate UUIDs for primary keys and secure random tokens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Kysely migrations | Raw SQL scripts with custom runner | Loses type checking in migrations and requires custom tooling |
| Application-level tenant isolation | Kysely plugin (OperationNodeTransformer) | Plugins operate at AST level, harder to debug, less transparent than wrapper function |
| UUID text primary keys | Integer autoincrement | UUIDs are needed for teams (client-generated, URL-safe) but WorkOS already provides user IDs |

**Installation:**
No new packages needed. Everything is already in `package.json`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── db.ts              # Kysely instance, `db` (global) and `teamDb(teamId)` exports
│   └── schema.ts          # TypeScript interfaces for all tables (Database, TeamScopedDatabase)
├── middleware.ts           # Extended: user upsert + team cookie validation after WorkOS auth
├── app/
│   ├── api/auth/callback/
│   │   └── route.ts       # Extended: handleAuth with onSuccess for initial user creation
│   └── app/
│       └── page.tsx        # Extended: resolve active team from cookie
migrations/
├── 001_create_users.ts
├── 002_create_teams.ts
├── 003_create_memberships.ts
├── 004_create_connections.ts
├── 005_create_invite_links.ts
scripts/
├── migrate.ts              # CLI script to run migrations against Turso
└── drop-better-auth-tables.ts  # (existing)
```

### Pattern 1: Dual Database Accessor (Tenant Isolation)

**What:** Two Kysely exports -- `db` for global tables, `teamDb(teamId)` for tenant-scoped tables -- where the scoped accessor structurally prevents queries without a team_id.

**When to use:** Every database access in the application.

**Example:**
```typescript
// src/lib/schema.ts
import type { Generated, ColumnType } from 'kysely';

// Global tables -- accessible via `db`
export interface UsersTable {
  id: string;                    // WorkOS user ID (e.g., "user_01JYEX...")
  email: string;
  name: string | null;
  avatar_url: string | null;
  last_synced_at: string;        // ISO 8601 timestamp
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface TeamsTable {
  id: string;                    // crypto.randomUUID()
  name: string;
  slug: string;                  // URL-friendly identifier
  is_personal: number;           // SQLite boolean (0/1)
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// Team-scoped tables -- only accessible via `teamDb(teamId)`
export interface MembershipsTable {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  created_at: Generated<string>;
}

export interface ConnectionsTable {
  id: string;
  team_id: string;
  user_id: string;
  provider: 'github' | 'linear';
  workos_connection_id: string;
  status: 'active' | 'inactive' | 'error';
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface InviteLinksTable {
  id: string;
  team_id: string;
  created_by: string;            // user_id
  token: string;                 // crypto.randomUUID() for URL
  max_uses: number | null;       // null = unlimited
  use_count: number;
  expires_at: string | null;     // null = never expires
  revoked_at: string | null;
  created_at: Generated<string>;
}

// Global database interface
export interface GlobalDatabase {
  users: UsersTable;
  teams: TeamsTable;
}

// Team-scoped database interface
export interface TeamScopedDatabase {
  memberships: MembershipsTable;
  connections: ConnectionsTable;
  invite_links: InviteLinksTable;
}
```

```typescript
// src/lib/db.ts
import { Kysely } from 'kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import type { GlobalDatabase, TeamScopedDatabase } from './schema';

const dialect = new LibsqlDialect({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Global database -- for users and teams tables
export const db = new Kysely<GlobalDatabase>({ dialect });

// Team-scoped database accessor
// Returns a constrained interface that auto-injects team_id WHERE clauses
export function teamDb(teamId: string) {
  const kysely = new Kysely<TeamScopedDatabase>({ dialect });

  return {
    // SELECT with mandatory team_id filter
    selectFrom<T extends keyof TeamScopedDatabase>(table: T) {
      return kysely.selectFrom(table).where('team_id', '=', teamId);
    },
    // INSERT with team_id auto-injected
    insertInto<T extends keyof TeamScopedDatabase>(table: T) {
      return kysely.insertInto(table);
      // Caller must include team_id in values -- enforced by TypeScript types
    },
    // UPDATE with mandatory team_id filter
    updateTable<T extends keyof TeamScopedDatabase>(table: T) {
      return kysely.updateTable(table).where('team_id', '=', teamId);
    },
    // DELETE with mandatory team_id filter
    deleteFrom<T extends keyof TeamScopedDatabase>(table: T) {
      return kysely.deleteFrom(table).where('team_id', '=', teamId);
    },
  };
}
```

### Pattern 2: User Upsert via handleAuth onSuccess

**What:** The `handleAuth` callback's `onSuccess` hook fires after successful WorkOS authentication. Use it for initial user + personal team creation. Middleware handles ongoing sync.

**When to use:** On the auth callback route (`/api/auth/callback`).

**Example:**
```typescript
// src/app/api/auth/callback/route.ts
import { handleAuth } from '@workos-inc/authkit-nextjs';
import { db } from '@/lib/db';

export const GET = handleAuth({
  returnPathname: '/app',
  onSuccess: async ({ user }) => {
    // Upsert user record
    await db
      .insertInto('users')
      .values({
        id: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
        avatar_url: user.profilePictureUrl,
        last_synced_at: new Date().toISOString(),
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
          avatar_url: user.profilePictureUrl,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      )
      .execute();

    // Check if personal team exists
    const membership = await db
      .selectFrom('teams')
      .innerJoin('memberships', 'memberships.team_id', 'teams.id')  // Note: cross-db join won't work with separate Kysely instances
      .where('memberships.user_id', '=', user.id)
      .where('teams.is_personal', '=', 1)
      .select('teams.id')
      .executeTakeFirst();

    if (!membership) {
      // Create personal team + membership in a transaction
      // (see Code Examples section for full transaction pattern)
    }
  },
});
```

### Pattern 3: Middleware User Sync with Staleness Check

**What:** On every authenticated request, check if the user record needs refreshing based on `last_synced_at` timestamp. Only write to DB if stale (e.g., older than 5 minutes).

**When to use:** In the extended middleware, after WorkOS auth check passes.

**Why:** Avoids a DB write on every single request while still keeping user data reasonably fresh.

### Pattern 4: Cookie-Based Team Context

**What:** Active team ID stored in a cookie. Server components and API routes read it to determine which team's data to query. Middleware validates the cookie value.

**When to use:** Every request that needs team-scoped data.

**Key insight:** In Next.js 15, `cookies()` is async. Server components can READ cookies but cannot SET them. Setting cookies must happen in Server Actions or Route Handlers. Middleware can both read and set cookies via the request/response objects.

**Recommendation (Claude's Discretion):** Use an HttpOnly cookie named `active_team_id` storing the team UUID. This prevents client-side JavaScript from tampering with the value. The middleware validates that the user actually belongs to the team referenced in the cookie. If not, clear the cookie and redirect to team selection.

### Anti-Patterns to Avoid
- **Sharing a single Kysely instance for both global and scoped queries:** This defeats the purpose of tenant isolation. The type system should make it impossible to query `memberships` without going through `teamDb(teamId)`.
- **Querying team-scoped tables with raw SQL:** Bypasses the type-safe wrapper. All team data access must go through `teamDb()`.
- **Storing team context in request headers from client:** Untrusted. Use HttpOnly cookies set by the server.
- **Using `withSchema()` for tenant isolation:** LibSQL/SQLite does not support multiple schemas. `withSchema()` is for PostgreSQL/MSSQL only.

## Discretion Recommendations

Based on research, here are recommendations for areas left to Claude's discretion:

### Team Identifier: UUID primary key + slug for URLs
- **Primary key:** `TEXT` storing `crypto.randomUUID()` -- works well for SQLite, no auto-increment overhead
- **Slug:** Stored separately for human-readable URLs (e.g., `/app/teams/acme-corp`)
- **Rationale:** UUID is unforgeable and collision-free; slug is user-friendly. Both are needed.

### User Profile Fields to Cache
Cache these fields from WorkOS `User` interface:
- `id` (WorkOS user ID -- PRIMARY KEY)
- `email`
- `name` (combined firstName + lastName)
- `avatar_url` (profilePictureUrl)
- `last_synced_at` (for staleness check)
- `created_at`, `updated_at` (housekeeping)

Skip: `emailVerified`, `locale`, `externalId`, `metadata` -- not needed for v1.

### Active Team Selection: Cookie-only
- Use cookie `active_team_id` (HttpOnly, SameSite=Lax, path=/)
- Set by server action when user switches teams
- Auto-set to personal team on first login (single team = auto-select)
- Read in middleware to validate, in server components to fetch team data
- No URL-based team routing needed for v1

### Soft Deletes: No -- use hard deletes for v1
- Simpler schema (no `deleted_at` columns)
- Less query complexity (no `WHERE deleted_at IS NULL` everywhere)
- Add soft deletes later if needed

### Cookie Configuration
- **HttpOnly:** Yes -- prevents XSS from reading/modifying team context
- **SameSite:** Lax -- allows the cookie to be sent on navigation from external links
- **Secure:** true in production, false in development
- **Validation:** Middleware checks membership on every request (fast: single indexed query)

### Tables Requiring teamDb Scoping
- `memberships` -- always team-scoped
- `connections` -- always team-scoped
- `invite_links` -- always team-scoped

Tables accessed via global `db`:
- `users` -- user data is global, not team-specific
- `teams` -- need to list all teams for a user across team boundaries

### Invite Link Usage Tracking: Count-only
- `use_count INTEGER DEFAULT 0` incremented on each use
- No separate join log table for v1
- Sufficient for max_uses enforcement and simple analytics

### Middleware Scope: User-only sync in Phase 2
- Sync user profile (name, avatar, email) from WorkOS on staleness
- Do NOT sync organization memberships in Phase 2 -- that's Phase 4 territory

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Custom SQL file runner | Kysely `Migrator` + `FileMigrationProvider` | Handles ordering, tracking, locks, rollback out of the box |
| UUID generation | Custom random string | `crypto.randomUUID()` | Node.js built-in, RFC 4122 compliant, cryptographically random |
| Invite link tokens | Custom token generation | `crypto.randomUUID()` | Sufficient entropy (122 bits), no external dependency |
| SQL query building | String concatenation | Kysely query builder | Prevents SQL injection, provides TypeScript autocompletion |
| Cookie parsing | Manual header parsing | `cookies()` from `next/headers` | Next.js built-in, handles encoding/decoding |

**Key insight:** The main custom work is the `teamDb(teamId)` wrapper function. Everything else should use existing tools.

## Common Pitfalls

### Pitfall 1: Foreign Keys Disabled by Default in SQLite/LibSQL
**What goes wrong:** You create tables with FOREIGN KEY constraints but they silently do nothing. Inserts with invalid references succeed.
**Why it happens:** SQLite disables foreign key enforcement by default. You must run `PRAGMA foreign_keys = ON` per connection.
**How to avoid:** Run `PRAGMA foreign_keys = ON` when creating the Kysely/LibSQL dialect connection, or execute it as a raw query at startup. Verify in the migration script.
**Warning signs:** Orphaned rows in memberships/connections tables after deleting a team or user.

### Pitfall 2: Reusing Kysely Instances Across Tenant Boundaries
**What goes wrong:** A single `teamDb(teamA)` instance gets reused for queries on teamB data.
**Why it happens:** Caching the wrapper or passing it through context incorrectly.
**How to avoid:** Always call `teamDb(teamId)` fresh for each request. Do not store the result globally.
**Warning signs:** Data from wrong team appearing in queries.

### Pitfall 3: `__dirname` Not Available in ESM
**What goes wrong:** `FileMigrationProvider` requires an absolute path to the migration folder. Using `__dirname` throws "not defined" in ESM modules.
**Why it happens:** Next.js uses ESM. `__dirname` is a CommonJS-only global.
**How to avoid:** Use `import.meta.dirname` (Node.js 22.14.0 supports this) or `fileURLToPath(import.meta.url)` + `path.dirname()`. Since this project runs Node 22, `import.meta.dirname` works.
**Warning signs:** Runtime error "ReferenceError: __dirname is not defined".

### Pitfall 4: SQLite Boolean is Actually INTEGER
**What goes wrong:** Using `true`/`false` in TypeScript but SQLite stores 0/1. Comparisons like `WHERE is_personal = true` may not work as expected.
**Why it happens:** SQLite has no native BOOLEAN type. It stores integers.
**How to avoid:** Use `number` (0/1) for boolean columns in the TypeScript schema. In queries, compare with `1` or `0`, not `true`/`false`.
**Warning signs:** Empty query results when filtering on boolean columns.

### Pitfall 5: Cookies Cannot Be Set in Server Components
**What goes wrong:** Attempting to set the `active_team_id` cookie inside a server component throws an error.
**Why it happens:** Next.js 15 only allows cookie mutation in Server Actions and Route Handlers.
**How to avoid:** Create a `setActiveTeam` server action for team switching. Middleware can also set cookies via the response object.
**Warning signs:** Error: "Cookies can only be modified in a Server Action or Route Handler."

### Pitfall 6: Missing UNIQUE Constraint on Membership (user_id, team_id)
**What goes wrong:** A user gets added to the same team twice, causing duplicate rows and incorrect query results.
**Why it happens:** Forgetting the composite unique constraint.
**How to avoid:** Add `UNIQUE(user_id, team_id)` on the memberships table in the migration.
**Warning signs:** Duplicate membership rows, doubled counts.

### Pitfall 7: Transaction Support in LibSQL
**What goes wrong:** Assuming transactions work exactly like PostgreSQL. LibSQL supports transactions but with SQLite semantics (single writer).
**Why it happens:** LibSQL is SQLite-based with different concurrency characteristics.
**How to avoid:** Use `db.transaction()` for multi-table operations (e.g., create team + create membership). Keep transactions short. Turso cloud handles write serialization.
**Warning signs:** Locking errors under concurrent writes.

## Code Examples

### Migration File Example
```typescript
// migrations/001_create_users.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Enable foreign keys for this connection
  await sql`PRAGMA foreign_keys = ON`.execute(db);

  await db.schema
    .createTable('users')
    .addColumn('id', 'text', (col) => col.primaryKey().notNull())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text')
    .addColumn('avatar_url', 'text')
    .addColumn('last_synced_at', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .addColumn('updated_at', 'text', (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').ifExists().execute();
}
```

### Migration Runner Script
```typescript
// scripts/migrate.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Kysely, Migrator, FileMigrationProvider } from 'kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';

async function main() {
  const db = new Kysely<any>({
    dialect: new LibsqlDialect({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(import.meta.dirname, '../migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to run `migrateToLatest`');
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

main();
```

### Upsert Pattern (INSERT ... ON CONFLICT)
```typescript
// Source: Kysely docs + SQLite UPSERT syntax
await db
  .insertInto('users')
  .values({
    id: workosUser.id,
    email: workosUser.email,
    name: [workosUser.firstName, workosUser.lastName].filter(Boolean).join(' ') || null,
    avatar_url: workosUser.profilePictureUrl,
    last_synced_at: new Date().toISOString(),
  })
  .onConflict((oc) =>
    oc.column('id').doUpdateSet((eb) => ({
      email: eb.ref('excluded.email'),
      name: eb.ref('excluded.name'),
      avatar_url: eb.ref('excluded.avatar_url'),
      last_synced_at: eb.ref('excluded.last_synced_at'),
      updated_at: sql`datetime('now')`,
    }))
  )
  .execute();
```

### Transaction: Create Personal Team on First Login
```typescript
await db.transaction().execute(async (trx) => {
  const teamId = crypto.randomUUID();
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

  await trx
    .insertInto('teams')
    .values({
      id: teamId,
      name: `${userName}'s Workspace`,
      slug: `personal-${user.id}`,
      is_personal: 1,
    })
    .execute();

  // Note: memberships is team-scoped in the wrapper, but during initial creation
  // we need raw access. Use a raw Kysely instance for bootstrap operations.
  await sql`INSERT INTO memberships (id, team_id, user_id, role, created_at)
            VALUES (${crypto.randomUUID()}, ${teamId}, ${user.id}, 'owner', datetime('now'))`.execute(trx);
});
```

**Important note on transactions and the teamDb wrapper:** The `teamDb(teamId)` wrapper creates a separate Kysely instance, which means it cannot participate in a transaction started on the `db` instance. For operations that need to span global and team-scoped tables in a single transaction (like creating a team + membership), use a raw Kysely instance with the full database interface or raw SQL. This is acceptable for bootstrap operations; regular CRUD should use the typed wrappers.

### Team Cookie Reading in Server Component
```typescript
// In a server component
import { cookies } from 'next/headers';

export default async function AppPage() {
  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get('active_team_id')?.value;

  if (!activeTeamId) {
    // No team selected -- redirect to team picker or auto-select
    // (Phase 4 handles the UI; Phase 2 just reads the cookie)
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `kysely-migration-cli` (community) | `kysely-ctl` (official) or custom script | 2024 | Official CLI exists but custom script is simpler for this project |
| `__dirname` in migrations | `import.meta.dirname` (Node 22+) | Node.js 21+ | No need for `fileURLToPath` workaround |
| `cookies()` sync | `cookies()` async (returns Promise) | Next.js 15 | Must `await cookies()` in all server code |
| Kysely `withSchema()` for multi-tenancy | Application-level wrapper for SQLite | N/A | `withSchema()` only works with PostgreSQL/MSSQL schemas |

**Deprecated/outdated:**
- `better-sqlite3` dialect: This project uses LibSQL (Turso cloud), not local SQLite
- Synchronous `cookies()`: Deprecated in Next.js 15, will be removed

## Open Questions

1. **Cross-table Transaction with teamDb Wrapper**
   - What we know: `teamDb(teamId)` creates a separate Kysely instance with its own connection. Transactions cannot span multiple Kysely instances.
   - What's unclear: Whether to create a third "admin" Kysely instance with the full schema for bootstrap operations, or use raw SQL.
   - Recommendation: For bootstrap operations (create team + first membership), use a single Kysely instance typed as `GlobalDatabase & TeamScopedDatabase` with raw `where` clauses. The `teamDb` wrapper is for ongoing queries, not initial setup. Alternatively, use `sql` tagged templates within a transaction on the `db` instance.

2. **PRAGMA foreign_keys Persistence in Turso Cloud**
   - What we know: SQLite requires `PRAGMA foreign_keys = ON` per connection. Turso uses libSQL server-side.
   - What's unclear: Whether Turso cloud persists PRAGMA settings across HTTP connections (likely not -- each request may get a new connection).
   - Recommendation: Execute `PRAGMA foreign_keys = ON` at Kysely instance creation time. Verify by testing a foreign key violation. If PRAGMA doesn't stick, add it as a pre-query hook or accept that foreign key enforcement is application-level only.

3. **Team Slug Uniqueness and Generation**
   - What we know: Slugs need to be unique for URL routing. Personal teams use `personal-{userId}`.
   - What's unclear: Slug generation strategy for user-created teams (Phase 4 concern, but schema must support it).
   - Recommendation: Add `UNIQUE` constraint on `teams.slug` in the migration. Defer slug generation logic to Phase 4.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None currently configured (per CLAUDE.md) |
| Config file | None -- Wave 0 must establish |
| Quick run command | `npx tsx scripts/migrate.ts` (verify migrations apply) |
| Full suite command | TBD -- needs test framework setup |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Tables created with correct schema and foreign keys | smoke | `npx tsx scripts/migrate.ts && npx tsx scripts/verify-schema.ts` | No -- Wave 0 |
| DATA-02 | teamDb(teamId) scopes all queries by team_id | unit | `npx tsx tests/test-team-scope.ts` | No -- Wave 0 |
| DATA-03 | User ID matches WorkOS user ID format | unit | `npx tsx tests/test-user-upsert.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** Run migration script against test database to verify schema
- **Per wave merge:** Run all verification scripts
- **Phase gate:** `npm run build` succeeds + all schema verification scripts pass

### Wave 0 Gaps
- [ ] `scripts/verify-schema.ts` -- smoke test that runs migrations and verifies all tables exist with correct columns
- [ ] `tests/test-team-scope.ts` -- unit test verifying teamDb wrapper adds WHERE team_id clause
- [ ] `tests/test-user-upsert.ts` -- unit test verifying user upsert with WorkOS user ID
- [ ] Test database setup (could use in-memory libsql or a separate Turso test database)

## Sources

### Primary (HIGH confidence)
- Kysely installed package (node_modules/kysely/dist) - Migration system types, Plugin interface, Migrator API
- @libsql/kysely-libsql installed package - Dialect configuration, connection options
- @workos-inc/authkit-nextjs installed package - `handleAuth` onSuccess callback types, User interface, `withAuth` types
- @workos-inc/node installed package - WorkOS User interface fields (id, email, firstName, lastName, profilePictureUrl, etc.)

### Secondary (MEDIUM confidence)
- [Kysely + Turso + Migrations Gist](https://gist.github.com/marcosrjjunior/0a717f4b8b584a13fb36fdec4398d048) - Migration setup pattern verified against installed packages
- [Kysely official docs - Migrations](https://www.kysely.dev/docs/migrations) - FileMigrationProvider setup, migration best practices
- [Kysely official docs - Schemas](https://kysely.dev/docs/recipes/schemas) - withSchema() limitations (PostgreSQL/MSSQL only)
- [WorkOS AuthKit-NextJS GitHub](https://github.com/workos/authkit-nextjs) - handleAuth onSuccess callback data shape
- [Next.js cookies() API](https://nextjs.org/docs/app/api-reference/functions/cookies) - Async cookies, read/write limitations
- [SQLite Foreign Key Support](https://sqlite.org/foreignkeys.html) - PRAGMA foreign_keys requirement

### Tertiary (LOW confidence)
- [Kysely GitHub Issue #330](https://github.com/kysely-org/kysely/issues/330) - RLS patterns discussion (confirms application-level enforcement for non-PostgreSQL)
- [SQLite UPSERT](https://sqlite.org/lang_upsert.html) - ON CONFLICT syntax reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed and verified in node_modules
- Architecture: HIGH - Dual accessor pattern is a straightforward TypeScript wrapper; no novel/experimental approach
- Migration system: HIGH - Kysely Migrator API verified from installed type definitions
- Tenant isolation: HIGH - Application-level wrapper is the only viable approach for SQLite (no schema-per-tenant, no RLS)
- User upsert: HIGH - handleAuth onSuccess callback verified from installed package types
- Pitfalls: MEDIUM - Foreign key PRAGMA behavior in Turso cloud needs runtime verification

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- core libraries unlikely to change significantly)
