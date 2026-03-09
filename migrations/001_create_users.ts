import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`PRAGMA foreign_keys = ON`.execute(db);

  await db.schema
    .createTable("users")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("name", "text")
    .addColumn("avatar_url", "text")
    .addColumn("last_synced_at", "text", (col) => col.notNull())
    .addColumn("created_at", "text", (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .addColumn("updated_at", "text", (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("users").ifExists().execute();
}
