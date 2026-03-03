import { GITHUB_API, ghHeaders, withGitHubToken } from "@/lib/github-client";
import { NextResponse } from "next/server";

/** Simple fuzzy name match: check if query words appear in target string. */
function nameScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t === q) return 100;
  if (t.includes(q)) return 80;
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);
  let matched = 0;
  for (const qw of qWords) {
    if (tWords.some((tw) => tw.includes(qw) || qw.includes(tw))) matched++;
  }
  if (matched === 0) return 0;
  return Math.round((matched / qWords.length) * 60);
}

/** Map GitHub search user results to our shape. */
function mapUsers(items: { login: string; avatar_url: string; name?: string }[]) {
  return items.map((u) => ({
    login: u.login,
    avatar: u.avatar_url,
    name: u.name,
  }));
}

export const GET = withGitHubToken(async (token, request) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const name = searchParams.get("name");
  const org = request.headers.get("x-github-org") || "";

  if (!email && !name) {
    return NextResponse.json({ error: "email or name is required" }, { status: 400 });
  }

  // Strategy 1: Search by email (most reliable)
  if (email) {
    const res = await fetch(
      `${GITHUB_API}/search/users?q=${encodeURIComponent(email)}+in:email+type:user&per_page=3`,
      { headers: ghHeaders(token) },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) {
        const users = mapUsers(data.items);
        return NextResponse.json(
          { users, bestMatch: users[0].login, matchedBy: "email" },
          { headers: { "Cache-Control": "private, max-age=600" } },
        );
      }
    }
  }

  // Strategy 2: Search within org by name (single API call, no N+1)
  if (name && org) {
    const res = await fetch(
      `${GITHUB_API}/search/users?q=${encodeURIComponent(name)}+org:${encodeURIComponent(org)}+type:user&per_page=5`,
      { headers: ghHeaders(token) },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) {
        const users = mapUsers(data.items);
        // Score and rank by name relevance
        users.sort((a, b) => {
          const sa = Math.max(nameScore(name, a.name || ""), nameScore(name, a.login));
          const sb = Math.max(nameScore(name, b.name || ""), nameScore(name, b.login));
          return sb - sa;
        });

        return NextResponse.json(
          { users, bestMatch: users[0].login, matchedBy: "org" as const },
          { headers: { "Cache-Control": "private, max-age=600" } },
        );
      }
    }
  }

  // Strategy 3: Global GitHub search by name (fallback)
  if (name) {
    const res = await fetch(
      `${GITHUB_API}/search/users?q=${encodeURIComponent(name)}+type:user&per_page=5`,
      { headers: ghHeaders(token) },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) {
        const users = mapUsers(data.items);
        return NextResponse.json(
          { users, bestMatch: users[0].login, matchedBy: "name" },
          { headers: { "Cache-Control": "private, max-age=600" } },
        );
      }
    }
  }

  return NextResponse.json(
    { users: [], bestMatch: null, matchedBy: null },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
});
