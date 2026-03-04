import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: true });

  const teamId = request.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  const fullDb = getFullDb();

  // Verify membership
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

  // Find active (non-revoked) invite link
  let link = await fullDb
    .selectFrom("invite_links")
    .where("invite_links.team_id", "=", teamId)
    .where("invite_links.revoked_at", "is", null)
    .select(["invite_links.token", "invite_links.use_count", "invite_links.created_at"])
    .orderBy("invite_links.created_at", "desc")
    .executeTakeFirst();

  // If no link exists, create one
  if (!link) {
    const token = crypto.randomUUID();
    await fullDb
      .insertInto("invite_links")
      .values({
        id: crypto.randomUUID(),
        team_id: teamId,
        created_by: user.id,
        token,
        max_uses: null,
        use_count: 0,
        expires_at: null,
        revoked_at: null,
      })
      .execute();

    link = { token, use_count: 0, created_at: new Date().toISOString() };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    token: link.token,
    url: `${baseUrl}/invite/${link.token}`,
    useCount: link.use_count,
  });
}

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

  // Verify user is OWNER of this team
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
      { error: "Only the team owner can regenerate invite links" },
      { status: 403 },
    );
  }

  // Revoke all existing links
  await fullDb
    .updateTable("invite_links")
    .set({ revoked_at: new Date().toISOString() })
    .where("invite_links.team_id", "=", teamId)
    .where("invite_links.revoked_at", "is", null)
    .execute();

  // Create new link
  const token = crypto.randomUUID();
  await fullDb
    .insertInto("invite_links")
    .values({
      id: crypto.randomUUID(),
      team_id: teamId,
      created_by: user.id,
      token,
      max_uses: null,
      use_count: 0,
      expires_at: null,
      revoked_at: null,
    })
    .execute();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json(
    { token, url: `${baseUrl}/invite/${token}` },
    { status: 201 },
  );
}
