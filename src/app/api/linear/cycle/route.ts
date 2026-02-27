import { withLinearClient } from "@/lib/linear-client";
import type { Cycle, Issue } from "@linear/sdk";
import { NextResponse } from "next/server";

async function formatCycle(cycle: Cycle) {
  const now = Date.now();
  const issuesConn = await cycle.issues({ first: 100 });

  const items = await Promise.all(
    issuesConn.nodes.map(async (issue: Issue) => {
      const state = await issue.state;
      let status: "done" | "in-progress" | "not-started" = "not-started";
      if (state?.type === "completed") status = "done";
      else if (state?.type === "started") status = "in-progress";

      const assignee = await issue.assignee;
      const isAtRisk =
        status !== "done" &&
        ((issue.dueDate && new Date(issue.dueDate).getTime() < now) ||
          (state?.type === "started" &&
            (now - new Date(issue.updatedAt).getTime()) / 86400000 > 3));

      return {
        identifier: issue.identifier,
        title: issue.title,
        status,
        assignee: assignee?.displayName || assignee?.name || undefined,
        isAtRisk: isAtRisk || undefined,
        url: issue.url,
      };
    }),
  );

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const dateRange = `${new Date(cycle.startsAt).toLocaleDateString("en-US", opts)} – ${new Date(cycle.endsAt).toLocaleDateString("en-US", opts)}`;

  return {
    cycleId: cycle.id,
    cycleName: cycle.name || `Cycle ${cycle.number}`,
    dateRange,
    totalItems: items.length,
    completedItems: items.filter((i) => i.status === "done").length,
    items,
  };
}

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const cycleId = searchParams.get("id");
  const teamId = searchParams.get("teamId");

  if (cycleId) {
    const cycle = await linear.cycle(cycleId);
    return NextResponse.json(await formatCycle(cycle), {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  }

  if (!teamId) {
    return NextResponse.json(
      { error: "teamId or id is required" },
      { status: 400 },
    );
  }

  const team = await linear.team(teamId);
  const activeCycle = await team.activeCycle;
  if (!activeCycle) {
    return NextResponse.json(
      { error: "No active cycle found" },
      { status: 404 },
    );
  }

  return NextResponse.json(await formatCycle(activeCycle), {
    headers: { "Cache-Control": "private, max-age=120" },
  });
});
