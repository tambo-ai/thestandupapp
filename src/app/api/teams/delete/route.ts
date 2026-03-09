import { NextResponse } from "next/server";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

export async function POST(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { teamId: string; confirmName: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { teamId, confirmName } = body;

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 },
    );
  }

  if (!confirmName || typeof confirmName !== "string") {
    return NextResponse.json(
      { error: "confirmName is required" },
      { status: 400 },
    );
  }

  const fullDb = getFullDb();

  // Verify requesting user is OWNER of this team
  const membership = await fullDb
    .selectFrom("memberships")
    .where("memberships.user_id", "=", user.id)
    .where("memberships.team_id", "=", teamId)
    .select("memberships.role")
    .executeTakeFirst();

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this team" },
      { status: 403 },
    );
  }

  if (membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only the team owner can delete the team" },
      { status: 403 },
    );
  }

  // Load team details
  const team = await fullDb
    .selectFrom("teams")
    .where("teams.id", "=", teamId)
    .select([
      "teams.name",
      "teams.is_personal",
      "teams.workos_organization_id",
    ])
    .executeTakeFirst();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Cannot delete personal workspace
  if (team.is_personal === 1) {
    return NextResponse.json(
      { error: "Cannot delete personal workspace" },
      { status: 400 },
    );
  }

  // Verify confirmation name matches
  if (confirmName !== team.name) {
    return NextResponse.json(
      { error: "Team name doesn't match" },
      { status: 400 },
    );
  }

  // Delete in order to avoid FK issues
  // 1. Revoke all invite links
  await fullDb
    .updateTable("invite_links")
    .set({ revoked_at: new Date().toISOString() })
    .where("invite_links.team_id", "=", teamId)
    .execute();

  // 2. Delete all invite links
  await fullDb
    .deleteFrom("invite_links")
    .where("invite_links.team_id", "=", teamId)
    .execute();

  // 3. Delete all connections
  await fullDb
    .deleteFrom("connections")
    .where("connections.team_id", "=", teamId)
    .execute();

  // 4. Delete all memberships
  await fullDb
    .deleteFrom("memberships")
    .where("memberships.team_id", "=", teamId)
    .execute();

  // 5. Delete team
  await fullDb
    .deleteFrom("teams")
    .where("teams.id", "=", teamId)
    .execute();

  // 6. Delete WorkOS organization if exists
  if (team.workos_organization_id) {
    try {
      const workos = getWorkOS();
      await workos.organizations.deleteOrganization(
        team.workos_organization_id,
      );
    } catch (err) {
      console.error("Failed to delete WorkOS organization:", err);
    }
  }

  // Find user's personal workspace for redirect
  const personalTeam = await fullDb
    .selectFrom("teams")
    .innerJoin("memberships", "memberships.team_id", "teams.id")
    .where("memberships.user_id", "=", user.id)
    .where("teams.is_personal", "=", 1)
    .select(["teams.id", "teams.workos_organization_id"])
    .executeTakeFirst();

  return NextResponse.json({
    deleted: true,
    personalTeamId: personalTeam?.id ?? null,
    personalWorkosOrgId: personalTeam?.workos_organization_id ?? null,
  });
}
