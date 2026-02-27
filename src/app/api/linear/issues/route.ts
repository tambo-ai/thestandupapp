import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

/**
 * GET /api/linear/issues — Fetch issues assigned to a specific user.
 *
 * @query userId - Linear user ID (required)
 *
 * @returns Array of the user's 20 most recently updated issues with identifier,
 *          title, url, priorityLabel, updatedAt, and workflow state.
 */
export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await linear.user(userId);
  const assigned = await user.assignedIssues({ first: 20, orderBy: "updatedAt" as never });

  const issues = await Promise.all(
    assigned.nodes.map(async (issue) => {
      const state = await issue.state;
      return {
        identifier: issue.identifier,
        title: issue.title,
        url: issue.url,
        priorityLabel: issue.priorityLabel,
        updatedAt: issue.updatedAt.toISOString(),
        state: state
          ? { name: state.name, color: state.color, type: state.type }
          : null,
      };
    }),
  );

  return NextResponse.json(issues, {
    headers: { "Cache-Control": "private, max-age=120" },
  });
});
