import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

const USER_ISSUES_QUERY = `
  query UserIssues($userId: String!) {
    user(id: $userId) {
      assignedIssues(
        orderBy: updatedAt
        first: 20
      ) {
        nodes {
          identifier
          title
          url
          priorityLabel
          updatedAt
          state { name color type }
        }
      }
    }
  }
`;

interface IssueNode {
  identifier: string;
  title: string;
  url: string;
  priorityLabel: string;
  updatedAt: string;
  state: { name: string; color: string; type: string } | null;
}

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const data = await linear.query<{ user: { assignedIssues: { nodes: IssueNode[] } } }>(
    USER_ISSUES_QUERY,
    { userId },
  );

  return NextResponse.json(data.user.assignedIssues.nodes, {
    headers: { "Cache-Control": "private, max-age=120" },
  });
});
