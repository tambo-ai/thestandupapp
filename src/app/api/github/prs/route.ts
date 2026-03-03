import { GITHUB_API, ghHeaders, resolveGitHubLogin, withGitHubToken } from "@/lib/github-client";
import { NextResponse } from "next/server";

type PrState = "open" | "closed" | "merged" | "draft";

function resolvePrState(mergedAt: string | null | undefined, draft: boolean | undefined, rawState: string): PrState {
  if (mergedAt) return "merged";
  if (draft && rawState === "open") return "draft";
  if (rawState === "open" || rawState === "closed") return rawState;
  return "closed";
}

export const GET = withGitHubToken(async (token, request) => {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const number = searchParams.get("number");

  // Single PR detail mode
  if (owner && repo && number) {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`,
      { headers: ghHeaders(token) },
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
      state: resolvePrState(pr.merged_at, pr.draft, pr.state),
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

  // List mode — search for PRs by author, org, or current user
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const authorParam = searchParams.get("author");
  const nameParam = searchParams.get("name");
  const emailParam = searchParams.get("email");
  const org = request.headers.get("x-github-org") || searchParams.get("org");
  const repoParam = searchParams.get("repo");
  // Qualify bare repo names (e.g. "tambo") with the configured org → "tambo-ai/tambo"
  let repoFilter = repoParam;
  if (repoParam && !repoParam.includes("/")) {
    if (org) repoFilter = `${org}/${repoParam}`;
    else {
      return NextResponse.json(
        { error: "repo must be in 'owner/name' form unless org is configured" },
        { status: 400 },
      );
    }
  }

  let login = authorParam;

  // Resolve name/email to GitHub username if no author provided
  if (!login && (emailParam || nameParam)) {
    login = await resolveGitHubLogin(token, { email: emailParam, name: nameParam, org });
  }

  // Only fall back to current user when no repo/org filter — allows "all PRs on repo" queries
  if (!login && !repoFilter && !org) {
    const userRes = await fetch(`${GITHUB_API}/user`, {
      headers: ghHeaders(token),
    });
    const user = await userRes.json();
    login = user.login;
  }

  // When we have a specific repo, use the pulls endpoint for accurate state (draft, merged)
  if (repoFilter && repoFilter.includes("/")) {
    const res = await fetch(
      `${GITHUB_API}/repos/${repoFilter}/pulls?state=all&sort=updated&direction=desc&per_page=100`,
      { headers: ghHeaders(token) },
    );
    const items: {
      number: number;
      title: string;
      state: string;
      html_url: string;
      merged_at: string | null;
      draft: boolean;
      labels: { name: string; color: string }[];
      created_at: string;
      updated_at: string;
      user: { login: string; avatar_url: string };
    }[] = res.ok ? await res.json() : [];

    const sinceMs = since ? Date.parse(`${since}T00:00:00Z`) : null;
    const untilMs = until ? Date.parse(`${until}T23:59:59Z`) : null;

    const allPrs = items
      .filter((pr) => !login || pr.user?.login === login)
      .filter((pr) => {
        if (!sinceMs && !untilMs) return true;
        const updated = Date.parse(pr.updated_at);
        if (sinceMs && updated < sinceMs) return false;
        if (untilMs && updated > untilMs) return false;
        return true;
      })
      .map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: resolvePrState(pr.merged_at, pr.draft, pr.state),
        url: pr.html_url,
        repo: repoFilter,
        labels: (pr.labels || []).map((l) => ({ name: l.name, color: l.color })),
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at ?? null,
        author: pr.user?.login,
        authorAvatar: pr.user?.avatar_url,
      }));

    return NextResponse.json(allPrs, { headers: { "Cache-Control": "private, max-age=120" } });
  }

  // Fallback: search API for cross-repo queries
  let query = "is:pr";
  if (login) query += ` author:${login}`;
  if (since) {
    const dateRange = until ? `${since}..${until}` : `>=${since}`;
    query += ` updated:${dateRange}`;
  }
  if (repoFilter) query += ` repo:${repoFilter}`;
  if (org && !repoFilter) query += ` org:${org}`;

  const searchRes = await fetch(
    `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20`,
    { headers: ghHeaders(token) },
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

      return {
        number: item.number,
        title: item.title,
        state: resolvePrState(item.pull_request?.merged_at, item.draft, item.state),
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
});
