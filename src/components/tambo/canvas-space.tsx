"use client";

import { cn } from "@/lib/utils";
import { useTambo } from "@tambo-ai/react";
import { X, GripVertical } from "lucide-react";
import * as React from "react";

/** Max components visible at once in the canvas */
const MAX_VISIBLE = 4;

interface CanvasItem {
  key: string;
  node: React.ReactNode;
}

/**
 * Applies a user-defined key ordering on top of the default list.
 * Preserves any manual swaps while appending new keys at the end.
 */
function applyOrder(items: CanvasItem[], orderedKeys: string[]): CanvasItem[] {
  const map = new Map(items.map((c) => [c.key, c]));
  const result: CanvasItem[] = [];
  // First: items that exist in the saved order
  for (const k of orderedKeys) {
    const item = map.get(k);
    if (item) {
      result.push(item);
      map.delete(k);
    }
  }
  // Then: any new items not yet in the order
  for (const item of map.values()) {
    result.push(item);
  }
  return result;
}

export function CanvasSpace({ className }: { className?: string }) {
  const { messages, currentThreadId } = useTambo();
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [order, setOrder] = React.useState<string[]>([]);
  const dragRef = React.useRef<string | null>(null);
  const [dragOver, setDragOver] = React.useState<string | null>(null);

  // Collect all rendered components from messages
  const allComponents = React.useMemo(() => {
    const components: CanvasItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      for (let j = 0; j < msg.content.length; j++) {
        const content = msg.content[j];
        if (content.type === "component" && content.renderedComponent) {
          components.push({
            key: `cv-${i}-${j}`,
            node: content.renderedComponent,
          });
        }
      }
    }
    return components;
  }, [messages]);

  // Reset state when thread changes
  React.useEffect(() => {
    setDismissed(new Set());
    setOrder([]);
  }, [currentThreadId]);

  // When user clicks "View component" on a message, find the matching
  // canvas item by its rendered node reference and un-dismiss just that one.
  // Falls back to clearing all dismissals if no match is found.
  React.useEffect(() => {
    function handleShowComponent(e: Event) {
      const detail = (e as CustomEvent).detail;
      const targetNode = detail?.component;
      if (!targetNode) return;

      const match = allComponents.find((c) => c.node === targetNode);
      if (match) {
        setDismissed((prev) => {
          if (!prev.has(match.key)) return prev;
          const next = new Set(prev);
          next.delete(match.key);
          return next;
        });
      } else {
        // Fallback: clear all dismissals
        setDismissed(new Set());
      }
    }
    window.addEventListener("tambo:showComponent", handleShowComponent);
    return () => window.removeEventListener("tambo:showComponent", handleShowComponent);
  }, [allComponents]);

  // Filter dismissed, take most recent N, then apply user ordering
  const filtered = allComponents
    .filter((c) => !dismissed.has(c.key))
    .slice(-MAX_VISIBLE);
  const visible = applyOrder(filtered, order);

  const handleDismiss = (key: string) => {
    setDismissed((prev) => new Set(prev).add(key));
    setOrder((prev) => prev.filter((k) => k !== key));
  };

  // --- Drag and drop handlers ---
  const handleDragStart = (key: string) => {
    dragRef.current = key;
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (dragRef.current && dragRef.current !== key) {
      setDragOver(key);
    }
  };

  const handleDrop = (targetKey: string) => {
    const sourceKey = dragRef.current;
    if (!sourceKey || sourceKey === targetKey) {
      dragRef.current = null;
      setDragOver(null);
      return;
    }

    // Swap in the current visible order
    const currentKeys = visible.map((v) => v.key);
    const srcIdx = currentKeys.indexOf(sourceKey);
    const tgtIdx = currentKeys.indexOf(targetKey);
    if (srcIdx !== -1 && tgtIdx !== -1) {
      const next = [...currentKeys];
      next[srcIdx] = targetKey;
      next[tgtIdx] = sourceKey;
      setOrder(next);
    }

    dragRef.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setDragOver(null);
  };

  return (
    <div
      className={cn(
        "h-screen flex-1 flex flex-col overflow-hidden bg-[#FAFAF9]",
        className,
      )}
      data-canvas-space="true"
    >
      {visible.length > 0 ? (
        <div className="flex-1 min-h-0 p-4">
          <div className={cn("h-full gap-4", layoutClass(visible.length))}>
            {visible.map((item) => (
              <div
                key={item.key}
                draggable={visible.length > 1}
                onDragStart={() => handleDragStart(item.key)}
                onDragOver={(e) => handleDragOver(e, item.key)}
                onDrop={() => handleDrop(item.key)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative min-h-0 min-w-0 rounded-xl border bg-white overflow-hidden flex flex-col transition-all duration-150",
                  dragOver === item.key
                    ? "border-[rgba(0,0,0,0.25)] ring-2 ring-[rgba(0,0,0,0.08)]"
                    : "border-[rgba(0,0,0,0.06)]",
                )}
              >
                {/* Top bar with drag handle + dismiss */}
                {visible.length > 1 && (
                  <div className="flex items-center justify-between px-2 pt-1.5 pb-0 shrink-0">
                    <div
                      className="p-1 cursor-grab active:cursor-grabbing text-[#CCC] hover:text-[#999] transition-colors"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    <button
                      onClick={() => handleDismiss(item.key)}
                      className="p-1 rounded-md hover:bg-[rgba(0,0,0,0.05)] text-[#CCC] hover:text-[#777] transition-colors cursor-pointer"
                      aria-label="Dismiss component"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 pt-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[rgba(0,0,0,0.08)] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {item.node}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyCanvas />
      )}
    </div>
  );
}

function layoutClass(count: number): string {
  switch (count) {
    case 1:
      return "grid grid-cols-1 grid-rows-1";
    case 2:
      return "grid grid-cols-2 grid-rows-1";
    case 3:
      return "grid grid-cols-2 grid-rows-2 [&>*:last-child]:col-span-2";
    case 4:
      return "grid grid-cols-2 grid-rows-2";
    default:
      return "grid grid-cols-2 grid-rows-2";
  }
}

function EmptyCanvas() {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <p className="text-[15px] font-medium" style={{ color: "#1A1A1A" }}>
            The Standup App
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "#999" }}>
            Ask about your team and components will appear here.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {[
            "Show me the state of the team",
            "What's at risk?",
            "This week's goals",
          ].map((suggestion) => (
            <span
              key={suggestion}
              className="text-[12px] px-3 py-1.5 rounded-full border cursor-default"
              style={{
                color: "#888",
                borderColor: "rgba(0,0,0,0.08)",
                background: "white",
              }}
            >
              {suggestion}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
