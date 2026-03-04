import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("teams")
    .addColumn("workos_organization_id", "text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("teams")
    .dropColumn("workos_organization_id")
    .execute();
}
