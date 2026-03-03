import { Graph, graphSchema } from "@/components/graph";
import { TeamOverview, teamOverviewSchema } from "@/components/team-overview";
import { PersonDetail, personDetailSchema } from "@/components/person-detail";
import { PullRequestList, pullRequestListSchema } from "@/components/pull-request-list";
import { WeeklyGoals, weeklyGoalsSchema } from "@/components/weekly-goals";
import { RiskReport, riskReportSchema } from "@/components/risk-report";
import { SummaryPanel, summaryPanelSchema } from "@/components/summary-panel";
import { getTokenHeaders } from "@/lib/user-tokens";
import type { TamboComponent, TamboTool } from "@tambo-ai/react";
import { defineTool } from "@tambo-ai/react";
import { z } from "zod";

async function apiFetch<T>(url: string): Promise<T> {
  const headers = await getTokenHeaders();
  const res = await fetch(url, { headers });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json as T;
}

const listTeams = defineTool({
  name: "listTeams",
  description:
    "List all Linear teams. Returns an array of { id, name, key }. Use this to discover team IDs before rendering components.",
  tool: async () => {
    return apiFetch<{ id: string; name: string; key: string }[]>(
      "/api/linear/team",
    );
  },
  inputSchema: z.object({}),
  outputSchema: z.array(
    z.object({ id: z.string(), name: z.string(), key: z.string() }),
  ),
});

const getTeamMembers = defineTool({
  name: "getTeamMembers",
  description:
    "Get members of a Linear team by team ID. Returns members with linearUserId, name, and email. Use this to find a person's Linear user ID and their email (for GitHub lookup).",
  tool: async ({ teamId }) => {
    return apiFetch<{
      teamId: string;
      teamName: string;
      members: { linearUserId: string; name: string; email?: string }[];
    }>(`/api/linear/team?id=${encodeURIComponent(teamId)}`);
  },
  inputSchema: z.object({ teamId: z.string().describe("The Linear team ID") }),
  outputSchema: z.object({
    teamId: z.string(),
    teamName: z.string(),
    members: z.array(
      z.object({ linearUserId: z.string(), name: z.string(), email: z.string().optional() }),
    ),
  }),
});

const findGitHubUser = defineTool({
  name: "findGitHubUser",
  description:
    "Find a person's GitHub username. Pass their email (preferred, from Linear) and/or name. The API tries: (1) email search, (2) org member name matching if a GitHub org is configured, (3) global name search. Works best when the user has set a GitHub Organization in settings.",
  tool: async ({ email, name }) => {
    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (name) params.set("name", name);
    return apiFetch<{
      users: { login: string; avatar: string; name?: string }[];
      bestMatch: string | null;
      matchedBy: "email" | "org" | "name" | null;
    }>(`/api/github/find-user?${params}`);
  },
  inputSchema: z.object({
    email: z.string().optional().describe("Person's email from Linear (preferred for exact match)"),
    name: z.string().optional().describe("Person's name (used for org member matching or fallback search)"),
  }),
  outputSchema: z.object({
    users: z.array(
      z.object({
        login: z.string(),
        avatar: z.string(),
        name: z.string().optional(),
      }),
    ),
    bestMatch: z.string().nullable(),
    matchedBy: z.enum(["email", "org", "name"]).nullable(),
  }),
});

const searchIssues = defineTool({
  name: "searchIssues",
  description:
    "Search Linear issues by keyword or natural language query. Returns matching issues with status, assignee, priority, and labels. Use when the user asks to find issues, look up tickets, or search for work items.",
  tool: async ({ query, limit }) => {
    const params = new URLSearchParams({ query });
    if (limit) params.set("first", String(limit));
    return apiFetch<
      {
        identifier: string;
        title: string;
        url: string;
        priority: string;
        status: string;
        statusType: string;
        assignee: string | null;
        labelIds: string[];
        updatedAt: string;
        createdAt: string;
      }[]
    >(`/api/linear/search?${params}`);
  },
  inputSchema: z.object({
    query: z.string().describe("Search query — keywords, issue identifier, or natural language"),
    limit: z.number().optional().describe("Max results to return (default 20, max 50)"),
  }),
  outputSchema: z.array(
    z.object({
      identifier: z.string(),
      title: z.string(),
      url: z.string(),
      priority: z.string(),
      status: z.string(),
      statusType: z.string(),
      assignee: z.string().nullable(),
      labelIds: z.array(z.string()),
      updatedAt: z.string(),
      createdAt: z.string(),
    }),
  ),
});

export const tools: TamboTool[] = [listTeams, getTeamMembers, findGitHubUser, searchIssues];

export const components: TamboComponent[] = [
  {
    name: "Graph",
    description:
      "A chart component that renders bar, line, or pie charts. Use for data visualization when the user asks for charts or trends.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "TeamOverview",
    description:
      "Shows all team members with status, issue counts, and top issue. ONLY pass the Linear team ID — the component fetches its own data. Use when the user asks about team state or 'show me the team'.",
    component: TeamOverview,
    propsSchema: teamOverviewSchema,
  },
  {
    name: "PersonDetail",
    description:
      "Detailed view of one person's Linear issues and GitHub PRs. Pass their Linear user ID and name. If you know their GitHub username (from findGitHubUser), pass it as githubUsername — otherwise the component will resolve it automatically. Use when the user asks about a specific person.",
    component: PersonDetail,
    propsSchema: personDetailSchema,
  },
  {
    name: "PullRequestList",
    description:
      "Shows GitHub pull requests for a repo, org, or author. The component fetches its own data — just pass the filters. Includes filter pills for state, repo, and author. Use when the user asks about PRs on a repo or org. Pass repo as just the name (e.g. 'tambo') or full slug ('tambo-ai/tambo').",
    component: PullRequestList,
    propsSchema: pullRequestListSchema,
  },
  {
    name: "WeeklyGoals",
    description:
      "Progress tracker with items grouped by status (done, in-progress, not-started) and a progress bar. You provide the data: { title, subtitle?, items: [{ identifier, title, status, assignee?, isAtRisk?, url? }] }. Use tools to discover what people are working on, then build the items list yourself.",
    component: WeeklyGoals,
    propsSchema: weeklyGoalsSchema,
  },
  {
    name: "RiskReport",
    description:
      "Shows overdue, stale, and unassigned items. ONLY pass the Linear team ID — the component fetches and computes risks server-side. Use when the user asks about risks, blockers, or 'what needs attention'.",
    component: RiskReport,
    propsSchema: riskReportSchema,
  },
  {
    name: "SummaryPanel",
    description:
      "A flexible panel for displaying any structured information. Supports a title, subtitle, stat cards (label + value + optional trend/color), free-form body text, and sections with items (each item has label, detail, status, optional URL). Use this for comparisons, summaries, daily digests, custom reports, or ANY content that doesn't fit the specialized components. You control what data goes in.",
    component: SummaryPanel,
    propsSchema: summaryPanelSchema,
  },
];
