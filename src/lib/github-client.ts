import { NextRequest, NextResponse } from "next/server";

export const GITHUB_API = "https://api.github.com";

export function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

/**
 * Wraps a GitHub route handler with token extraction and error handling.
 * Mirrors the withLinearClient pattern.
 */
export function withGitHubToken(
  handler: (token: string, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const token = request.headers.get("x-github-token");
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not provided" },
        { status: 401 },
      );
    }

    try {
      return await handler(token, request);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
