import { withAuth } from "@workos-inc/authkit-nextjs";
import { AppShell } from "./app-shell";

export default async function AppPage() {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });

  return (
    <AppShell
      userId={user.id}
      userName={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email}
      userEmail={user.email}
      userImage={user.profilePictureUrl ?? undefined}
      userToken={accessToken}
    />
  );
}
