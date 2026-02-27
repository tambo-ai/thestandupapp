import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get("query");
  const first = Math.min(Number(searchParams.get("first") ?? 20), 50);

  if (!term) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const results = await linear.searchIssues(term, { first });

  const issues = await Promise.all(
    results.nodes.map(async (n) => {
      const state = await n.state;
      const assignee = await n.assignee;
      return {
        identifier: n.identifier,
        title: n.title,
        url: n.url,
        priority: n.priorityLabel,
        status: state?.name ?? "Unknown",
        statusType: state?.type ?? "unknown",
        assignee: assignee?.name ?? null,
        labelIds: n.labelIds,
        updatedAt: n.updatedAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      };
    }),
  );

  return NextResponse.json(issues, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
});
