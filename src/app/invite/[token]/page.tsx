import { withAuth } from "@workos-inc/authkit-nextjs";
import { getFullDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { JoinSection } from "./join-section";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  // Look up invite link
  const fullDb = getFullDb();
  const invite = await fullDb
    .selectFrom("invite_links")
    .innerJoin("teams", "teams.id", "invite_links.team_id")
    .where("invite_links.token", "=", token)
    .where("invite_links.revoked_at", "is", null)
    .select([
      "invite_links.id",
      "invite_links.team_id",
      "invite_links.max_uses",
      "invite_links.use_count",
      "invite_links.expires_at",
      "teams.name as team_name",
      "teams.workos_organization_id",
    ])
    .executeTakeFirst();

  // Invalid or revoked
  if (!invite) {
    return (
      <InviteErrorPage message="This invite link is no longer valid. Ask the team owner for a new one." />
    );
  }

  // Expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <InviteErrorPage message="This invite link has expired. Ask the team owner for a new one." />
    );
  }

  // Max uses reached
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return (
      <InviteErrorPage message="This invite link has reached its maximum number of uses. Ask the team owner for a new one." />
    );
  }

  // Check if user is authenticated (without requiring sign-in -- public page)
  const { user } = await withAuth();
  const isAuthenticated = !!user;

  // If authenticated, check if already a member
  if (user) {
    const existingMembership = await fullDb
      .selectFrom("memberships")
      .where("memberships.user_id", "=", user.id)
      .where("memberships.team_id", "=", invite.team_id)
      .select("memberships.id")
      .executeTakeFirst();

    if (existingMembership) {
      redirect("/app");
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-6">
      <div
        className="w-full max-w-[380px] bg-white rounded-2xl border p-8 text-center"
        style={{
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
        }}
      >
        <p
          className="text-[11px] font-medium tracking-[0.25em] uppercase mb-4"
          style={{ color: "#999" }}
        >
          Team Invite
        </p>

        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#1A1A1A]">
          {invite.team_name}
        </h1>

        <p className="mt-2 text-[14px] text-[#888]">
          You&apos;ve been invited to join this team.
        </p>

        <div className="mt-6">
          <JoinSection
            token={token}
            teamName={invite.team_name}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
}

function InviteErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-6">
      <div
        className="w-full max-w-[380px] bg-white rounded-2xl border p-8 text-center"
        style={{
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
        }}
      >
        <p
          className="text-[11px] font-medium tracking-[0.25em] uppercase mb-4"
          style={{ color: "#999" }}
        >
          Invite Link
        </p>

        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1A1A1A]">
          Invalid Invite
        </h1>

        <p className="mt-3 text-[14px] text-[#888] leading-relaxed">
          {message}
        </p>

        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center px-5 py-2.5 text-[13px] font-medium text-[#555] bg-[#f5f5f4] rounded-lg hover:bg-[#ebebea] transition-colors"
        >
          Go to home
        </a>
      </div>
    </div>
  );
}
