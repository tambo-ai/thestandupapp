import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("connections")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("team_id", "text", (col) =>
      col.notNull().references("teams.id").onDelete("cascade")
    )
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("provider", "text", (col) =>
      col.notNull().check(sql`provider IN ('github', 'linear')`)
    )
    .addColumn("workos_connection_id", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) =>
      col
        .notNull()
        .defaultTo("active")
        .check(sql`status IN ('active', 'inactive', 'error')`)
    )
    .addColumn("created_at", "text", (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .addColumn("updated_at", "text", (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("connections").ifExists().execute();
}
