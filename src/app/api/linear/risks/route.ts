import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

interface RiskItem {
  identifier: string;
  title: string;
  assignee?: string;
  reason: string;
  daysSinceUpdate?: number;
  url?: string;
}

interface RiskSection {
  category: string;
  severity: "high" | "medium";
  items: RiskItem[];
}

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  const team = await linear.team(teamId);
  const issuesConn = await team.issues({
    first: 100,
    filter: { state: { type: { nin: ["completed", "canceled"] } } },
  });

  const now = Date.now();
  const overdue: RiskItem[] = [];
  const stale: RiskItem[] = [];
  const unassigned: RiskItem[] = [];

  for (const issue of issuesConn.nodes) {
    const assignee = await issue.assignee;
    const state = await issue.state;
    const assigneeName = assignee?.displayName || assignee?.name;
    const daysSinceUpdate = Math.floor(
      (now - new Date(issue.updatedAt).getTime()) / 86400000,
    );

    if (issue.dueDate && new Date(issue.dueDate).getTime() < now) {
      overdue.push({
        identifier: issue.identifier,
        title: issue.title,
        assignee: assigneeName,
        reason: `Due ${new Date(issue.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        daysSinceUpdate,
        url: issue.url,
      });
    }

    if (state?.type === "started" && daysSinceUpdate >= 3) {
      stale.push({
        identifier: issue.identifier,
        title: issue.title,
        assignee: assigneeName,
        reason: `No updates in ${daysSinceUpdate} days`,
        daysSinceUpdate,
        url: issue.url,
      });
    }

    if (!assignee) {
      unassigned.push({
        identifier: issue.identifier,
        title: issue.title,
        reason: "No assignee",
        url: issue.url,
      });
    }
  }

  const sections: RiskSection[] = [];
  if (overdue.length > 0)
    sections.push({ category: "overdue", severity: "high", items: overdue });
  if (stale.length > 0)
    sections.push({ category: "stale", severity: "medium", items: stale });
  if (unassigned.length > 0)
    sections.push({
      category: "unassigned",
      severity: "medium",
      items: unassigned,
    });

  return NextResponse.json(
    {
      teamName: team.name,
      generatedAt: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      sections,
      totalRisks: overdue.length + stale.length + unassigned.length,
    },
    { headers: { "Cache-Control": "private, max-age=120" } },
  );
});
