import { NextRequest, NextResponse } from "next/server";

const GITHUB_API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-github-token");
  if (!token) {
    return NextResponse.json(
      { error: "GitHub token not provided" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const since =
    searchParams.get("since") ||
    new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const until = searchParams.get("until"); // optional end date YYYY-MM-DD
  const repo = searchParams.get("repo");
  const owner = searchParams.get("owner");
  const number = searchParams.get("number");

  // Single PR detail mode
  if (owner && repo && number) {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`,
      { headers: headers(token) },
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: "PR not found" },
        { status: res.status },
      );
    }
    const pr = await res.json();
    return NextResponse.json({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.merged ? "merged" : pr.draft ? "draft" : pr.state,
      url: pr.html_url,
      repo: `${owner}/${repo}`,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      head: pr.head?.ref,
      base: pr.base?.ref,
      labels: (pr.labels || []).map((l: { name: string; color: string }) => ({
        name: l.name,
        color: l.color,
      })),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      author: pr.user?.login,
      authorAvatar: pr.user?.avatar_url,
      draft: pr.draft,
    }, { headers: { "Cache-Control": "private, max-age=300" } });
  }

  // List mode — search for PRs by author (defaults to current user)
  const authorParam = searchParams.get("author");
  let login = authorParam;
  if (!login) {
    const userRes = await fetch(`${GITHUB_API}/user`, {
      headers: headers(token),
    });
    const user = await userRes.json();
    login = user.login;
  }

  const dateRange = until ? `${since}..${until}` : `>=${since}`;
  let query = `author:${login} is:pr updated:${dateRange}`;
  if (repo) query += ` repo:${repo}`;

  const searchRes = await fetch(
    `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20`,
    { headers: headers(token) },
  );
  const data = await searchRes.json();

  const prs = (data.items || []).map(
    (item: {
      number: number;
      title: string;
      state: string;
      html_url: string;
      repository_url: string;
      labels: { name: string; color: string }[];
      created_at: string;
      updated_at: string;
      user: { login: string; avatar_url: string };
      draft: boolean;
      pull_request?: { merged_at: string | null };
    }) => {
      const repoPath = item.repository_url.split("/").slice(-2).join("/");
      const isMerged = !!item.pull_request?.merged_at;

      let state: string;
      if (isMerged) state = "merged";
      else if (item.draft) state = "draft";
      else state = item.state;

      return {
        number: item.number,
        title: item.title,
        state,
        url: item.html_url,
        repo: repoPath,
        labels: (item.labels || []).map((l) => ({
          name: l.name,
          color: l.color,
        })),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        mergedAt: item.pull_request?.merged_at ?? null,
        author: item.user?.login,
        authorAvatar: item.user?.avatar_url,
      };
    },
  );

  return NextResponse.json(prs, { headers: { "Cache-Control": "private, max-age=120" } });
}
