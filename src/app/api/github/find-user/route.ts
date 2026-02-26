import { NextRequest, NextResponse } from "next/server";

const GITHUB_API = "https://api.github.com";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

interface GHMember {
  login: string;
  avatar_url: string;
}

/** Fetch all members of a GitHub org (paginated). Cached per request. */
async function fetchOrgMembers(org: string, token: string): Promise<GHMember[]> {
  const members: GHMember[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${GITHUB_API}/orgs/${encodeURIComponent(org)}/members?per_page=100&page=${page}`,
      { headers: ghHeaders(token) },
    );
    if (!res.ok) break;
    const batch: GHMember[] = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    members.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return members;
}

/** Fetch a user's profile to get their real name. */
async function fetchUserName(login: string, token: string): Promise<string | null> {
  const res = await fetch(`${GITHUB_API}/users/${encodeURIComponent(login)}`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.name || null;
}

/** Simple fuzzy name match: check if query words appear in target string. */
function nameScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (t === q) return 100; // exact match
  if (t.includes(q)) return 80; // full substring
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);
  let matched = 0;
  for (const qw of qWords) {
    if (tWords.some((tw) => tw.includes(qw) || qw.includes(tw))) matched++;
  }
  if (matched === 0) return 0;
  return Math.round((matched / qWords.length) * 60);
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-github-token");
  if (!token) {
    return NextResponse.json({ error: "GitHub token not provided" }, { status: 401 });
  }

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
        const users = data.items.map((u: { login: string; avatar_url: string; name?: string }) => ({
          login: u.login,
          avatar: u.avatar_url,
          name: u.name,
        }));
        return NextResponse.json(
          { users, bestMatch: users[0].login, matchedBy: "email" },
          { headers: { "Cache-Control": "private, max-age=600" } },
        );
      }
    }
  }

  // Strategy 2: Org member matching by name (when org is configured)
  if (name && org) {
    const members = await fetchOrgMembers(org, token);
    if (members.length > 0) {
      // Fetch real names for all org members in parallel (batched)
      const withNames = await Promise.all(
        members.map(async (m) => {
          const realName = await fetchUserName(m.login, token);
          return { login: m.login, avatar: m.avatar_url, name: realName };
        }),
      );

      // Score each member against the query name
      const scored = withNames
        .map((m) => ({
          ...m,
          score: Math.max(
            nameScore(name, m.name || ""),
            nameScore(name, m.login),
          ),
        }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (scored.length > 0) {
        const users = scored.map((m) => ({ login: m.login, avatar: m.avatar, name: m.name }));
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
        const users = data.items.map((u: { login: string; avatar_url: string; name?: string }) => ({
          login: u.login,
          avatar: u.avatar_url,
          name: u.name,
        }));
        return NextResponse.json(
          { users, bestMatch: users[0].login, matchedBy: "name" },
          { headers: { "Cache-Control": "private, max-age=600" } },
        );
      }
    }
  }

  // No match found
  return NextResponse.json(
    { users: [], bestMatch: null, matchedBy: null },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
}
