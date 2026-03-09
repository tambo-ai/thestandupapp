import { Graph, graphSchema } from "@/components/graph";
import { TeamOverview, teamOverviewSchema } from "@/components/team-overview";
import { PersonDetail, personDetailSchema } from "@/components/person-detail";
import { PullRequestList, pullRequestListSchema } from "@/components/pull-request-list";
import { WeeklyGoals, weeklyGoalsSchema } from "@/components/weekly-goals";
import { RiskReport, riskReportSchema } from "@/components/risk-report";
import { SummaryPanel, summaryPanelSchema } from "@/components/summary-panel";
import type { TamboComponent, TamboTool } from "@tambo-ai/react";
import { defineTool } from "@tambo-ai/react";
import { z } from "zod";

// --- Helpers ---

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json as T;
}

/** Member identifier passed by AI from team_roster context */
const memberIdSchema = z.object({
  id: z.string().describe("The member's user ID from team_roster"),
  name: z.string().describe("The member's display name from team_roster"),
});

type MemberId = z.infer<typeof memberIdSchema>;

/**
 * Fetch data from an API route for multiple team members in parallel.
 * Appends `forUserId=<memberId>` to the URL for each member.
 * Never throws — returns partial results with per-member error details.
 */
async function apiFetchForMembers<T>(
  url: string,
  members: MemberId[],
): Promise<{
  results: Array<{ memberId: string; memberName: string; data: T }>;
  errors: Array<{ memberId: string; memberName: string; error: string }>;
}> {
  const separator = url.includes("?") ? "&" : "?";
  const outcomes = await Promise.allSettled(
    members.map(async (member) => {
      const memberUrl = `${url}${separator}forUserId=${encodeURIComponent(member.id)}`;
      const res = await fetch(memberUrl);
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      return { memberId: member.id, memberName: member.name, data: json as T };
    }),
  );

  const results: Array<{ memberId: string; memberName: string; data: T }> = [];
  const errors: Array<{ memberId: string; memberName: string; error: string }> = [];

  for (let i = 0; i < outcomes.length; i++) {
    const outcome = outcomes[i];
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      errors.push({
        memberId: members[i].id,
        memberName: members[i].name,
        error: outcome.reason?.message || "Unknown error",
      });
    }
  }

  return { results, errors };
}

// Shared schema fragments for scope parameters
const scopeSchema = z.enum(["personal", "team"]).optional().describe(
  "Query scope: 'personal' = current user only (default), 'team' = aggregate across team members. For team scope, pass memberIds from team_roster context (only include members with the relevant connection).",
);
const memberIdsSchema = z.array(memberIdSchema).optional().describe(
  "Specific team members to query. Each entry needs id and name from team_roster. For team scope, pass all connected members. For per-member queries ('what is Sarah working on'), pass just that member.",
);

// --- Tools ---

const listTeams = defineTool({
  name: "listTeams",
  description:
    "List Linear teams visible to the current user or team members. Use scope='team' to see Linear teams across all connected team members (deduplicates by team ID, shows which members have access). The team_roster context helper tells you which members have Linear connected — only pass those as memberIds. Personal scope (default): returns teams from the current user's Linear account only.",
  tool: async ({ scope, memberIds }) => {
    if ((scope === "team" || memberIds) && memberIds?.length) {
      const { results, errors } = await apiFetchForMembers<
        { id: string; name: string; key: string }[]
      >("/api/linear/team", memberIds);

      // Deduplicate teams by ID, tracking which members see each team
      const teamMap = new Map<string, { id: string; name: string; key: string; visibleTo: string[] }>();
      for (const r of results) {
        for (const team of r.data) {
          const existing = teamMap.get(team.id);
          if (existing) {
            existing.visibleTo.push(r.memberName);
          } else {
            teamMap.set(team.id, { ...team, visibleTo: [r.memberName] });
          }
        }
      }

      return {
        teams: Array.from(teamMap.values()),
        errors: errors.length > 0 ? errors : undefined,
      };
    }

    // Personal scope
    const teams = await apiFetch<{ id: string; name: string; key: string }[]>("/api/linear/team");
    return { teams: teams.map((t) => ({ ...t, visibleTo: undefined })), errors: undefined };
  },
  inputSchema: z.object({
    scope: scopeSchema,
    memberIds: memberIdsSchema,
  }),
  outputSchema: z.object({
    teams: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        key: z.string(),
        visibleTo: z.array(z.string()).optional(),
      }),
    ),
    errors: z.array(z.object({
      memberId: z.string(),
      memberName: z.string(),
      error: z.string(),
    })).optional(),
  }),
});

const getTeamMembers = defineTool({
  name: "getTeamMembers",
  description:
    "Get members of a Linear team by team ID. Returns members with linearUserId, name, and email. Use scope='team' to query each team member's view of the Linear team (aggregates members visible across all accounts, deduplicates). The team_roster context helper tells you which members have Linear connected — only pass those as memberIds.",
  tool: async ({ teamId, scope, memberIds }) => {
    type TeamMembersResponse = {
      teamId: string;
      teamName: string;
      members: { linearUserId: string; name: string; email?: string }[];
    };

    if ((scope === "team" || memberIds) && memberIds?.length) {
      const url = `/api/linear/team?id=${encodeURIComponent(teamId)}`;
      const { results, errors } = await apiFetchForMembers<TeamMembersResponse>(url, memberIds);

      // Deduplicate members by linearUserId
      const memberMap = new Map<string, { linearUserId: string; name: string; email?: string; visibleTo: string[] }>();
      let teamName = teamId;
      for (const r of results) {
        teamName = r.data.teamName;
        for (const m of r.data.members) {
          const existing = memberMap.get(m.linearUserId);
          if (existing) {
            existing.visibleTo.push(r.memberName);
          } else {
            memberMap.set(m.linearUserId, { ...m, visibleTo: [r.memberName] });
          }
        }
      }

      return {
        teamId,
        teamName,
        members: Array.from(memberMap.values()),
        errors: errors.length > 0 ? errors : undefined,
      };
    }

    // Personal scope
    const data = await apiFetch<TeamMembersResponse>(`/api/linear/team?id=${encodeURIComponent(teamId)}`);
    return { ...data, errors: undefined };
  },
  inputSchema: z.object({
    teamId: z.string().describe("The Linear team ID"),
    scope: scopeSchema,
    memberIds: memberIdsSchema,
  }),
  outputSchema: z.object({
    teamId: z.string(),
    teamName: z.string(),
    members: z.array(
      z.object({
        linearUserId: z.string(),
        name: z.string(),
        email: z.string().optional(),
        visibleTo: z.array(z.string()).optional(),
      }),
    ),
    errors: z.array(z.object({
      memberId: z.string(),
      memberName: z.string(),
      error: z.string(),
    })).optional(),
  }),
});

const searchIssues = defineTool({
  name: "searchIssues",
  description:
    "Search Linear issues by keyword or natural language query. Use scope='team' to search across all team members' Linear accounts (results include memberName attribution). The team_roster context helper tells you which members have Linear connected — only pass those as memberIds. Personal scope (default): searches the current user's Linear account only. If the response contains both issues and errors, present the successful results and note which members had errors. Do NOT treat partial errors as a complete failure.",
  tool: async ({ query, limit, scope, memberIds }) => {
    type Issue = {
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
    };

    const params = new URLSearchParams({ query });
    if (limit) params.set("first", String(limit));

    if ((scope === "team" || memberIds) && memberIds?.length) {
      const url = `/api/linear/search?${params}`;
      const { results, errors } = await apiFetchForMembers<Issue[]>(url, memberIds);

      // Flatten results with attribution
      const attributed: Array<Issue & { memberName: string }> = [];
      for (const r of results) {
        for (const issue of r.data) {
          attributed.push({ ...issue, memberName: r.memberName });
        }
      }

      return { issues: attributed, errors: errors.length > 0 ? errors : undefined };
    }

    // Personal scope
    const issues = await apiFetch<Issue[]>(`/api/linear/search?${params}`);
    return { issues: issues.map((i) => ({ ...i, memberName: undefined })), errors: undefined };
  },
  inputSchema: z.object({
    query: z.string().describe("Search query — keywords, issue identifier, or natural language"),
    limit: z.number().optional().describe("Max results to return (default 20, max 50)"),
    scope: scopeSchema,
    memberIds: memberIdsSchema,
  }),
  outputSchema: z.object({
    issues: z.array(
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
        memberName: z.string().optional(),
      }),
    ),
    errors: z.array(z.object({
      memberId: z.string(),
      memberName: z.string(),
      error: z.string(),
    })).optional().describe("Per-member errors (e.g. account not connected). Presence of errors does NOT mean the tool call failed — always present issues results for successful members and note which members had errors."),
  }),
});

const getPullRequests = defineTool({
  name: "getPullRequests",
  description:
    "Fetch GitHub pull requests for the current user or across team members. Use scope='team' to get PRs from all connected team members (results include memberName attribution). The team_roster context helper tells you which members have GitHub connected — only pass those as memberIds. Personal scope (default): fetches the current user's PRs. Supports filtering by author, repo, org, date range. If the response contains both pullRequests and errors, present the successful results to the user and mention which members had errors (e.g. 'GitHub not connected for [name]'). Do NOT treat partial errors as a complete failure.",
  tool: async ({ scope, memberIds, author, repo, org, since, until }) => {
    type PR = {
      number: number;
      title: string;
      state: string;
      url: string;
      repo: string;
      labels: { name: string; color: string }[];
      createdAt: string;
      updatedAt: string;
      mergedAt: string | null;
      author: string;
      authorAvatar: string;
    };

    const params = new URLSearchParams();
    if (author) params.set("author", author);
    if (repo) params.set("repo", repo);
    if (org) params.set("org", org);
    if (since) params.set("since", since);
    if (until) params.set("until", until);

    const queryString = params.toString();
    const baseUrl = queryString ? `/api/github/prs?${queryString}` : "/api/github/prs";

    if ((scope === "team" || memberIds) && memberIds?.length) {
      const { results, errors } = await apiFetchForMembers<PR[]>(baseUrl, memberIds);

      // Flatten results with attribution
      const attributed: Array<PR & { memberName: string }> = [];
      for (const r of results) {
        // API may return a single PR object or array depending on query
        const prs = Array.isArray(r.data) ? r.data : [r.data];
        for (const pr of prs) {
          attributed.push({ ...pr, memberName: r.memberName });
        }
      }

      return { pullRequests: attributed, errors: errors.length > 0 ? errors : undefined };
    }

    // Personal scope
    const prs = await apiFetch<PR[]>(baseUrl);
    return { pullRequests: prs.map((pr) => ({ ...pr, memberName: undefined })), errors: undefined };
  },
  inputSchema: z.object({
    scope: scopeSchema,
    memberIds: memberIdsSchema,
    author: z.string().optional().describe("GitHub username to filter by (for personal scope)"),
    repo: z.string().optional().describe("Repository name or owner/name slug"),
    org: z.string().optional().describe("GitHub organization to filter by"),
    since: z.string().optional().describe("Start date filter (YYYY-MM-DD)"),
    until: z.string().optional().describe("End date filter (YYYY-MM-DD)"),
  }),
  outputSchema: z.object({
    pullRequests: z.array(
      z.object({
        number: z.number(),
        title: z.string(),
        state: z.string(),
        url: z.string(),
        repo: z.string(),
        labels: z.array(z.object({ name: z.string(), color: z.string() })),
        createdAt: z.string(),
        updatedAt: z.string(),
        mergedAt: z.string().nullable(),
        author: z.string(),
        authorAvatar: z.string(),
        memberName: z.string().optional(),
      }),
    ),
    errors: z.array(z.object({
      memberId: z.string(),
      memberName: z.string(),
      error: z.string(),
    })).optional().describe("Per-member errors (e.g. account not connected). Presence of errors does NOT mean the tool call failed — always present pullRequests results for successful members and note which members had errors."),
  }),
});

export const tools: TamboTool[] = [listTeams, getTeamMembers, searchIssues, getPullRequests];

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
      "Shows all team members with status, issue counts, and top issue. ONLY pass the Linear team ID — the component fetches its own data using the current user's Linear token. For cross-team aggregated views, use tools with scope='team' and render results via SummaryPanel instead.",
    component: TeamOverview,
    propsSchema: teamOverviewSchema,
  },
  {
    name: "PersonDetail",
    description:
      "Detailed view of one person's Linear issues and GitHub PRs. Pass their Linear user ID and name. Get their GitHub username from the team_roster context helper and pass it as githubUsername. This component fetches using the current user's token. For viewing a team member's own data (from their account), use tools with that member's forUserId and render via SummaryPanel.",
    component: PersonDetail,
    propsSchema: personDetailSchema,
  },
  {
    name: "PullRequestList",
    description:
      "Shows GitHub pull requests for a repo, org, or author. The component fetches its own data — just pass the filters. For cross-team PR views, use getPullRequests tool with scope='team' and render results via SummaryPanel.",
    component: PullRequestList,
    propsSchema: pullRequestListSchema,
  },
  {
    name: "WeeklyGoals",
    description:
      "Progress tracker with items grouped by status (done, in-progress, not-started) and a progress bar. You provide the data: { title, subtitle?, items: [{ identifier, title, status, assignee?, isAtRisk?, url? }] }. Use tools to discover what people are working on, then build the items list yourself. Items can include an optional assignee field for attribution in cross-team views.",
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
      "A flexible panel for displaying any structured information. Supports a title, subtitle, stat cards (label + value + optional trend/color), free-form body text, and sections with items (each item has label, detail, status, optional URL). Ideal for cross-team aggregated results with attribution — use sections to group by team member, or use stats to show per-member metrics. Use this for comparisons, summaries, daily digests, custom reports, or ANY content that doesn't fit the specialized components.",
    component: SummaryPanel,
    propsSchema: summaryPanelSchema,
  },
];
