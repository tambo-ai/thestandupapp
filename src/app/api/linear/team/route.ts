import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

const TEAM_QUERY = `
  query TeamMembers($teamId: String!) {
    team(id: $teamId) {
      id
      name
      members {
        nodes {
          id
          displayName
          name
          email
          avatarUrl
          active
          assignedIssues(
            filter: { state: { type: { nin: ["completed", "canceled"] } } }
            first: 50
          ) {
            nodes {
              id
              title
              dueDate
              updatedAt
              state { type }
            }
          }
        }
      }
    }
  }
`;

const TEAMS_LIST_QUERY = `
  query { teams { nodes { id name key } } }
`;

interface TeamData {
  team: {
    id: string;
    name: string;
    members: {
      nodes: {
        id: string;
        displayName: string;
        name: string;
        email: string;
        avatarUrl: string | null;
        active: boolean;
        assignedIssues: {
          nodes: {
            id: string;
            title: string;
            dueDate: string | null;
            updatedAt: string;
            state: { type: string } | null;
          }[];
        };
      }[];
    };
  };
}

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("id");

  if (!teamId) {
    const data = await linear.query<{ teams: { nodes: { id: string; name: string; key: string }[] } }>(TEAMS_LIST_QUERY);
    return NextResponse.json(data.teams.nodes, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  const data = await linear.query<TeamData>(TEAM_QUERY, { teamId });
  const now = Date.now();

  const activeUsers = data.team.members.nodes.filter((user) => user.active);
  const members = activeUsers.map((user) => {
    const issues = user.assignedIssues.nodes;
    let inProgressCount = 0;
    let hasOverdue = false;
    let hasStale = false;
    let topIssue: string | undefined;

    for (const issue of issues) {
      const isStarted = issue.state?.type === "started";
      if (isStarted) {
        inProgressCount++;
        if (!topIssue) topIssue = issue.title;
      }
      if (issue.dueDate && new Date(issue.dueDate).getTime() < now) {
        hasOverdue = true;
      }
      if (isStarted) {
        const days = (now - new Date(issue.updatedAt).getTime()) / 86400000;
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
  });

  return NextResponse.json(
    { teamId: data.team.id, teamName: data.team.name, members },
    { headers: { "Cache-Control": "private, max-age=120" } },
  );
});
