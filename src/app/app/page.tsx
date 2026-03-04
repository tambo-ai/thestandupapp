import { withAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { AppShell } from "./app-shell";

export default async function AppPage() {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });

  // Read active team from cookie (set by auth callback or middleware)
  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get("active_team_id")?.value ?? null;

  return (
    <AppShell
      userId={user.id}
      userName={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
      userEmail={user.email}
      userImage={user.profilePictureUrl ?? undefined}
      userToken={accessToken}
      activeTeamId={activeTeamId}
    />
  );
}
