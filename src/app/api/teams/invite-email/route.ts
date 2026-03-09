import { NextResponse } from "next/server";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS_PER_BATCH = 10;

export async function POST(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { teamId: string; emails: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { teamId, emails } = body;

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 },
    );
  }

  if (!emails || typeof emails !== "string") {
    return NextResponse.json(
      { error: "emails is required (comma-separated string)" },
      { status: 400 },
    );
  }

  const fullDb = getFullDb();

  // Verify membership (any member can invite)
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

  // Look up team for workos_organization_id
  const team = await fullDb
    .selectFrom("teams")
    .where("teams.id", "=", teamId)
    .select("teams.workos_organization_id")
    .executeTakeFirst();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (!team.workos_organization_id) {
    return NextResponse.json(
      { error: "Cannot send invitations for personal teams" },
      { status: 400 },
    );
  }

  // Parse and validate emails
  const parsedEmails = emails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && EMAIL_REGEX.test(e));

  if (parsedEmails.length === 0) {
    return NextResponse.json(
      { error: "No valid email addresses" },
      { status: 400 },
    );
  }

  // Cap at max per batch
  const emailBatch = parsedEmails.slice(0, MAX_EMAILS_PER_BATCH);

  const workos = getWorkOS();

  // Send invitations via WorkOS
  const results = await Promise.allSettled(
    emailBatch.map((email) =>
      workos.userManagement.sendInvitation({
        email,
        organizationId: team.workos_organization_id!,
        inviterUserId: user.id,
        expiresInDays: 7,
      }),
    ),
  );

  const failed: string[] = [];
  let sent = 0;

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent++;
    } else {
      failed.push(emailBatch[i]);
    }
  });

  return NextResponse.json({ sent, failed });
}
