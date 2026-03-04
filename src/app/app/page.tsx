import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AppShell } from "./app-shell";

export default async function AppPage() {
  const { user, organizationId, accessToken } = await withAuth({ ensureSignedIn: true });

  // Read active team from cookie (set by auth callback or middleware)
  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get("active_team_id")?.value ?? null;

  // Look up team name from DB when activeTeamId cookie is present
  let activeTeamName: string | null = null;
  if (activeTeamId) {
    const team = await db.selectFrom('teams').where('id', '=', activeTeamId).select('name').executeTakeFirst();
    activeTeamName = team?.name ?? null;
  }

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

  return (
    <AppShell
      userId={user.id}
      userName={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
      userEmail={user.email}
      userImage={user.profilePictureUrl ?? undefined}
      userToken={accessToken}
      activeTeamId={activeTeamId}
      activeTeamName={activeTeamName}
      connectionStatus={connectionStatus}
    />
  );
}
