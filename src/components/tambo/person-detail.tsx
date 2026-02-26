"use client";

import { useFetchJSON } from "@/lib/use-fetch-json";
import { z } from "zod";
import * as React from "react";

export const personDetailSchema = z.object({
  linearUserId: z.string().describe("Linear user ID to fetch issues for"),
  name: z.string().describe("Person's display name"),
  githubUsername: z
    .string()
    .optional()
    .describe("GitHub username to fetch PRs for"),
  avatar: z.string().optional().describe("Avatar URL"),
  role: z.string().optional().describe("Role or title"),
  summary: z
    .string()
    .optional()
    .describe("AI-generated 1-2 sentence summary of what they're focused on"),
});

interface IssueItem {
  identifier: string;
  title: string;
  url: string;
  priorityLabel: string;
  state: { name: string; color: string; type: string } | null;
  updatedAt: string;
}

interface PRItem {
  number: number;
  title: string;
  state: string;
  url: string;
  repo: string;
}

const STATUS_CONFIG = {
  "on-track": {
    color: "#4CAF50",
    label: "On track",
    bg: "rgba(76,175,80,0.08)",
  },
  "at-risk": {
    color: "#F5A623",
    label: "At risk",
    bg: "rgba(245,166,35,0.08)",
  },
  idle: { color: "#CCC", label: "Idle", bg: "rgba(0,0,0,0.03)" },
} as const;

function IssueRow({ issue }: { issue: IssueItem }) {
  const inner = (
    <div className="flex items-start gap-2 py-1.5">
      {issue.state?.color && (
        <span
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: issue.state.color }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] shrink-0"
            style={{ color: "#AAA", fontFamily: "var(--font-mono)" }}
          >
            {issue.identifier}
          </span>
          <span className="text-[13px] truncate" style={{ color: "#333" }}>
            {issue.title}
          </span>
        </div>
        {issue.priorityLabel && (
          <span className="text-[10px]" style={{ color: "#BBB" }}>
            {issue.priorityLabel}
          </span>
        )}
      </div>
    </div>
  );

  if (issue.url) {
    return (
      <a
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:bg-[rgba(0,0,0,0.02)] rounded px-2 -mx-2 transition-colors"
      >
        {inner}
      </a>
    );
  }
  return <div className="px-2 -mx-2">{inner}</div>;
}

const PR_STATE_COLORS: Record<string, string> = {
  merged: "#8B5CF6",
  closed: "#C45555",
  open: "#4CAF50",
};

function PRRow({ pr }: { pr: PRItem }) {
  const inner = (
    <div className="flex items-start gap-2 py-1.5">
      <span
        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
        style={{ background: PR_STATE_COLORS[pr.state] || "#4CAF50" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] shrink-0"
            style={{ color: "#AAA", fontFamily: "var(--font-mono)" }}
          >
            {pr.repo} #{pr.number}
          </span>
          <span className="text-[13px] truncate" style={{ color: "#333" }}>
            {pr.title}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "#BBB" }}>
          {pr.state}
        </span>
      </div>
    </div>
  );

  if (pr.url) {
    return (
      <a
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:bg-[rgba(0,0,0,0.02)] rounded px-2 -mx-2 transition-colors"
      >
        {inner}
      </a>
    );
  }
  return <div className="px-2 -mx-2">{inner}</div>;
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-3 bg-[#F0F0F0] rounded w-48" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-[#F0F0F0] rounded" />
        ))}
      </div>
    </div>
  );
}

type PersonDetailProps = z.infer<typeof personDetailSchema>;

export function PersonDetail({
  linearUserId,
  name,
  githubUsername,
  avatar,
  role,
  summary,
}: Partial<PersonDetailProps>) {
  const { data: issuesData, error } = useFetchJSON<IssueItem[]>(
    linearUserId ? `/api/linear/issues?userId=${linearUserId}` : null,
  );
  const issues = issuesData ? (Array.isArray(issuesData) ? issuesData : []) : null;
  const [prs, setPRs] = React.useState<PRItem[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchPRs() {
      let author = githubUsername;

      // If no GitHub username provided, try to find by name
      if (!author && name) {
        try {
          const findRes = await fetch(
            `/api/github/find-user?name=${encodeURIComponent(name)}`,
          );
          const findData = await findRes.json();
          if (findData.bestMatch) {
            author = findData.bestMatch;
          }
        } catch {}
      }

      if (!author) {
        if (!cancelled) setPRs([]);
        return;
      }

      try {
        const res = await fetch(`/api/github/prs?author=${author}`);
        const data = await res.json();
        if (!cancelled) setPRs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setPRs([]);
      }
    }

    fetchPRs();

    return () => {
      cancelled = true;
    };
  }, [githubUsername, name]);

  const issuesByStatus = React.useMemo(() => {
    if (!issues) return {};
    const groups: Record<string, IssueItem[]> = {};
    for (const issue of issues) {
      const key = issue.state?.name || "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(issue);
    }
    return groups;
  }, [issues]);

  if (!name) return null;

  const hasInProgress = issues?.some((i) => i.state?.type === "started");
  let computedStatus: "on-track" | "at-risk" | "idle" = "idle";
  if (hasInProgress) {
    const now = Date.now();
    const hasStale = issues?.some(
      (i) =>
        i.state?.type === "started" &&
        (now - new Date(i.updatedAt).getTime()) / 86400000 > 3,
    );
    computedStatus = hasStale ? "at-risk" : "on-track";
  }

  const statusConfig = STATUS_CONFIG[computedStatus];
  const loading = issues === null;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        {avatar ? (
          <img src={avatar} alt={name} className="w-10 h-10 rounded-full" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-medium"
            style={{ background: "#F0F0F0", color: "#888" }}
          >
            {name.charAt(0)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-[15px] font-medium"
              style={{ color: "#1A1A1A" }}
            >
              {name}
            </h2>
            {!loading && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  color: statusConfig.color,
                  background: statusConfig.bg,
                }}
              >
                {statusConfig.label}
              </span>
            )}
          </div>
          {role && (
            <span className="text-[12px]" style={{ color: "#AAA" }}>
              {role}
            </span>
          )}
        </div>
      </div>

      {summary && (
        <p className="text-[13px] leading-relaxed" style={{ color: "#666" }}>
          {summary}
        </p>
      )}

      {error && (
        <p className="text-[13px]" style={{ color: "#C45555" }}>
          Failed to load issues: {error}
        </p>
      )}

      {loading && !error && <Skeleton />}

      {issues && issues.length > 0 && (
        <div>
          <div
            className="text-[11px] uppercase tracking-wider mb-2 font-medium"
            style={{ color: "#AAA" }}
          >
            Issues ({issues.length})
          </div>
          <div className="space-y-3">
            {Object.entries(issuesByStatus).map(([statusName, items]) => (
              <div key={statusName}>
                <div className="text-[11px] mb-1" style={{ color: "#BBB" }}>
                  {statusName} ({items.length})
                </div>
                <div className="divide-y divide-[rgba(0,0,0,0.04)]">
                  {items.map((issue) => (
                    <IssueRow key={issue.identifier} issue={issue} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prs && prs.length > 0 && (
        <div>
          <div
            className="text-[11px] uppercase tracking-wider mb-2 font-medium"
            style={{ color: "#AAA" }}
          >
            Pull Requests ({prs.length})
          </div>
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            {prs.map((pr) => (
              <PRRow key={`${pr.repo}-${pr.number}`} pr={pr} />
            ))}
          </div>
        </div>
      )}

      {issues && issues.length === 0 && prs && prs.length === 0 && (
        <p className="text-[13px]" style={{ color: "#CCC" }}>
          No active work found.
        </p>
      )}
    </div>
  );
}
