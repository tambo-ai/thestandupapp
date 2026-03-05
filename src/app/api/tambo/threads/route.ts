import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";

export async function POST(request: Request) {
  const { user } = await withAuth({ ensureSignedIn: true });

  let body: { teamId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { teamId } = body;
  const userKey = teamId ? `${user.id}:${teamId}` : user.id;

  const tamboUrl = process.env.NEXT_PUBLIC_TAMBO_URL ?? "https://api.tambo.co";
  const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Tambo API key not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(`${tamboUrl}/v1/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ userKey }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Failed to create thread", detail: text },
      { status: res.status },
    );
  }

  const thread = await res.json();
  return NextResponse.json({ id: thread.id, userKey });
}
