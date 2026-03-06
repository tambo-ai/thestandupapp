"use client";

import { switchTeam } from "@/lib/team-actions";
import { Check, ChevronDown, Plus } from "lucide-react";
import * as React from "react";
import { TeamCreationForm } from "./team-creation-form";

export interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  isPersonal: boolean;
  workosOrgId: string | null;
}

interface TeamSwitcherProps {
  teams: TeamInfo[];
  activeTeamId: string | null;
}

function TeamAvatar({ name, isPersonal, size = 28 }: { name: string; isPersonal: boolean; size?: number }) {
  const initial = isPersonal ? "P" : name[0]?.toUpperCase() ?? "?";
  const bg = isPersonal ? "#e8e8e6" : "#1A1A1A";
  const fg = isPersonal ? "#666" : "#fff";

  return (
    <div
      className="rounded-md flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.43 }}
    >
      {initial}
    </div>
  );
}

export function TeamSwitcher({
  teams,
  activeTeamId,
}: TeamSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [switching, setSwitching] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const displayName = activeTeam
    ? activeTeam.isPersonal
      ? "My Workspace"
      : activeTeam.name
    : "My Workspace";

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowCreateForm(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const personalTeams = teams.filter((t) => t.isPersonal);
  const realTeams = teams
    .filter((t) => !t.isPersonal)
    .sort((a, b) => a.name.localeCompare(b.name));

  const showNewTeamOption = true;

  async function handleSelect(team: TeamInfo) {
    if (team.id === activeTeamId) {
      setOpen(false);
      return;
    }
    setSwitching(team.id);
    try {
      await switchTeam(team.id, team.workosOrgId);
    } catch {
      // switchToOrganization may throw a redirect -- that's expected
    }
    window.location.reload();
  }

  async function handleCreated(team: {
    id: string;
    slug: string;
    workosOrgId: string;
  }) {
    try {
      await switchTeam(team.id, team.workosOrgId);
    } catch {
      // redirect may throw
    }
    window.location.reload();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (open) setShowCreateForm(false);
        }}
        className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-[#f5f5f4] transition-colors cursor-pointer max-w-[180px]"
      >
        <TeamAvatar
          name={displayName}
          isPersonal={activeTeam?.isPersonal ?? true}
          size={22}
        />
        <span className="text-[13px] font-medium text-[#1A1A1A] truncate">
          {displayName}
        </span>
        <ChevronDown
          className="w-3 h-3 text-[#999] shrink-0 transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 w-[260px] bg-white rounded-xl border py-1.5 z-50"
          style={{
            borderColor: "rgba(0,0,0,0.08)",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          {showCreateForm ? (
            <div className="px-3 py-2">
              <TeamCreationForm
                onCreated={handleCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          ) : (
            <>
              {/* Section label */}
              <div className="px-3 pt-1 pb-1.5 text-[11px] font-medium text-[#999] uppercase tracking-wider">
                Workspaces
              </div>

              {/* Personal workspace */}
              {personalTeams.map((t) => {
                const isActive = t.id === activeTeamId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    disabled={switching !== null}
                    className={`w-full text-left px-3 py-2 transition-colors cursor-pointer flex items-center gap-2.5 ${
                      isActive
                        ? "bg-[#f5f5f4]"
                        : "hover:bg-[#fafaf9]"
                    } ${switching === t.id ? "opacity-50" : ""}`}
                  >
                    <TeamAvatar name="Personal" isPersonal size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                        My Workspace
                      </div>
                      <div className="text-[11px] text-[#999] font-normal">
                        Personal
                      </div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-[#1A1A1A] shrink-0" />}
                    {switching === t.id && (
                      <span className="text-[11px] text-[#999] shrink-0">Switching...</span>
                    )}
                  </button>
                );
              })}

              {/* Real teams */}
              {realTeams.length > 0 && (
                <>
                  <div
                    className="my-1.5 mx-3 border-t"
                    style={{ borderColor: "rgba(0,0,0,0.06)" }}
                  />
                  {realTeams.map((t) => {
                    const isActive = t.id === activeTeamId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelect(t)}
                        disabled={switching !== null}
                        className={`w-full text-left px-3 py-2 transition-colors cursor-pointer flex items-center gap-2.5 ${
                          isActive
                            ? "bg-[#f5f5f4]"
                            : "hover:bg-[#fafaf9]"
                        } ${switching === t.id ? "opacity-50" : ""}`}
                      >
                        <TeamAvatar name={t.name} isPersonal={false} size={28} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                            {t.name}
                          </div>
                        </div>
                        {isActive && <Check className="w-3.5 h-3.5 text-[#1A1A1A] shrink-0" />}
                        {switching === t.id && (
                          <span className="text-[11px] text-[#999] shrink-0">Switching...</span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* + New Team */}
              {showNewTeamOption && (
                <>
                  <div
                    className="my-1.5 mx-3 border-t"
                    style={{ borderColor: "rgba(0,0,0,0.06)" }}
                  />
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full text-left px-3 py-2 text-[13px] text-[#555] hover:bg-[#fafaf9] transition-colors cursor-pointer flex items-center gap-2.5"
                  >
                    <div
                      className="rounded-md flex items-center justify-center shrink-0 border border-dashed"
                      style={{ width: 28, height: 28, borderColor: "rgba(0,0,0,0.15)" }}
                    >
                      <Plus className="w-3.5 h-3.5 text-[#999]" />
                    </div>
                    <span className="font-medium">New Team</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
