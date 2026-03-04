import { withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { AppShell } from "./app-shell";

export default async function AppPage() {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });

  // Read active team from cookie (set by auth callback or middleware)
  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get("active_team_id")?.value ?? null;

  // Look up team name from DB when activeTeamId cookie is present
  let activeTeamName: string | null = null;
  if (activeTeamId) {
    const team = await db.selectFrom('teams').where('id', '=', activeTeamId).select('name').executeTakeFirst();
    activeTeamName = team?.name ?? null;
  }

  return (
    <AppShell
      userId={user.id}
      userName={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
      userEmail={user.email}
      userImage={user.profilePictureUrl ?? undefined}
      userToken={accessToken}
      activeTeamId={activeTeamId}
      activeTeamName={activeTeamName}
    />
  );
}
