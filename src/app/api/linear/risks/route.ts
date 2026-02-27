import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

const RISKS_QUERY = `
  query TeamRisks($teamId: String!) {
    team(id: $teamId) {
      name
      issues(
        filter: { state: { type: { nin: ["completed", "canceled"] } } }
        first: 100
      ) {
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

interface RiskIssue {
  identifier: string;
  title: string;
  url: string;
  dueDate: string | null;
  updatedAt: string;
  state: { type: string } | null;
  assignee: { displayName: string; name: string } | null;
}

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

  const data = await linear.query<{ team: { name: string; issues: { nodes: RiskIssue[] } } }>(
    RISKS_QUERY,
    { teamId },
  );

  const now = Date.now();
  const overdue: RiskItem[] = [];
  const stale: RiskItem[] = [];
  const unassigned: RiskItem[] = [];

  for (const issue of data.team.issues.nodes) {
    const assigneeName = issue.assignee?.displayName || issue.assignee?.name;
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

    if (issue.state?.type === "started" && daysSinceUpdate >= 3) {
      stale.push({
        identifier: issue.identifier,
        title: issue.title,
        assignee: assigneeName,
        reason: `No updates in ${daysSinceUpdate} days`,
        daysSinceUpdate,
        url: issue.url,
      });
    }

    if (!issue.assignee) {
      unassigned.push({
        identifier: issue.identifier,
        title: issue.title,
        reason: "No assignee",
        url: issue.url,
      });
    }
  }

  const sections: RiskSection[] = [];
  if (overdue.length > 0) sections.push({ category: "overdue", severity: "high", items: overdue });
  if (stale.length > 0) sections.push({ category: "stale", severity: "medium", items: stale });
  if (unassigned.length > 0) sections.push({ category: "unassigned", severity: "medium", items: unassigned });

  return NextResponse.json(
    {
      teamName: data.team.name,
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
