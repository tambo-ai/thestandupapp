import { NextResponse } from "next/server";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

export async function POST(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { teamId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { teamId } = body;
  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 },
    );
  }

  const fullDb = getFullDb();

  // Verify user is a member of this team and get their role
  const membership = await fullDb
    .selectFrom("memberships")
    .where("memberships.user_id", "=", user.id)
    .where("memberships.team_id", "=", teamId)
    .select(["memberships.id", "memberships.role"])
    .executeTakeFirst();

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this team" },
      { status: 403 },
    );
  }

  // If user is an owner, check if they are the only owner
  if (membership.role === "owner") {
    const ownerCount = await fullDb
      .selectFrom("memberships")
      .where("memberships.team_id", "=", teamId)
      .where("memberships.role", "=", "owner")
      .select(fullDb.fn.countAll().as("count"))
      .executeTakeFirst();

    if (ownerCount && Number(ownerCount.count) === 1) {
      return NextResponse.json(
        {
          error:
            "You're the only owner. Transfer ownership before leaving.",
        },
        { status: 400 },
      );
    }
  }

  // Look up team's workos_organization_id
  const team = await fullDb
    .selectFrom("teams")
    .where("teams.id", "=", teamId)
    .select("teams.workos_organization_id")
    .executeTakeFirst();

  // Delete WorkOS org membership first — if this fails, nothing
  // changes in the DB so the user stays a member consistently.
  if (team?.workos_organization_id) {
    const workos = getWorkOS();
    const orgMemberships =
      await workos.userManagement.listOrganizationMemberships({
        organizationId: team.workos_organization_id,
        userId: user.id,
      });

    for (const om of orgMemberships.data) {
      await workos.userManagement.deleteOrganizationMembership(om.id);
    }
  }

  // Delete local membership
  await fullDb
    .deleteFrom("memberships")
    .where("memberships.user_id", "=", user.id)
    .where("memberships.team_id", "=", teamId)
    .execute();

  // Find user's personal workspace for redirect
  const personalTeam = await fullDb
    .selectFrom("teams")
    .innerJoin("memberships", "memberships.team_id", "teams.id")
    .where("memberships.user_id", "=", user.id)
    .where("teams.is_personal", "=", 1)
    .select(["teams.id", "teams.workos_organization_id"])
    .executeTakeFirst();

  return NextResponse.json({
    personalTeamId: personalTeam?.id ?? null,
    personalWorkosOrgId: personalTeam?.workos_organization_id ?? null,
  });
}
