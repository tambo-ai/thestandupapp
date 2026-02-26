/**
 * Shared helpers for the member filter feature.
 *
 * - TeamMember: canonical type for a team member summary (used by settings modal,
 *   team overview, and filter resolution)
 * - fetchTeamMembers: single function for fetching the member list from the API
 * - resolveFilteredMemberNames: reads filter IDs from storage, fetches team, returns names
 * - useFilteredMemberIds: React hook returning the stored filter as a Set
 */

import { useEffect, useState } from "react";
import { getFilteredMembers, getTokenHeaders } from "./user-tokens";

/** Member shape returned by /api/linear/team?id=X */
export interface TeamMember {
  linearUserId: string;
  name: string;
  avatar?: string;
  email?: string;
  role?: string;
  inProgressIssues: number;
  status: "on-track" | "at-risk" | "idle";
  topIssue?: string;
}

/**
 * Fetches team members from the Linear team API.
 * Attaches the user's encrypted auth headers automatically.
 */
export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const headers = await getTokenHeaders();
  const res = await fetch(`/api/linear/team?id=${teamId}`, { headers });
  const data = await res.json();
  if (data?.members && Array.isArray(data.members)) {
    return data.members;
  }
  return [];
}

/**
 * Reads the stored filter IDs, fetches the team member list, and resolves
 * IDs to display names. Returns null if no filter is active.
 */
export async function resolveFilteredMemberNames(teamId: string): Promise<string[] | null> {
  const ids = await getFilteredMembers();
  if (!ids) return null;
  try {
    const members = await fetchTeamMembers(teamId);
    const idSet = new Set(ids);
    return members
      .filter((m) => idSet.has(m.linearUserId))
      .map((m) => m.name);
  } catch {
    return null;
  }
}

/**
 * React hook that reads the filtered member IDs from localStorage on mount.
 * Returns a Set of IDs for fast lookup, or null if no filter is active.
 */
export function useFilteredMemberIds(): Set<string> | null {
  const [filterIds, setFilterIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    getFilteredMembers().then((ids) => setFilterIds(ids ? new Set(ids) : null));
  }, []);

  return filterIds;
}
