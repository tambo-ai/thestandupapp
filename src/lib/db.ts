import { Kysely } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import type {
  GlobalDatabase,
  TeamScopedDatabase,
  FullDatabase,
} from "./schema";

// Shared dialect for all Kysely instances
const dialect = new LibsqlDialect({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ---------------------------------------------------------------------------
// Global database -- for users and teams tables only
// ---------------------------------------------------------------------------

export const db = new Kysely<GlobalDatabase>({ dialect });

// ---------------------------------------------------------------------------
// Team-scoped database accessor
// ---------------------------------------------------------------------------

/**
 * Returns a scoped query builder that adds `WHERE team_id = ?` to select,
 * update, and delete operations. Insert requires the caller to include
 * `team_id` in the values (enforced by TypeScript types).
 *
 * Creates a new Kysely instance each call -- do NOT cache the result.
 */
export function teamDb(teamId: string) {
  const kysely = new Kysely<TeamScopedDatabase>({ dialect });

  return {
    /** SELECT with mandatory team_id filter */
    selectFrom<T extends keyof TeamScopedDatabase>(table: T) {
      // Cast needed: Kysely generic union of table where-clauses is not callable
      // All team-scoped tables have team_id, so this is safe
      return (kysely.selectFrom(table) as any).where(
        "team_id",
        "=",
        teamId,
      );
    },

    /** INSERT -- caller must include team_id in values (TypeScript enforced) */
    insertInto<T extends keyof TeamScopedDatabase>(table: T) {
      return kysely.insertInto(table);
    },

    /** UPDATE with mandatory team_id filter */
    updateTable<T extends keyof TeamScopedDatabase>(table: T) {
      return (kysely.updateTable(table) as any).where(
        "team_id",
        "=",
        teamId,
      );
    },

    /** DELETE with mandatory team_id filter */
    deleteFrom<T extends keyof TeamScopedDatabase>(table: T) {
      return (kysely.deleteFrom(table) as any).where(
        "team_id",
        "=",
        teamId,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Full database -- for bootstrap transactions
// ---------------------------------------------------------------------------

/**
 * Returns a Kysely instance with access to ALL tables (global + team-scoped).
 * Only use for bootstrap transactions (e.g., creating team + membership).
 * Regular queries should use `db` or `teamDb()`.
 */
export function getFullDb() {
  return new Kysely<FullDatabase>({ dialect });
}
