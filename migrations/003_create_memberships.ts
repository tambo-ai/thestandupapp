import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("memberships")
    .addColumn("id", "text", (col) => col.primaryKey().notNull())
    .addColumn("team_id", "text", (col) =>
      col.notNull().references("teams.id").onDelete("cascade")
    )
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("role", "text", (col) =>
      col.notNull().check(sql`role IN ('owner', 'member')`)
    )
    .addColumn("created_at", "text", (col) =>
      col.notNull().defaultTo(sql`(datetime('now'))`)
    )
    .addUniqueConstraint("memberships_user_team_unique", [
      "user_id",
      "team_id",
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("memberships").ifExists().execute();
}
