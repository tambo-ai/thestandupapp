import { linearQuery } from "@/lib/linear-gql";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const linearApiKey = request.headers.get("x-linear-api-key");
  if (!linearApiKey) {
    return NextResponse.json({ error: "Linear API key not provided" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const data = await linearQuery<{ user: { assignedIssues: { nodes: IssueNode[] } } }>(
      USER_ISSUES_QUERY,
      { userId },
      linearApiKey,
    );

    return NextResponse.json(data.user.assignedIssues.nodes, {
      headers: { "Cache-Control": "private, max-age=120" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
