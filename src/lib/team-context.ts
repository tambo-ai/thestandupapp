import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { GITHUB_API, ghHeaders } from "./github-client";
import { getFullDb } from "./db";

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: "owner" | "member";
  githubUsername: string | null;
  connections: {
    github: "connected" | "not_connected";
    linear: "connected" | "not_connected";
  };
}

/**
 * Fetch all members of a team with their GitHub and Linear connection status.
 * Each member's token lookup is wrapped in try/catch so one failure doesn't block others.
 *
 * @param teamId - Internal team ID (from our DB)
 * @param orgId  - WorkOS organization ID for Pipes calls (team's workos_organization_id)
 */
export async function getTeamMembersWithConnections(
  teamId: string,
  orgId: string | null,
): Promise<TeamMember[]> {
  const members = await getFullDb()
    .selectFrom("memberships")
    .innerJoin("users", "users.id", "memberships.user_id")
    .where("memberships.team_id", "=", teamId)
    .select([
      "users.id",
      "users.name",
      "users.email",
      "users.avatar_url",
      "memberships.role",
    ])
    .execute();

  const workos = getWorkOS();
  const orgParam = orgId ? { organizationId: orgId } : {};

  const results = await Promise.allSettled(
    members.map(async (member) => {
      let github: "connected" | "not_connected" = "not_connected";
      let linear: "connected" | "not_connected" = "not_connected";
      let githubUsername: string | null = null;

      try {
        const ghResult = await workos.pipes.getAccessToken({
          provider: "github",
          userId: member.id,
          ...orgParam,
        });
        if (ghResult.active) {
          github = "connected";
          // Fetch GitHub username from the token
          const res = await fetch(`${GITHUB_API}/user`, {
            headers: ghHeaders(ghResult.accessToken.accessToken),
          });
          if (res.ok) {
            const user = await res.json();
            githubUsername = user.login ?? null;
          }
        }
      } catch {
        // Token lookup failed — treat as not connected
      }

      try {
        const linearResult = await workos.pipes.getAccessToken({
          provider: "linear",
          userId: member.id,
          ...orgParam,
        });
        if (linearResult.active) linear = "connected";
      } catch {
        // Token lookup failed — treat as not connected
      }

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatar_url,
        role: member.role as "owner" | "member",
        githubUsername,
        connections: { github, linear },
      } satisfies TeamMember;
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<TeamMember> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
