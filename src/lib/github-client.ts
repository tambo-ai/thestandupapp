import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getFullDb } from "./db";

export const GITHUB_API = "https://api.github.com";

export function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

/**
 * Resolve a name or email to a GitHub login via the Search Users API.
 * Used by both find-user and prs routes to avoid duplicating resolution logic.
 */
export async function resolveGitHubLogin(
  token: string,
  opts: { email?: string | null; name?: string | null; org?: string | null },
): Promise<string | null> {
  const query = opts.email || opts.name;
  if (!query) return null;
  const q = `${encodeURIComponent(query)}${opts.email ? "+in:email" : ""}${opts.org ? `+org:${encodeURIComponent(opts.org)}` : ""}+type:user`;
  const res = await fetch(`${GITHUB_API}/search/users?q=${q}&per_page=1`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.login ?? null;
}

/**
 * Wraps a GitHub route handler with cross-member token lookup via WorkOS Pipes.
 * Reads `forUserId` from query params; if present and different from the
 * requesting user, validates both share a team before retrieving the target
 * user's GitHub token.  Write routes should use `withGitHubToken` instead.
 */
export function withGitHubTokenForUser(
  handler: (token: string, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });
    const forUserId = request.nextUrl.searchParams.get("forUserId");
    const targetUserId = forUserId && forUserId !== user.id ? forUserId : user.id;

    let targetOrgId = organizationId ?? undefined;
    const activeTeamId = request.cookies.get("active_team_id")?.value;

    // If looking up another user, verify both are members of the *active* team
    if (targetUserId !== user.id) {
      if (!activeTeamId) {
        return NextResponse.json({ error: "No active team" }, { status: 400 });
      }
      const sharedTeam = await getFullDb()
        .selectFrom("memberships as m1")
        .innerJoin("memberships as m2", "m1.team_id", "m2.team_id")
        .innerJoin("teams", "teams.id", "m1.team_id")
        .where("m1.team_id", "=", activeTeamId)
        .where("m1.user_id", "=", user.id)
        .where("m2.user_id", "=", targetUserId)
        .select(["m1.team_id", "teams.workos_organization_id"])
        .executeTakeFirst();

      if (!sharedTeam) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (sharedTeam.workos_organization_id) {
        targetOrgId = sharedTeam.workos_organization_id;
      }
    }

    const result = await getWorkOS().pipes.getAccessToken({
      provider: "github",
      userId: targetUserId,
      ...(targetOrgId ? { organizationId: targetOrgId } : {}),
    });

    if (!result.active) {
      return NextResponse.json(
        { error: "GitHub not connected", code: result.error, forUserId: targetUserId },
        { status: 401 },
      );
    }

    try {
      return await handler(result.accessToken.accessToken, request);
    } catch (error) {
      console.error("GitHub route error", error);
      return NextResponse.json(
        { error: "GitHub request failed" },
        { status: 500 },
      );
    }
  };
}

/**
 * Wraps a GitHub route handler with server-side token retrieval via WorkOS Pipes.
 * The handler signature is unchanged — callers still receive a token string.
 */
export function withGitHubToken(
  handler: (token: string, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });
    const result = await getWorkOS().pipes.getAccessToken({
      provider: "github",
      userId: user.id,
      ...(organizationId ? { organizationId } : {}),
    });

    if (!result.active) {
      return NextResponse.json(
        { error: "GitHub not connected", code: result.error },
        { status: 401 },
      );
    }

    try {
      return await handler(result.accessToken.accessToken, request);
    } catch (error) {
      console.error("GitHub route error", error);
      return NextResponse.json(
        { error: "GitHub request failed" },
        { status: 500 },
      );
    }
  };
}
