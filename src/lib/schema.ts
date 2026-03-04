import type { Generated } from "kysely";

// ---------------------------------------------------------------------------
// Global tables -- accessible via `db`
// ---------------------------------------------------------------------------

export interface UsersTable {
  id: string; // WorkOS user ID (e.g., "user_01JYEX...")
  email: string;
  name: string | null;
  avatar_url: string | null;
  last_synced_at: string; // ISO 8601 timestamp for staleness check
  created_at: Generated<string>; // defaults to datetime('now')
  updated_at: Generated<string>; // defaults to datetime('now')
}

export interface TeamsTable {
  id: string; // crypto.randomUUID()
  name: string;
  slug: string; // unique, URL-friendly identifier
  is_personal: number; // SQLite boolean (0 or 1)
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

// ---------------------------------------------------------------------------
// Team-scoped tables -- only accessible via `teamDb(teamId)`
// ---------------------------------------------------------------------------

export interface MembershipsTable {
  id: string; // crypto.randomUUID()
  team_id: string; // FK to teams
  user_id: string; // FK to users
  role: "owner" | "member";
  created_at: Generated<string>;
}

export interface ConnectionsTable {
  id: string;
  team_id: string; // FK to teams
  user_id: string; // FK to users
  provider: "github" | "linear";
  workos_connection_id: string;
  status: "active" | "inactive" | "error";
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface InviteLinksTable {
  id: string;
  team_id: string; // FK to teams
  created_by: string; // FK to users
  token: string; // unique, crypto.randomUUID() for URL
  max_uses: number | null; // null = unlimited
  use_count: number; // default 0
  expires_at: string | null; // null = never expires
  revoked_at: string | null; // null = not revoked
  created_at: Generated<string>;
}

// ---------------------------------------------------------------------------
// Database interfaces
// ---------------------------------------------------------------------------

/** Global database -- for users and teams tables */
export interface GlobalDatabase {
  users: UsersTable;
  teams: TeamsTable;
}

/** Team-scoped database -- for memberships, connections, and invite_links */
export interface TeamScopedDatabase {
  memberships: MembershipsTable;
  connections: ConnectionsTable;
  invite_links: InviteLinksTable;
}

/**
 * Full database combining global and team-scoped tables.
 * Only use for bootstrap transactions (e.g., creating team + membership).
 * Regular queries should use `db` or `teamDb()`.
 */
export type FullDatabase = GlobalDatabase & TeamScopedDatabase;
