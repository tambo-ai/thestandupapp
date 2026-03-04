/**
 * Shared helpers for the member filter feature.
 *
 * - TeamMember: canonical type for a team member summary (used by
 *   team overview, person detail, and filter resolution)
 * - fetchTeamMembers: single function for fetching the member list from the API
 * - resolveFilteredMemberNames: returns null (member filtering removed with old settings modal)
 * - useFilteredMemberIds: returns null (member filtering removed with old settings modal)
 */

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
 * Server handles authentication via session cookies.
 */
export async function fetchTeamMembers(teamId: string, lite = false): Promise<TeamMember[]> {
  const url = lite
    ? `/api/linear/team?id=${teamId}&lite=true`
    : `/api/linear/team?id=${teamId}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data?.members && Array.isArray(data.members)) {
    return data.members;
  }
  return [];
}

/**
 * Returns null — member filtering was removed with the old settings modal.
 * Kept for API compatibility until callers are cleaned up.
 */
export async function resolveFilteredMemberNames(_teamId: string): Promise<string[] | null> {
  // Member filtering removed — was tied to old settings modal token storage
  return null;
}

/**
 * Returns null — member filtering was removed with the old settings modal.
 * Kept for API compatibility until callers are cleaned up.
 */
export function useFilteredMemberIds(): Set<string> | null {
  // Member filtering removed — was tied to old settings modal token storage
  return null;
}
