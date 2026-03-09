import { withLinearClientForUser } from "@/lib/linear-client";
import { NextResponse } from "next/server";

/**
 * GET /api/linear/team — List teams or get a single team's members.
 *
 * Without `id`: returns all teams as `{ id, name, key }[]`.
 * With `id`: returns `{ teamId, teamName, members }` where each member
 * includes their open issue count, risk status (on-track / at-risk / idle),
 * and top in-progress issue title.
 * With `id` + `lite=true`: returns members with basic info only (no issue stats).
 *
 * @query id   - Linear team ID (optional — omit to list all teams)
 * @query lite - Skip issue analysis, return only member names/avatars (faster)
 */
export const GET = withLinearClientForUser(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("id");
  const lite = searchParams.get("lite") === "true";

  // List all teams
  if (!teamId) {
    const teams = await linear.teams();
    const list = teams.nodes.map((t) => ({ id: t.id, name: t.name, key: t.key }));
    return NextResponse.json(list, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  const team = await linear.team(teamId);
  const membersConn = await team.members();
  const activeMembers = membersConn.nodes.filter((user) => user.active);

  // Lite mode: return basic member info without issue analysis
  if (lite) {
    const members = activeMembers.map((user) => ({
      linearUserId: user.id,
      name: user.displayName || user.name,
      email: user.email || undefined,
      avatar: user.avatarUrl || undefined,
      inProgressIssues: 0,
      status: "idle" as const,
    }));
    return NextResponse.json(
      { teamId: team.id, teamName: team.name, members },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  }

  // Full mode: fetch issues in parallel with members for status analysis
  const issuesConn = await team.issues({
    first: 200,
    filter: { state: { type: { nin: ["completed", "canceled"] } } },
  });

  const now = Date.now();

  // Resolve all issue states and assignees in parallel (avoids N+1 queries)
  const issueData = await Promise.all(
    issuesConn.nodes.map(async (issue) => {
      const [state, assignee] = await Promise.all([issue.state, issue.assignee]);
      return { issue, state, assignee };
    }),
  );

  // Build member stats from the pre-fetched data
  const statsMap = new Map<
    string,
    { inProgressCount: number; hasOverdue: boolean; hasStale: boolean; topIssue?: string }
  >();
  for (const user of activeMembers) {
    statsMap.set(user.id, { inProgressCount: 0, hasOverdue: false, hasStale: false });
  }

  for (const { issue, state, assignee } of issueData) {
    if (!assignee) continue;
    const stats = statsMap.get(assignee.id);
    if (!stats) continue;

    const isStarted = state?.type === "started";
    if (isStarted) {
      stats.inProgressCount++;
      if (!stats.topIssue) stats.topIssue = issue.title;
    }
    if (issue.dueDate && new Date(issue.dueDate).getTime() < now) {
      stats.hasOverdue = true;
    }
    if (isStarted) {
      const days = (now - new Date(issue.updatedAt).getTime()) / 86400000;
      if (days > 3) stats.hasStale = true;
    }
  }

  const members = activeMembers.map((user) => {
    const stats = statsMap.get(user.id)!;
    let status: "on-track" | "at-risk" | "idle" = "idle";
    if (stats.inProgressCount > 0) {
      status = stats.hasOverdue || stats.hasStale ? "at-risk" : "on-track";
    }
    return {
      linearUserId: user.id,
      name: user.displayName || user.name,
      email: user.email || undefined,
      avatar: user.avatarUrl || undefined,
      inProgressIssues: stats.inProgressCount,
      status,
      topIssue: stats.topIssue,
    };
  });

  return NextResponse.json(
    { teamId: team.id, teamName: team.name, members },
    { headers: { "Cache-Control": "private, max-age=120" } },
  );
});
