import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely, sql } from "kysely";

async function main() {
  const db = new Kysely<Record<string, never>>({
    dialect: new LibsqlDialect({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  });

  await sql`DROP TABLE IF EXISTS verification`.execute(db);
  await sql`DROP TABLE IF EXISTS session`.execute(db);
  await sql`DROP TABLE IF EXISTS account`.execute(db);
  await sql`DROP TABLE IF EXISTS "user"`.execute(db);

  console.log("Better Auth tables dropped");
  await db.destroy();
}

main().catch((err) => {
  console.error("Failed to drop tables:", err);
  process.exit(1);
});
