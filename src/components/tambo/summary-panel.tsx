"use client";

import { z } from "zod";

const statSchema = z.object({
  label: z.string().describe("Stat label"),
  value: z.string().describe("Stat value (e.g. '12', '87%', '$1.2M')"),
  trend: z
    .enum(["up", "down", "neutral"])
    .optional()
    .describe("Optional trend direction"),
  color: z
    .enum(["green", "red", "yellow", "gray"])
    .optional()
    .describe("Optional accent color"),
});

const sectionItemSchema = z.object({
  label: z.string().describe("Item text"),
  detail: z.string().optional().describe("Secondary text or value"),
  status: z
    .enum(["done", "in-progress", "blocked", "pending", "none"])
    .optional()
    .describe("Optional status indicator"),
  url: z.string().optional().describe("Optional link URL"),
});

const sectionSchema = z.object({
  title: z.string().describe("Section heading"),
  items: z.array(sectionItemSchema).describe("Items in this section"),
});

export const summaryPanelSchema = z.object({
  title: z.string().describe("Panel title"),
  subtitle: z.string().optional().describe("Optional subtitle or date range"),
  stats: z
    .array(statSchema)
    .optional()
    .describe("Optional row of stat cards at the top"),
  sections: z
    .array(sectionSchema)
    .optional()
    .describe("Optional content sections with items"),
  body: z
    .string()
    .optional()
    .describe(
      "Optional free-form text content (plain text or simple markdown)",
    ),
});

type SummaryPanelProps = z.infer<typeof summaryPanelSchema>;

const STATUS_ICONS: Record<string, { symbol: string; color: string }> = {
  done: { symbol: "\u2713", color: "#4CAF50" },
  "in-progress": { symbol: "\u25CB", color: "#F5A623" },
  blocked: { symbol: "\u2716", color: "#C45555" },
  pending: { symbol: "\u2014", color: "#CCC" },
  none: { symbol: "", color: "transparent" },
};

const STAT_COLORS: Record<string, string> = {
  green: "#4CAF50",
  red: "#C45555",
  yellow: "#F5A623",
  gray: "#999",
};

const TREND_ARROWS: Record<string, { symbol: string; color: string }> = {
  up: { symbol: "\u2191", color: "#4CAF50" },
  down: { symbol: "\u2193", color: "#C45555" },
  neutral: { symbol: "\u2192", color: "#999" },
};

function StatCard({ stat }: { stat: z.infer<typeof statSchema> }) {
  const accentColor = stat.color ? STAT_COLORS[stat.color] : "#1A1A1A";
  const trend = stat.trend ? TREND_ARROWS[stat.trend] : null;

  return (
    <div className="flex-1 min-w-[120px] rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider" style={{ color: "#AAA" }}>
        {stat.label}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span
          className="text-[22px] font-semibold leading-none"
          style={{ color: accentColor }}
        >
          {stat.value}
        </span>
        {trend && (
          <span className="text-[13px]" style={{ color: trend.color }}>
            {trend.symbol}
          </span>
        )}
      </div>
    </div>
  );
}

function SectionItem({ item }: { item: z.infer<typeof sectionItemSchema> }) {
  const status = item.status ? STATUS_ICONS[item.status] || STATUS_ICONS.none : null;

  const inner = (
    <div className="flex items-start gap-2.5 py-2">
      {status && status.symbol && (
        <span
          className="text-[13px] w-5 text-center shrink-0 mt-px"
          style={{ color: status.color, fontFamily: "var(--font-mono)" }}
        >
          {status.symbol}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-[13px]" style={{ color: "#333" }}>
          {item.label}
        </span>
        {item.detail && (
          <span className="text-[11px] ml-2" style={{ color: "#BBB" }}>
            {item.detail}
          </span>
        )}
      </div>
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

export function SummaryPanel({
  title,
  subtitle,
  stats,
  sections,
  body,
}: Partial<SummaryPanelProps>) {
  if (!title) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium" style={{ color: "#1A1A1A" }}>
          {title}
        </h2>
        {subtitle && (
          <span className="text-[12px]" style={{ color: "#AAA" }}>
            {subtitle}
          </span>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} />
          ))}
        </div>
      )}

      {body && (
        <p
          className="text-[13px] leading-relaxed whitespace-pre-wrap"
          style={{ color: "#555" }}
        >
          {body}
        </p>
      )}

      {sections &&
        sections.map((section, i) => {
          const items = section.items ?? [];
          return (
            <div key={i}>
              <div
                className="text-[11px] uppercase tracking-wider mb-1 font-medium"
                style={{ color: "#AAA" }}
              >
                {section.title} ({items.length})
              </div>
              <div className="divide-y divide-[rgba(0,0,0,0.04)]">
                {items.map((item, j) => (
                  <SectionItem key={j} item={item} />
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
