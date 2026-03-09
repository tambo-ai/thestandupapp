import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { joinTeam } from "@/lib/team-actions";

export async function POST(request: Request) {
  await withAuth({ ensureSignedIn: true });

  let body: { token: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "token is required" },
      { status: 400 },
    );
  }

  try {
    const result = await joinTeam(token);

    if ("alreadyMember" in result && result.alreadyMember) {
      return NextResponse.json({ alreadyMember: true });
    }

    return NextResponse.json(
      { teamId: result.teamId, teamName: result.teamName },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to join team";

    // Map known error messages to appropriate status codes
    if (
      message === "Invalid or revoked invite link" ||
      message === "Team not found"
    ) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (
      message === "Invite link has expired" ||
      message === "Invite link has reached maximum uses"
    ) {
      return NextResponse.json({ error: message }, { status: 410 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
