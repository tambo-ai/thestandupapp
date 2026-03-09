import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { switchTeam } from "@/lib/team-actions";

export async function POST(request: Request) {
  await withAuth({ ensureSignedIn: true });

  let body: { teamId: string; workosOrgId: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { teamId, workosOrgId } = body;

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      { error: "teamId is required" },
      { status: 400 },
    );
  }

  // Delegate to switchTeam server action.
  // switchTeam verifies membership, sets the cookie, and calls
  // switchToOrganization for non-personal teams.
  // NOTE: switchToOrganization may throw a redirect, which means this
  // response won't be reached. The client should do a full page reload
  // regardless of the response.
  await switchTeam(teamId, workosOrgId ?? null);

  return NextResponse.json({ success: true });
}
