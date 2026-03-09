// Load .env.local for standalone script execution (Next.js does this automatically, tsx does not)
try {
  process.loadEnvFile('.env.local');
} catch {
  // Ignore — env vars may already be set (e.g., CI, --env-file flag)
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { Kysely, Migrator, FileMigrationProvider, sql } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";

async function main() {
  const db = new Kysely<any>({
    dialect: new LibsqlDialect({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  });

  // Enable foreign key enforcement
  await sql`PRAGMA foreign_keys = ON`.execute(db);

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // import.meta.dirname requires native ESM; use __dirname for tsx compat
      migrationFolder: path.join(__dirname, "../migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(
        `migration "${it.migrationName}" was executed successfully`,
      );
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to run `migrateToLatest`");
    console.error(error);
    await db.destroy();
    process.exit(1);
  }

  await db.destroy();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
