import { NextResponse } from "next/server";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export async function PATCH(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { teamId: string; name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { teamId, name, slug } = body;

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 },
    );
  }

  if (!name && !slug) {
    return NextResponse.json(
      { error: "At least one of name or slug is required" },
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
      { error: "Only the team owner can update team settings" },
      { status: 403 },
    );
  }

  // Look up team for current values and workos_organization_id
  const team = await fullDb
    .selectFrom("teams")
    .where("teams.id", "=", teamId)
    .select(["teams.name", "teams.slug", "teams.workos_organization_id"])
    .executeTakeFirst();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const updates: Record<string, string> = {};

  // Validate and prepare name update
  if (name !== undefined) {
    if (typeof name !== "string" || name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 },
      );
    }
    updates.name = name;
  }

  // Validate and prepare slug update
  if (slug !== undefined) {
    if (
      typeof slug !== "string" ||
      slug.length < 3 ||
      slug.length > 50 ||
      !SLUG_REGEX.test(slug)
    ) {
      return NextResponse.json(
        {
          error:
            "Slug must be 3-50 lowercase alphanumeric characters and hyphens, starting and ending with a letter or number",
          field: "slug",
        },
        { status: 400 },
      );
    }

    // Check slug uniqueness (exclude current team)
    const existing = await fullDb
      .selectFrom("teams")
      .where("teams.slug", "=", slug)
      .where("teams.id", "!=", teamId)
      .select("teams.id")
      .executeTakeFirst();

    if (existing) {
      return NextResponse.json(
        { error: "Slug already taken", field: "slug" },
        { status: 409 },
      );
    }

    updates.slug = slug;
  }

  // Update WorkOS org name first — if this fails, DB stays unchanged.
  if (updates.name && team.workos_organization_id) {
    const workos = getWorkOS();
    await workos.organizations.updateOrganization({
      organization: team.workos_organization_id,
      name: updates.name,
    });
  }

  // Apply updates to local DB
  if (Object.keys(updates).length > 0) {
    await fullDb
      .updateTable("teams")
      .set({ ...updates, updated_at: new Date().toISOString() })
      .where("teams.id", "=", teamId)
      .execute();
  }

  return NextResponse.json({
    name: updates.name ?? team.name,
    slug: updates.slug ?? team.slug,
  });
}
