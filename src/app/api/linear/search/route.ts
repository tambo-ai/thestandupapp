import { withLinearClient } from "@/lib/linear-client";
import { NextResponse } from "next/server";

const SEARCH_ISSUES_QUERY = `
  query SearchIssues($query: String!, $first: Int) {
    issueSearch(query: $query, first: $first) {
      nodes {
        identifier
        title
        url
        priorityLabel
        updatedAt
        createdAt
        state { name color type }
        assignee { id name }
        labels { nodes { name color } }
      }
    }
  }
`;

interface SearchIssueNode {
  identifier: string;
  title: string;
  url: string;
  priorityLabel: string;
  updatedAt: string;
  createdAt: string;
  state: { name: string; color: string; type: string } | null;
  assignee: { id: string; name: string } | null;
  labels: { nodes: { name: string; color: string }[] };
}

export const GET = withLinearClient(async (linear, request) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const first = Math.min(Number(searchParams.get("first") ?? 20), 50);

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const data = await linear.query<{
    issueSearch: { nodes: SearchIssueNode[] };
  }>(SEARCH_ISSUES_QUERY, { query, first });

  const issues = data.issueSearch.nodes.map((n) => ({
    identifier: n.identifier,
    title: n.title,
    url: n.url,
    priority: n.priorityLabel,
    status: n.state?.name ?? "Unknown",
    statusType: n.state?.type ?? "unknown",
    assignee: n.assignee?.name ?? null,
    labels: n.labels.nodes.map((l) => l.name),
    updatedAt: n.updatedAt,
    createdAt: n.createdAt,
  }));

  return NextResponse.json(issues, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
});
