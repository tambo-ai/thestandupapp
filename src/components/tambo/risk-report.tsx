"use client";

import { useFetchJSON } from "@/lib/use-fetch-json";
import { z } from "zod";

export const riskReportSchema = z.object({
  teamId: z.string().describe("Linear team ID to analyze risks for"),
  teamName: z.string().optional().describe("Team display name"),
});

interface RiskItem {
  identifier: string;
  title: string;
  assignee?: string;
  reason: string;
  daysSinceUpdate?: number;
  url?: string;
}

interface RiskSection {
  category: string;
  severity: "high" | "medium";
  items: RiskItem[];
}

interface RiskData {
  teamName: string;
  generatedAt: string;
  sections: RiskSection[];
  totalRisks: number;
}

const SEVERITY_CONFIG = {
  high: { color: "#C45555", bg: "rgba(196,85,85,0.08)" },
  medium: { color: "#F5A623", bg: "rgba(245,166,35,0.08)" },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  overdue: "Overdue",
  stale: "Stale (no recent updates)",
  unassigned: "Unassigned",
  "pending-review": "PRs pending review",
};

function RiskItemRow({ item }: { item: RiskItem }) {
  let ageSeverity: { color: string; bg: string } | null = null;
  if (item.daysSinceUpdate !== undefined) {
    ageSeverity = item.daysSinceUpdate >= 5 ? SEVERITY_CONFIG.high : SEVERITY_CONFIG.medium;
  }

  const inner = (
    <div className="flex items-start gap-2.5 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] shrink-0"
            style={{ color: "#AAA", fontFamily: "var(--font-mono)" }}
          >
            {item.identifier}
          </span>
          <span className="text-[13px] truncate" style={{ color: "#333" }}>
            {item.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px]" style={{ color: "#C45555" }}>
            {item.reason}
          </span>
          {item.assignee && (
            <span className="text-[11px]" style={{ color: "#BBB" }}>
              · {item.assignee}
            </span>
          )}
        </div>
      </div>
      {ageSeverity && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{ color: ageSeverity.color, background: ageSeverity.bg, fontFamily: "var(--font-mono)" }}
        >
          {item.daysSinceUpdate}d
        </span>
      )}
    </div>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
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

function SectionBlock({ section }: { section: RiskSection }) {
  const severity = SEVERITY_CONFIG[section.severity];
  const label = CATEGORY_LABELS[section.category] || section.category;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: severity.color }}
        />
        <span
          className="text-[11px] uppercase tracking-wider font-medium"
          style={{ color: severity.color }}
        >
          {label} ({section.items.length})
        </span>
      </div>
      <div className="divide-y divide-[rgba(0,0,0,0.04)]">
        {section.items.map((item) => (
          <RiskItemRow key={item.identifier} item={item} />
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="h-4 bg-[#F0F0F0] rounded w-32" />
        <div className="h-5 bg-[#F0F0F0] rounded-full w-16" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-[#F0F0F0] rounded w-24" />
            <div className="h-8 bg-[#F0F0F0] rounded" />
            <div className="h-8 bg-[#F0F0F0] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

type RiskReportProps = z.infer<typeof riskReportSchema>;

export function RiskReport({
  teamId,
  teamName: hintName,
}: Partial<RiskReportProps>) {
  const { data, error } = useFetchJSON<RiskData>(
    teamId ? `/api/linear/risks?teamId=${teamId}` : null,
  );

  if (!teamId) return null;

  const displayName = hintName || data?.teamName || "Team";

  if (error) {
    return (
      <div className="space-y-3">
        <h2 className="text-[15px] font-medium" style={{ color: "#1A1A1A" }}>
          Risk Report
        </h2>
        <p className="text-[13px]" style={{ color: "#C45555" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h2
          className="text-[15px] font-medium mb-4"
          style={{ color: "#1A1A1A" }}
        >
          {displayName} — Risk Report
        </h2>
        <Skeleton />
      </div>
    );
  }

  const visibleSections = data.sections.filter((s) => s.items.length > 0);

  if (visibleSections.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-[15px] font-medium" style={{ color: "#1A1A1A" }}>
          {displayName} — Risk Report
        </h2>
        <p className="text-[13px]" style={{ color: "#4CAF50" }}>
          No risks detected. Everything looks on track.
        </p>
      </div>
    );
  }

  const hasHigh = visibleSections.some((s) => s.severity === "high");
  const badgeStyle = hasHigh ? SEVERITY_CONFIG.high : SEVERITY_CONFIG.medium;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2.5">
          <h2
            className="text-[15px] font-medium"
            style={{ color: "#1A1A1A" }}
          >
            {displayName} — Risk Report
          </h2>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ color: badgeStyle.color, background: badgeStyle.bg }}
          >
            {data.totalRisks} {data.totalRisks === 1 ? "item" : "items"}
          </span>
        </div>
        {data.generatedAt && (
          <span className="text-[10px]" style={{ color: "#CCC" }}>
            {data.generatedAt}
          </span>
        )}
      </div>

      {visibleSections.map((section) => (
        <SectionBlock key={section.category} section={section} />
      ))}
    </div>
  );
}
