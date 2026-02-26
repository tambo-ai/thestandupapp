"use client";

import { z } from "zod";

const goalItemSchema = z.object({
  identifier: z.string().describe("Short ID like 'ENG-42'"),
  title: z.string().describe("Goal/issue title"),
  status: z
    .enum(["done", "in-progress", "not-started"])
    .describe("Current status"),
  assignee: z.string().optional().describe("Person responsible"),
  isAtRisk: z
    .boolean()
    .optional()
    .describe("Flag as at-risk (overdue or stale)"),
  url: z.string().optional().describe("Link to the item"),
});

export const weeklyGoalsSchema = z.object({
  title: z
    .string()
    .optional()
    .describe("Heading (e.g. 'Sprint 14' or 'This Week's Goals')"),
  subtitle: z.string().optional().describe("Date range or extra context"),
  items: z
    .array(goalItemSchema)
    .describe("Goal items to display — you provide the data"),
  totalItems: z
    .number()
    .optional()
    .describe("Total item count for progress bar (defaults to items.length)"),
  completedItems: z
    .number()
    .optional()
    .describe("Completed count for progress bar (defaults to counting done items)"),
});

interface GoalItem {
  identifier: string;
  title: string;
  status: "done" | "in-progress" | "not-started";
  assignee?: string;
  isAtRisk?: boolean;
  url?: string;
}

const STATUS_ICON: Record<string, { symbol: string; color: string }> = {
  done: { symbol: "\u2713", color: "#4CAF50" },
  "in-progress": { symbol: "\u25CB", color: "#F5A623" },
  "not-started": { symbol: "\u2014", color: "#CCC" },
};

function titleColor(isDone: boolean, isAtRisk?: boolean): string {
  if (isDone) return "#BBB";
  if (isAtRisk) return "#C45555";
  return "#333";
}

function GoalItemRow({ item }: { item: GoalItem }) {
  const icon = STATUS_ICON[item.status] || STATUS_ICON["not-started"];
  const isDone = item.status === "done";

  const inner = (
    <div className="flex items-start gap-2.5 py-2">
      <span
        className="text-[13px] w-5 text-center shrink-0 mt-px"
        style={{ color: icon.color, fontFamily: "var(--font-mono)" }}
      >
        {icon.symbol}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] shrink-0"
            style={{
              color: isDone ? "#CCC" : "#AAA",
              fontFamily: "var(--font-mono)",
            }}
          >
            {item.identifier}
          </span>
          <span
            className="text-[13px] truncate"
            style={{
              color: titleColor(isDone, item.isAtRisk),
              textDecoration: isDone ? "line-through" : undefined,
            }}
          >
            {item.title}
          </span>
          {item.isAtRisk && !isDone && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
              style={{ color: "#C45555", background: "rgba(196,85,85,0.08)" }}
            >
              at risk
            </span>
          )}
        </div>
        {item.assignee && (
          <span
            className="text-[11px]"
            style={{ color: isDone ? "#DDD" : "#BBB" }}
          >
            {item.assignee}
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

type WeeklyGoalsProps = z.infer<typeof weeklyGoalsSchema>;

export function WeeklyGoals({
  title: titleProp,
  subtitle,
  items,
  totalItems: totalProp,
  completedItems: completedProp,
}: Partial<WeeklyGoalsProps>) {
  if (!items || items.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-[15px] font-medium" style={{ color: "#1A1A1A" }}>
          {titleProp || "Weekly Goals"}
        </h2>
        <p className="text-[13px]" style={{ color: "#CCC" }}>
          No items.
        </p>
      </div>
    );
  }

  const total = totalProp ?? items.length;
  const completed =
    completedProp ?? items.filter((i) => i.status === "done").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const grouped = {
    inProgress: items.filter((i) => i.status === "in-progress"),
    notStarted: items.filter((i) => i.status === "not-started"),
    done: items.filter((i) => i.status === "done"),
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[15px] font-medium" style={{ color: "#1A1A1A" }}>
          {titleProp || "Weekly Goals"}
        </h2>
        {subtitle && (
          <span className="text-[12px]" style={{ color: "#AAA" }}>
            {subtitle}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span
            className="text-[12px] font-medium"
            style={{ color: "#1A1A1A" }}
          >
            {completed} of {total} complete
          </span>
          <span
            className="text-[11px]"
            style={{ color: "#AAA", fontFamily: "var(--font-mono)" }}
          >
            {pct}%
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ background: "#F0F0F0" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "#1A1A1A" }}
          />
        </div>
      </div>

      {[
        { key: "in-progress", label: "In Progress", color: "#F5A623", items: grouped.inProgress },
        { key: "not-started", label: "Not Started", color: "#CCC", items: grouped.notStarted },
        { key: "done", label: "Done", color: "#4CAF50", items: grouped.done },
      ]
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <div key={group.key}>
            <div
              className="text-[11px] uppercase tracking-wider mb-1 font-medium"
              style={{ color: group.color }}
            >
              {group.label} ({group.items.length})
            </div>
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {group.items.map((item) => (
                <GoalItemRow key={item.identifier} item={item} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
