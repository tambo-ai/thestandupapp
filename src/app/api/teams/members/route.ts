import { NextResponse, type NextRequest } from "next/server";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: true });

  const teamId = request.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json(
      { error: "teamId required" },
      { status: 400 },
    );
  }

  const fullDb = getFullDb();

  // Verify user is a member of this team
  const membership = await fullDb
    .selectFrom("memberships")
    .where("memberships.user_id", "=", user.id)
    .where("memberships.team_id", "=", teamId)
    .select("memberships.id")
    .executeTakeFirst();

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this team" },
      { status: 403 },
    );
  }

  // Get all members with user details
  const members = await fullDb
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
    .orderBy("memberships.role", "asc")
    .orderBy("users.name", "asc")
    .execute();

  return NextResponse.json({ members });
}

export async function DELETE(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { teamId: string; userId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { teamId, userId: targetUserId } = body;

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 },
    );
  }

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 },
    );
  }

  const fullDb = getFullDb();

  // Verify requesting user is OWNER of this team
  const requesterMembership = await fullDb
    .selectFrom("memberships")
    .where("memberships.user_id", "=", user.id)
    .where("memberships.team_id", "=", teamId)
    .select("memberships.role")
    .executeTakeFirst();

  if (!requesterMembership) {
    return NextResponse.json(
      { error: "Not a member of this team" },
      { status: 403 },
    );
  }

  if (requesterMembership.role !== "owner") {
    return NextResponse.json(
      { error: "Only the team owner can remove members" },
      { status: 403 },
    );
  }

  // Verify target user is a member and is NOT an owner
  const targetMembership = await fullDb
    .selectFrom("memberships")
    .where("memberships.user_id", "=", targetUserId)
    .where("memberships.team_id", "=", teamId)
    .select("memberships.role")
    .executeTakeFirst();

  if (!targetMembership) {
    return NextResponse.json(
      { error: "User is not a member of this team" },
      { status: 404 },
    );
  }

  if (targetMembership.role === "owner") {
    return NextResponse.json(
      { error: "Cannot remove an owner" },
      { status: 400 },
    );
  }

  // Look up team's workos_organization_id
  const team = await fullDb
    .selectFrom("teams")
    .where("teams.id", "=", teamId)
    .select("teams.workos_organization_id")
    .executeTakeFirst();

  // Delete WorkOS org membership first — if this fails, nothing
  // changes in the DB so the member stays consistently in both.
  if (team?.workos_organization_id) {
    const workos = getWorkOS();
    const orgMemberships =
      await workos.userManagement.listOrganizationMemberships({
        organizationId: team.workos_organization_id,
        userId: targetUserId,
      });

    for (const om of orgMemberships.data) {
      await workos.userManagement.deleteOrganizationMembership(om.id);
    }
  }

  // Delete target's local membership
  await fullDb
    .deleteFrom("memberships")
    .where("memberships.user_id", "=", targetUserId)
    .where("memberships.team_id", "=", teamId)
    .execute();

  return NextResponse.json({ removed: true });
}
