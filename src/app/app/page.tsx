import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { getFullDb } from "@/lib/db";
import { getTeamMembersWithConnections, type TeamMember } from "@/lib/team-context";
import { AppShell } from "./app-shell";

export default async function AppPage() {
  const { user, organizationId, accessToken } = await withAuth({ ensureSignedIn: true });

  // Read active team from cookie (set by auth callback or middleware)
  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get("active_team_id")?.value ?? null;

  // Query all teams the user belongs to (with role)
  const fullDb = getFullDb();
  const userTeams = await fullDb
    .selectFrom('teams')
    .innerJoin('memberships', 'memberships.team_id', 'teams.id')
    .where('memberships.user_id', '=', user.id)
    .select([
      'teams.id',
      'teams.name',
      'teams.slug',
      'teams.is_personal',
      'teams.workos_organization_id',
      'memberships.role',
    ])
    .orderBy('teams.is_personal', 'desc')
    .orderBy('teams.name', 'asc')
    .execute();

  const mappedTeams = userTeams.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    isPersonal: t.is_personal === 1,
    workosOrgId: t.workos_organization_id,
    role: t.role as 'owner' | 'member',
  }));

  // Check connection status for both providers server-side via WorkOS Pipes
  const workos = getWorkOS();
  const pipeOpts = (provider: string) => ({
    provider,
    userId: user.id,
    ...(organizationId ? { organizationId } : {}),
  });
  const [ghResult, linearResult] = await Promise.all([
    workos.pipes
      .getAccessToken(pipeOpts("github"))
      .catch(() => ({ active: false as const, error: "not_installed" as const })),
    workos.pipes
      .getAccessToken(pipeOpts("linear"))
      .catch(() => ({ active: false as const, error: "not_installed" as const })),
  ]);

  const connectionStatus = {
    github: ghResult.active
      ? "connected"
      : (ghResult as { error?: string }).error ?? "not_installed",
    linear: linearResult.active
      ? "connected"
      : (linearResult as { error?: string }).error ?? "not_installed",
  };

  // Fetch team member roster with connection status for the active team
  let teamMembers: TeamMember[] = [];

  if (activeTeamId) {
    const activeTeamOrgId = mappedTeams.find((t) => t.id === activeTeamId)?.workosOrgId ?? null;
    teamMembers = await getTeamMembersWithConnections(activeTeamId, activeTeamOrgId);
  }

  return (
    <AppShell
      userId={user.id}
      userName={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
      userEmail={user.email}
      userImage={user.profilePictureUrl ?? undefined}
      userToken={accessToken}
      activeTeamId={activeTeamId}
      teams={mappedTeams}
      connectionStatus={connectionStatus}
      teamMembers={teamMembers}
    />
  );
}
