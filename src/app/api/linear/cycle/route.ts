import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

const CYCLE_QUERY = `
  query Cycle($cycleId: String!) {
    cycle(id: $cycleId) {
      id
      name
      number
      startsAt
      endsAt
      issues(first: 100) {
        nodes {
          identifier
          title
          url
          dueDate
          updatedAt
          state { type }
          assignee { displayName name }
        }
      }
    }
  }
`;

const ACTIVE_CYCLE_QUERY = `
  query ActiveCycle($teamId: String!) {
    team(id: $teamId) {
      activeCycle {
        id
        name
        number
        startsAt
        endsAt
        issues(first: 100) {
          nodes {
            identifier
            title
            url
            dueDate
            updatedAt
            state { type }
            assignee { displayName name }
          }
        }
      }
    }
  }
`;

interface CycleIssue {
  identifier: string;
  title: string;
  url: string;
  dueDate: string | null;
  updatedAt: string;
  state: { type: string } | null;
  assignee: { displayName: string; name: string } | null;
}

interface CycleRaw {
  id: string;
  name: string | null;
  number: number;
  startsAt: string;
  endsAt: string;
  issues: { nodes: CycleIssue[] };
}

function formatCycle(cycle: CycleRaw) {
  const now = Date.now();
  const items = cycle.issues.nodes.map((issue) => {
    let status: "done" | "in-progress" | "not-started" = "not-started";
    if (issue.state?.type === "completed") status = "done";
    else if (issue.state?.type === "started") status = "in-progress";

    const isAtRisk =
      status !== "done" &&
      ((issue.dueDate && new Date(issue.dueDate).getTime() < now) ||
        (issue.state?.type === "started" &&
          (now - new Date(issue.updatedAt).getTime()) / 86400000 > 3));

    return {
      identifier: issue.identifier,
      title: issue.title,
      status,
      assignee: issue.assignee?.displayName || issue.assignee?.name || undefined,
      isAtRisk: isAtRisk || undefined,
      url: issue.url,
    };
  });

  return {
    cycleId: cycle.id,
    cycleName: cycle.name || `Cycle ${cycle.number}`,
    dateRange: formatRange(cycle.startsAt, cycle.endsAt),
    totalItems: items.length,
    completedItems: items.filter((i) => i.status === "done").length,
    items,
  };
}

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(start).toLocaleDateString("en-US", opts)} – ${new Date(end).toLocaleDateString("en-US", opts)}`;
}

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get("id");
  const teamId = searchParams.get("teamId");

  if (cycleId) {
    const data = await linear.query<{ cycle: CycleRaw }>(CYCLE_QUERY, { cycleId });
    return NextResponse.json(formatCycle(data.cycle), {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  }

  if (!teamId) {
    return NextResponse.json({ error: "teamId or id is required" }, { status: 400 });
  }

  const data = await linear.query<{ team: { activeCycle: CycleRaw | null } }>(ACTIVE_CYCLE_QUERY, { teamId });
  if (!data.team.activeCycle) {
    return NextResponse.json({ error: "No active cycle found" }, { status: 404 });
  }

  return NextResponse.json(formatCycle(data.team.activeCycle), {
    headers: { "Cache-Control": "private, max-age=120" },
  });
});
