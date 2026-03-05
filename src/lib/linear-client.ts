import { LinearClient } from "@linear/sdk";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getFullDb } from "./db";

export { LinearClient } from "@linear/sdk";

/**
 * Wraps a route handler with cross-member Linear client lookup via WorkOS Pipes.
 * Reads `forUserId` from query params; if present and different from the
 * requesting user, validates both share a team before retrieving the target
 * user's Linear token.  Write routes should use `withLinearClient` instead.
 */
export function withLinearClientForUser(
  handler: (
    client: LinearClient,
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });
    const forUserId = request.nextUrl.searchParams.get("forUserId");
    const targetUserId = forUserId && forUserId !== user.id ? forUserId : user.id;

    let targetOrgId = organizationId ?? undefined;

    // If looking up another user, verify shared team membership and get the team's org ID
    if (targetUserId !== user.id) {
      const sharedTeam = await getFullDb()
        .selectFrom("memberships as m1")
        .innerJoin("memberships as m2", "m1.team_id", "m2.team_id")
        .innerJoin("teams", "teams.id", "m1.team_id")
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
      provider: "linear",
      userId: targetUserId,
      ...(targetOrgId ? { organizationId: targetOrgId } : {}),
    });

    if (!result.active) {
      return NextResponse.json(
        { error: "Linear not connected", code: result.error, forUserId: targetUserId },
        { status: 401 },
      );
    }

    const client = new LinearClient({
      accessToken: result.accessToken.accessToken,
    });

    try {
      return await handler(client, request);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/**
 * Wraps a route handler that uses a LinearClient.
 * Retrieves the Linear OAuth token server-side via WorkOS Pipes.
 * The handler signature is unchanged — callers still receive a LinearClient.
 */
export function withLinearClient(
  handler: (
    client: LinearClient,
    request: NextRequest,
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });
    const result = await getWorkOS().pipes.getAccessToken({
      provider: "linear",
      userId: user.id,
      ...(organizationId ? { organizationId } : {}),
    });

    if (!result.active) {
      return NextResponse.json(
        { error: "Linear not connected", code: result.error },
        { status: 401 },
      );
    }

    const client = new LinearClient({
      accessToken: result.accessToken.accessToken,
    });

    try {
      return await handler(client, request);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
