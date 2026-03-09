import * as React from "react";

export function connectionBadge(status: { github: string; linear: string }): {
  color: string;
  title: string;
} | null {
  const ghOk = status.github === "connected";
  const lnOk = status.linear === "connected";

  if (ghOk && lnOk) return null;

  if (status.github === "needs_reauthorization" || status.linear === "needs_reauthorization") {
    return { color: "#F59E0B", title: "A connection needs reauthorization" };
  }

  if (!ghOk && !lnOk) {
    return { color: "#EF4444", title: "No accounts connected" };
  }

  return { color: "#F59E0B", title: ghOk ? "Linear not connected" : "GitHub not connected" };
}

export function StatusDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={`w-2 h-2 rounded-full inline-block shrink-0 ${className ?? ""}`}
      style={{ background: color }}
    />
  );
}
