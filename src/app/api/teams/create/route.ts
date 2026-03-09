import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export async function POST(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { name: string; slug: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, slug } = body;

  // Validate name
  if (!name || typeof name !== "string" || name.length < 1 || name.length > 100) {
    return NextResponse.json(
      { error: "Name must be between 1 and 100 characters" },
      { status: 400 },
    );
  }

  // Validate slug
  if (
    !slug ||
    typeof slug !== "string" ||
    slug.length < 3 ||
    slug.length > 50 ||
    !SLUG_REGEX.test(slug)
  ) {
    return NextResponse.json(
      {
        error:
          "Slug must be 3-50 lowercase alphanumeric characters and hyphens, starting and ending with a letter or number",
      },
      { status: 400 },
    );
  }

  const fullDb = getFullDb();

  // Check slug uniqueness
  const existing = await fullDb
    .selectFrom("teams")
    .where("teams.slug", "=", slug)
    .select("teams.id")
    .executeTakeFirst();

  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  // Soft limit check: warn if >= 5 non-personal teams
  const teamCount = await fullDb
    .selectFrom("memberships")
    .innerJoin("teams", "teams.id", "memberships.team_id")
    .where("memberships.user_id", "=", user.id)
    .where("teams.is_personal", "=", 0)
    .select(fullDb.fn.countAll().as("count"))
    .executeTakeFirst();

  if (teamCount && Number(teamCount.count) >= 5) {
    console.warn(
      `User ${user.id} creating team #${Number(teamCount.count) + 1} (soft limit: 5)`,
    );
  }

  // Create WorkOS Organization
  const workos = getWorkOS();
  const org = await workos.organizations.createOrganization({ name });

  const teamId = crypto.randomUUID();
  const inviteLinkId = crypto.randomUUID();
  const inviteToken = crypto.randomUUID();

  // Create team + membership in a transaction
  await fullDb.transaction().execute(async (trx) => {
    await trx
      .insertInto("teams")
      .values({
        id: teamId,
        name,
        slug,
        is_personal: 0,
        workos_organization_id: org.id,
      })
      .execute();

    await trx
      .insertInto("memberships")
      .values({
        id: crypto.randomUUID(),
        team_id: teamId,
        user_id: user.id,
        role: "owner",
      })
      .execute();

    // Create default invite link
    await trx
      .insertInto("invite_links")
      .values({
        id: inviteLinkId,
        team_id: teamId,
        created_by: user.id,
        token: inviteToken,
        max_uses: null,
        use_count: 0,
        expires_at: null,
        revoked_at: null,
      })
      .execute();
  });

  // Create WorkOS org membership
  await workos.userManagement.createOrganizationMembership({
    organizationId: org.id,
    userId: user.id,
    roleSlug: "admin",
  });

  // Set active_team_id cookie
  const cookieStore = await cookies();
  cookieStore.set("active_team_id", teamId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return NextResponse.json(
    { id: teamId, name, slug, workosOrgId: org.id },
    { status: 201 },
  );
}
