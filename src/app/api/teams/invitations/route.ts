import { NextResponse, type NextRequest } from "next/server";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: true });

  const teamId = request.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
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

  // Look up team for workos_organization_id
  const team = await fullDb
    .selectFrom("teams")
    .where("teams.id", "=", teamId)
    .select("teams.workos_organization_id")
    .executeTakeFirst();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Fetch WorkOS email invitations (only if team has a WorkOS org)
  type InvitationItem = {
    id: string;
    type: "email" | "link";
    email?: string;
    useCount?: number;
    invitedBy: string;
    createdAt: string;
    token?: string;
    url?: string;
  };

  const invitations: InvitationItem[] = [];

  if (team.workos_organization_id) {
    try {
      const workos = getWorkOS();
      const workosInvitations =
        await workos.userManagement.listInvitations({
          organizationId: team.workos_organization_id,
        });

      // Filter to pending invitations only
      const pending = workosInvitations.data.filter(
        (inv) => inv.state === "pending",
      );

      // Look up inviter names
      for (const inv of pending) {
        let inviterName = "Unknown";
        if (inv.inviterUserId) {
          const inviter = await fullDb
            .selectFrom("users")
            .where("users.id", "=", inv.inviterUserId)
            .select("users.name")
            .executeTakeFirst();
          if (inviter?.name) {
            inviterName = inviter.name;
          }
        }

        invitations.push({
          id: inv.id,
          type: "email",
          email: inv.email,
          invitedBy: inviterName,
          createdAt: inv.createdAt
            ? new Date(inv.createdAt).toISOString()
            : new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to fetch WorkOS invitations:", err);
    }
  }

  // Fetch local invite links (non-revoked)
  const inviteLinks = await fullDb
    .selectFrom("invite_links")
    .where("invite_links.team_id", "=", teamId)
    .where("invite_links.revoked_at", "is", null)
    .select([
      "invite_links.id",
      "invite_links.token",
      "invite_links.use_count",
      "invite_links.created_by",
      "invite_links.created_at",
    ])
    .orderBy("invite_links.created_at", "desc")
    .execute();

  for (const link of inviteLinks) {
    let creatorName = "Unknown";
    const creator = await fullDb
      .selectFrom("users")
      .where("users.id", "=", link.created_by)
      .select("users.name")
      .executeTakeFirst();
    if (creator?.name) {
      creatorName = creator.name;
    }

    invitations.push({
      id: link.id,
      type: "link",
      useCount: link.use_count,
      invitedBy: creatorName,
      createdAt: link.created_at,
      token: link.token,
      url: `${baseUrl}/invite/${link.token}`,
    });
  }

  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { teamId: string; action: string; invitationId: string; type: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { teamId, action, invitationId, type } = body;

  if (!teamId || !action || !invitationId || !type) {
    return NextResponse.json(
      { error: "teamId, action, invitationId, and type are required" },
      { status: 400 },
    );
  }

  if (!["resend", "revoke"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'resend' or 'revoke'" },
      { status: 400 },
    );
  }

  if (!["email", "link"].includes(type)) {
    return NextResponse.json(
      { error: "type must be 'email' or 'link'" },
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
      { error: "Only the team owner can manage invitations" },
      { status: 403 },
    );
  }

  // Handle email invitations via WorkOS
  if (type === "email") {
    const team = await fullDb
      .selectFrom("teams")
      .where("teams.id", "=", teamId)
      .select("teams.workos_organization_id")
      .executeTakeFirst();

    if (!team?.workos_organization_id) {
      return NextResponse.json(
        { error: "Team has no WorkOS organization" },
        { status: 400 },
      );
    }

    const workos = getWorkOS();

    if (action === "resend") {
      await workos.userManagement.resendInvitation(invitationId);
      return NextResponse.json({ success: true });
    }

    if (action === "revoke") {
      await workos.userManagement.revokeInvitation(invitationId);
      return NextResponse.json({ success: true });
    }
  }

  // Handle link invitations
  if (type === "link") {
    if (action === "resend") {
      return NextResponse.json(
        { error: "Links cannot be resent" },
        { status: 400 },
      );
    }

    if (action === "revoke") {
      // Revoke the link
      await fullDb
        .updateTable("invite_links")
        .set({ revoked_at: new Date().toISOString() })
        .where("invite_links.id", "=", invitationId)
        .where("invite_links.team_id", "=", teamId)
        .execute();

      // Auto-regenerate a new link (same pattern as invite-link POST)
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

      return NextResponse.json({
        success: true,
        newLink: { token, url: `${baseUrl}/invite/${token}` },
      });
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
