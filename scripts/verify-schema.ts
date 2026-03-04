// Load .env.local for standalone script execution (Next.js does this automatically, tsx does not)
try {
  process.loadEnvFile('.env.local');
} catch {
  // Ignore — env vars may already be set (e.g., CI, --env-file flag)
}

import { Kysely, sql } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface ForeignKeyInfo {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}

interface IndexInfo {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
}

interface IndexColumnInfo {
  seqno: number;
  cid: number;
  name: string;
}

let failures = 0;

function pass(msg: string) {
  console.log(`  PASS: ${msg}`);
}

function fail(msg: string) {
  console.error(`  FAIL: ${msg}`);
  failures++;
}

async function main() {
  const db = new Kysely<any>({
    dialect: new LibsqlDialect({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  });

  await sql`PRAGMA foreign_keys = ON`.execute(db);

  // -----------------------------------------------------------------------
  // 1. Verify all expected tables exist with correct columns
  // -----------------------------------------------------------------------

  const expectedTables: Record<string, string[]> = {
    users: [
      "id",
      "email",
      "name",
      "avatar_url",
      "last_synced_at",
      "created_at",
      "updated_at",
    ],
    teams: [
      "id",
      "name",
      "slug",
      "is_personal",
      "created_at",
      "updated_at",
    ],
    memberships: ["id", "team_id", "user_id", "role", "created_at"],
    connections: [
      "id",
      "team_id",
      "user_id",
      "provider",
      "workos_connection_id",
      "status",
      "created_at",
      "updated_at",
    ],
    invite_links: [
      "id",
      "team_id",
      "created_by",
      "token",
      "max_uses",
      "use_count",
      "expires_at",
      "revoked_at",
      "created_at",
    ],
  };

  for (const [table, expectedColumns] of Object.entries(expectedTables)) {
    console.log(`\nTable: ${table}`);

    const { rows } = await sql<ColumnInfo>`PRAGMA table_info(${sql.ref(
      table,
    )})`.execute(db);

    if (rows.length === 0) {
      fail(`Table '${table}' does not exist`);
      continue;
    }

    const columnNames = rows.map((r) => r.name);
    console.log(`  Columns: ${columnNames.join(", ")}`);

    for (const col of expectedColumns) {
      if (columnNames.includes(col)) {
        pass(`Column '${col}' exists`);
      } else {
        fail(`Column '${col}' missing from '${table}'`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // 2. Verify foreign keys
  // -----------------------------------------------------------------------

  console.log("\nForeign Keys:");

  const fkChecks: [string, string, string][] = [
    ["memberships", "team_id", "teams"],
    ["memberships", "user_id", "users"],
    ["connections", "team_id", "teams"],
    ["connections", "user_id", "users"],
    ["invite_links", "team_id", "teams"],
    ["invite_links", "created_by", "users"],
  ];

  for (const [table, column, refTable] of fkChecks) {
    const { rows } = await sql<ForeignKeyInfo>`PRAGMA foreign_key_list(${sql.ref(
      table,
    )})`.execute(db);

    const fk = rows.find((r) => r.from === column && r.table === refTable);
    if (fk) {
      pass(`${table}.${column} -> ${refTable} (ON DELETE ${fk.on_delete})`);
    } else {
      fail(`${table}.${column} -> ${refTable} foreign key missing`);
    }
  }

  // -----------------------------------------------------------------------
  // 3. Verify unique constraints
  // -----------------------------------------------------------------------

  console.log("\nUnique Constraints:");

  const uniqueChecks: [string, string[]][] = [
    ["users", ["email"]],
    ["teams", ["slug"]],
    ["memberships", ["user_id", "team_id"]],
    ["invite_links", ["token"]],
  ];

  for (const [table, expectedCols] of uniqueChecks) {
    const { rows: indexes } = await sql<IndexInfo>`PRAGMA index_list(${sql.ref(
      table,
    )})`.execute(db);

    const uniqueIndexes = indexes.filter((idx) => idx.unique === 1);
    let found = false;

    for (const idx of uniqueIndexes) {
      const { rows: indexCols } =
        await sql<IndexColumnInfo>`PRAGMA index_info(${sql.ref(
          idx.name,
        )})`.execute(db);

      const colNames = indexCols.map((c) => c.name).sort();
      const expected = [...expectedCols].sort();

      if (
        colNames.length === expected.length &&
        colNames.every((c, i) => c === expected[i])
      ) {
        found = true;
        break;
      }
    }

    if (found) {
      pass(`UNIQUE(${expectedCols.join(", ")}) on '${table}'`);
    } else {
      fail(`UNIQUE(${expectedCols.join(", ")}) on '${table}' not found`);
    }
  }

  // -----------------------------------------------------------------------
  // Result
  // -----------------------------------------------------------------------

  console.log("");
  if (failures === 0) {
    console.log("SCHEMA VERIFICATION PASSED");
  } else {
    console.error(`SCHEMA VERIFICATION FAILED: ${failures} failure(s)`);
    await db.destroy();
    process.exit(1);
  }

  await db.destroy();
}

main().catch((err) => {
  console.error("Schema verification error:", err);
  process.exit(1);
});
