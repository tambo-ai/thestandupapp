/**
 * Shared helpers for the member filter feature.
 * Consolidates the "read filter IDs → fetch team → resolve" pipeline
 * that was duplicated across page.tsx, risk-report.tsx, and team-overview.tsx.
 */

import { useEffect, useState } from "react";
import { getFilteredMembers, getTokenHeaders } from "./user-tokens";

interface TeamMemberStub {
  linearUserId: string;
  name: string;
}

/**
 * Fetches the team member list and resolves the stored filtered member IDs
 * to display names. Returns null if no filter is active.
 */
export async function resolveFilteredMemberNames(teamId: string): Promise<string[] | null> {
  const ids = await getFilteredMembers();
  if (!ids) return null;
  try {
    const headers = await getTokenHeaders();
    const res = await fetch(`/api/linear/team?id=${teamId}`, { headers });
    const data = await res.json();
    if (data?.members && Array.isArray(data.members)) {
      const idSet = new Set(ids);
      return data.members
        .filter((m: TeamMemberStub) => idSet.has(m.linearUserId))
        .map((m: TeamMemberStub) => m.name);
    }
  } catch {
    // fall through
  }
  return null;
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
