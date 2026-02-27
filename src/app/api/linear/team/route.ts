import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("id");

  // List all teams
  if (!teamId) {
    const teams = await linear.teams();
    const list = teams.nodes.map((t) => ({ id: t.id, name: t.name, key: t.key }));
    return NextResponse.json(list, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  // Get team members with issue counts
  const team = await linear.team(teamId);
  const membersConn = await team.members();
  const now = Date.now();

  const members = await Promise.all(
    membersConn.nodes
      .filter((user) => user.active)
      .map(async (user) => {
        const assigned = await user.assignedIssues({
          first: 50,
          filter: { state: { type: { nin: ["completed", "canceled"] } } },
        });

        let inProgressCount = 0;
        let hasOverdue = false;
        let hasStale = false;
        let topIssue: string | undefined;

        for (const issue of assigned.nodes) {
          const state = await issue.state;
          const isStarted = state?.type === "started";
          if (isStarted) {
            inProgressCount++;
            if (!topIssue) topIssue = issue.title;
          }
          if (issue.dueDate && new Date(issue.dueDate).getTime() < now) {
            hasOverdue = true;
          }
          if (isStarted) {
            const days =
              (now - new Date(issue.updatedAt).getTime()) / 86400000;
            if (days > 3) hasStale = true;
          }
        }

        let status: "on-track" | "at-risk" | "idle" = "idle";
        if (inProgressCount > 0) {
          status = hasOverdue || hasStale ? "at-risk" : "on-track";
        }

        return {
          linearUserId: user.id,
          name: user.displayName || user.name,
          email: user.email || undefined,
          avatar: user.avatarUrl || undefined,
          inProgressIssues: inProgressCount,
          status,
          topIssue,
        };
      }),
  );

  return NextResponse.json(
    { teamId: team.id, teamName: team.name, members },
    { headers: { "Cache-Control": "private, max-age=120" } },
  );
});
