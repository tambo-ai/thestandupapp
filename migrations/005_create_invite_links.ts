import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("invite_links")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("team_id", "text", (col) =>
      col.notNull().references("teams.id").onDelete("cascade")
    )
    .addColumn("created_by", "text", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("max_uses", "integer")
    .addColumn("use_count", "integer", (col) =>
      col.notNull().defaultTo(0)
    )
    .addColumn("expires_at", "text")
    .addColumn("revoked_at", "text")
    .addColumn("created_at", "text", (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("invite_links").ifExists().execute();
}
