import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
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
