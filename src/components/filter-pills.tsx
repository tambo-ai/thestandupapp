"use client";

export interface FilterOption {
  key: string;
  label: string;
  color: string;
  count: number;
}

export function toggleFilter(
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

export function FilterPills({
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
