import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

export const GITHUB_API = "https://api.github.com";

export function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

/**
 * Resolve a name or email to a GitHub login via the Search Users API.
 * Used by both find-user and prs routes to avoid duplicating resolution logic.
 */
export async function resolveGitHubLogin(
  token: string,
  opts: { email?: string | null; name?: string | null; org?: string | null },
): Promise<string | null> {
  const query = opts.email || opts.name;
  if (!query) return null;
  const q = `${encodeURIComponent(query)}${opts.email ? "+in:email" : ""}${opts.org ? `+org:${encodeURIComponent(opts.org)}` : ""}+type:user`;
  const res = await fetch(`${GITHUB_API}/search/users?q=${q}&per_page=1`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.login ?? null;
}

/**
 * Wraps a GitHub route handler with server-side token retrieval via WorkOS Pipes.
 * The handler signature is unchanged — callers still receive a token string.
 */
export function withGitHubToken(
  handler: (token: string, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user } = await withAuth({ ensureSignedIn: true });
    const result = await getWorkOS().pipes.getAccessToken({
      provider: "github",
      userId: user.id,
    });

    if (!result.active) {
      return NextResponse.json(
        { error: "GitHub not connected", code: result.error },
        { status: 401 },
      );
    }

    try {
      return await handler(result.accessToken.accessToken, request);
    } catch (error) {
      console.error("GitHub route error", error);
      return NextResponse.json(
        { error: "GitHub request failed" },
        { status: 500 },
      );
    }
  };
}
