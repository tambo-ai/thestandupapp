"use client";

import { useFetchJSON } from "@/lib/use-fetch-json";
import { useMemo, useState } from "react";
import { z } from "zod";

export const pullRequestListSchema = z.object({
  repo: z
    .string()
    .optional()
    .describe(
      "Repository to fetch PRs for — 'owner/name' or just 'name' (auto-qualified with configured org)",
    ),
  author: z.string().optional().describe("GitHub username to filter by"),
  org: z.string().optional().describe("GitHub org to scope search"),
  title: z.string().optional().describe("Optional heading to display above the list"),
});

interface PRItem {
  number: number;
  title: string;
  state: string;
  url: string;
  repo: string;
  author?: string;
  authorAvatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

const PR_STATE_COLORS: Record<string, string> = {
  merged: "#8B5CF6",
  closed: "#C45555",
  open: "#4CAF50",
  draft: "#889096",
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
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "#BBB" }}>
            {pr.state}
          </span>
          {pr.author && (
            <span className="text-[10px]" style={{ color: "#BBB" }}>
              {pr.author}
            </span>
          )}
        </div>
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
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-8 bg-[#F0F0F0] rounded" />
      ))}
    </div>
  );
}

function toggleFilter(
  current: Set<string> | null,
  setter: (v: Set<string> | null) => void,
  allKeys: string[],
  key: string,
) {
  if (current === null) {
    setter(new Set([key]));
  } else if (current.has(key)) {
    const next = new Set(current);
    next.delete(key);
    setter(next.size === 0 ? null : next);
  } else {
    const next = new Set(current);
    next.add(key);
    setter(next.size === allKeys.length ? null : next);
  }
}

type PullRequestListProps = z.infer<typeof pullRequestListSchema>;

export function PullRequestList({
  repo,
  author,
  org,
  title,
}: Partial<PullRequestListProps>) {
  const params = new URLSearchParams();
  if (repo) params.set("repo", repo);
  if (author) params.set("author", author);
  if (org) params.set("org", org);
  const qs = params.toString();

  const { data, error } = useFetchJSON<PRItem[]>(qs ? `/api/github/prs?${qs}` : null);
  const prs = data ? (Array.isArray(data) ? data : []) : null;

  const [activePrStates, setActivePrStates] = useState<Set<string> | null>(null);
  const [activePrRepos, setActivePrRepos] = useState<Set<string> | null>(null);
  const [activePrAuthors, setActivePrAuthors] = useState<Set<string> | null>(null);

  const stateOptions = useMemo<FilterOption[]>(() => {
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

  const repoOptions = useMemo<FilterOption[]>(() => {
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

  const authorOptions = useMemo<FilterOption[]>(() => {
    if (!prs) return [];
    const counts: Record<string, number> = {};
    for (const pr of prs) {
      const a = pr.author || "unknown";
      counts[a] = (counts[a] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        key,
        label: key,
        color: "#666",
        count,
      }));
  }, [prs]);

  const filteredPrs = useMemo(() => {
    if (!prs) return null;
    return prs.filter((pr) => {
      if (activePrStates && !activePrStates.has(pr.state)) return false;
      if (activePrRepos && !activePrRepos.has(pr.repo)) return false;
      if (activePrAuthors && !activePrAuthors.has(pr.author || "unknown")) return false;
      return true;
    });
  }, [prs, activePrStates, activePrRepos, activePrAuthors]);

  const heading = title || [repo, author, org].filter(Boolean).join(" / ") || "Pull Requests";
  const loading = prs === null && !error;

  return (
    <div className="space-y-3">
      <div
        className="text-[11px] uppercase tracking-wider font-medium"
        style={{ color: "#AAA" }}
      >
        {heading} {prs ? `(${prs.length})` : ""}
      </div>

      {error && (
        <p className="text-[13px]" style={{ color: "#C45555" }}>
          Failed to load PRs: {error}
        </p>
      )}

      {loading && <Skeleton />}

      {prs && prs.length > 0 && (
        <div>
          <FilterPills
            options={stateOptions}
            active={activePrStates}
            onToggle={(key) =>
              toggleFilter(activePrStates, setActivePrStates, stateOptions.map((o) => o.key), key)
            }
          />
          <FilterPills
            options={repoOptions}
            active={activePrRepos}
            onToggle={(key) =>
              toggleFilter(activePrRepos, setActivePrRepos, repoOptions.map((o) => o.key), key)
            }
          />
          <FilterPills
            options={authorOptions}
            active={activePrAuthors}
            onToggle={(key) =>
              toggleFilter(activePrAuthors, setActivePrAuthors, authorOptions.map((o) => o.key), key)
            }
          />
          {filteredPrs!.length === 0 ? (
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

      {prs && prs.length === 0 && (
        <p className="text-[13px]" style={{ color: "#CCC" }}>
          No pull requests found.
        </p>
      )}
    </div>
  );
}
