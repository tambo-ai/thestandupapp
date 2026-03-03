"use client";

import { useFetchJSON } from "@/lib/use-fetch-json";
import { z } from "zod";
import { useMemo, useState } from "react";

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

const STATE_TYPE_ORDER: Record<string, number> = {
  started: 0,
  unstarted: 1,
  backlog: 2,
  completed: 3,
  canceled: 4,
  cancelled: 4,
};

const PRIORITY_CONFIG: Record<
  string,
  { color: string; order: number }
> = {
  Urgent: { color: "#E5484D", order: 0 },
  High: { color: "#F5A623", order: 1 },
  Medium: { color: "#F5A623", order: 2 },
  Low: { color: "#889096", order: 3 },
  "No priority": { color: "#CCC", order: 4 },
};

const PR_STATE_ORDER: Record<string, number> = {
  open: 0,
  draft: 1,
  merged: 2,
  closed: 3,
};

interface FilterOption {
  key: string;
  label: string;
  color: string;
  count: number;
}

function FilterPills({
  options,
  active,
  onToggle,
}: {
  options: FilterOption[];
  active: Set<string> | null;
  onToggle: (key: string) => void;
}) {
  if (options.length <= 1) return null;
  const allActive = active === null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {options.map((opt) => {
        const isOn = allActive || active!.has(opt.key);
        return (
          <button
            key={opt.key}
            onClick={() => onToggle(opt.key)}
            className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer"
            style={{
              color: isOn ? opt.color : "#CCC",
              background: isOn ? `${opt.color}12` : "transparent",
              borderColor: isOn ? `${opt.color}50` : "rgba(0,0,0,0.05)",
              opacity: isOn ? 1 : 0.45,
              textDecoration: isOn ? "none" : "line-through",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: isOn ? opt.color : "#DDD" }}
            />
            {opt.label}
            <span style={{ opacity: 0.6 }}>{opt.count}</span>
          </button>
        );
      })}
    </div>
  );
}

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

  // Fetch PRs — the route resolves name/email to GitHub username automatically
  const prUrl = githubUsername
    ? `/api/github/prs?author=${encodeURIComponent(githubUsername)}`
    : name
      ? `/api/github/prs?name=${encodeURIComponent(name)}`
      : null;
  const { data: prsData } = useFetchJSON<PRItem[]>(prUrl);
  const prs = prsData ? (Array.isArray(prsData) ? prsData : []) : null;

  const [activeStatuses, setActiveStatuses] = useState<Set<string> | null>(null);
  const [activePriorities, setActivePriorities] = useState<Set<string> | null>(null);
  const [activePrStates, setActivePrStates] = useState<Set<string> | null>(null);
  const [activePrRepos, setActivePrRepos] = useState<Set<string> | null>(null);

  function toggleFilter(
    current: Set<string> | null,
    setter: (v: Set<string> | null) => void,
    allKeys: string[],
    key: string,
  ) {
    if (current === null) {
      // All active → deactivate all except clicked
      setter(new Set([key]));
    } else if (current.has(key)) {
      const next = new Set(current);
      next.delete(key);
      // If nothing left, reset to all
      setter(next.size === 0 ? null : next);
    } else {
      const next = new Set(current);
      next.add(key);
      // If all selected, reset to null
      setter(next.size === allKeys.length ? null : next);
    }
  }

  const statusOptions = useMemo<FilterOption[]>(() => {
    if (!issues) return [];
    const counts: Record<string, { color: string; type: string; count: number }> = {};
    for (const issue of issues) {
      const name = issue.state?.name || "Unknown";
      if (!counts[name]) counts[name] = { color: issue.state?.color || "#CCC", type: issue.state?.type || "backlog", count: 0 };
      counts[name].count++;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => (STATE_TYPE_ORDER[a.type] ?? 99) - (STATE_TYPE_ORDER[b.type] ?? 99))
      .map(([key, v]) => ({ key, label: key, color: v.color, count: v.count }));
  }, [issues]);

  const priorityOptions = useMemo<FilterOption[]>(() => {
    if (!issues) return [];
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      const p = issue.priorityLabel || "No priority";
      counts[p] = (counts[p] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([a], [b]) => (PRIORITY_CONFIG[a]?.order ?? 99) - (PRIORITY_CONFIG[b]?.order ?? 99))
      .map(([key, count]) => ({
        key,
        label: key,
        color: PRIORITY_CONFIG[key]?.color || "#CCC",
        count,
      }));
  }, [issues]);

  const orderedIssueGroups = useMemo(() => {
    if (!issues) return [];
    const filtered = issues.filter((issue) => {
      const statusName = issue.state?.name || "Unknown";
      const priority = issue.priorityLabel || "No priority";
      if (activeStatuses && !activeStatuses.has(statusName)) return false;
      if (activePriorities && !activePriorities.has(priority)) return false;
      return true;
    });
    const groups: Record<string, { type: string; color: string; items: IssueItem[] }> = {};
    for (const issue of filtered) {
      const key = issue.state?.name || "Unknown";
      if (!groups[key]) groups[key] = { type: issue.state?.type || "backlog", color: issue.state?.color || "#CCC", items: [] };
      groups[key].items.push(issue);
    }
    return Object.entries(groups).sort(
      ([, a], [, b]) => (STATE_TYPE_ORDER[a.type] ?? 99) - (STATE_TYPE_ORDER[b.type] ?? 99),
    );
  }, [issues, activeStatuses, activePriorities]);

  const prStateOptions = useMemo<FilterOption[]>(() => {
    if (!prs) return [];
    const counts: Record<string, number> = {};
    for (const pr of prs) counts[pr.state] = (counts[pr.state] || 0) + 1;
    return Object.entries(counts)
      .sort(([a], [b]) => (PR_STATE_ORDER[a] ?? 99) - (PR_STATE_ORDER[b] ?? 99))
      .map(([key, count]) => ({
        key,
        label: key,
        color: PR_STATE_COLORS[key] || "#4CAF50",
        count,
      }));
  }, [prs]);

  const prRepoOptions = useMemo<FilterOption[]>(() => {
    if (!prs) return [];
    const counts: Record<string, number> = {};
    for (const pr of prs) counts[pr.repo] = (counts[pr.repo] || 0) + 1;
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        key,
        label: key.includes("/") ? key.split("/").pop()! : key,
        color: "#666",
        count,
      }));
  }, [prs]);

  const filteredPrs = useMemo(() => {
    if (!prs) return null;
    return prs.filter((pr) => {
      if (activePrStates && !activePrStates.has(pr.state)) return false;
      if (activePrRepos && !activePrRepos.has(pr.repo)) return false;
      return true;
    });
  }, [prs, activePrStates, activePrRepos]);

  const computedStatus = useMemo<"on-track" | "at-risk" | "idle">(() => {
    if (!issues?.some((i) => i.state?.type === "started")) return "idle";
    const now = Date.now();
    const hasStale = issues.some(
      (i) =>
        i.state?.type === "started" &&
        (now - new Date(i.updatedAt).getTime()) / 86400000 > 3,
    );
    return hasStale ? "at-risk" : "on-track";
  }, [issues]);

  if (!name) return null;

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
          <FilterPills
            options={statusOptions}
            active={activeStatuses}
            onToggle={(key) => toggleFilter(activeStatuses, setActiveStatuses, statusOptions.map((o) => o.key), key)}
          />
          <FilterPills
            options={priorityOptions}
            active={activePriorities}
            onToggle={(key) => toggleFilter(activePriorities, setActivePriorities, priorityOptions.map((o) => o.key), key)}
          />
          {orderedIssueGroups.length === 0 ? (
            <p className="text-[12px] py-2" style={{ color: "#BBB" }}>
              No issues match the current filters.
            </p>
          ) : (
            <div className="space-y-3">
              {orderedIssueGroups.map(([statusName, { items }]) => (
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
          )}
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
          <FilterPills
            options={prStateOptions}
            active={activePrStates}
            onToggle={(key) => toggleFilter(activePrStates, setActivePrStates, prStateOptions.map((o) => o.key), key)}
          />
          <FilterPills
            options={prRepoOptions}
            active={activePrRepos}
            onToggle={(key) => toggleFilter(activePrRepos, setActivePrRepos, prRepoOptions.map((o) => o.key), key)}
          />
          {filteredPrs && filteredPrs.length === 0 ? (
            <p className="text-[12px] py-2" style={{ color: "#BBB" }}>
              No PRs match the current filters.
            </p>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {filteredPrs!.map((pr) => (
                <PRRow key={`${pr.repo}-${pr.number}`} pr={pr} />
              ))}
            </div>
          )}
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
