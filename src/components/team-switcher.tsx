"use client";

import { switchTeam } from "@/lib/team-actions";
import { ChevronDown, Plus, Settings } from "lucide-react";
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
  onOpenSettings: () => void;
}

export function TeamSwitcher({
  teams,
  activeTeamId,
  onOpenSettings,
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

  const showNewTeamOption =
    !activeTeamId || (activeTeam?.isPersonal ?? false);

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
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer text-[13px] font-medium text-[#1A1A1A] max-w-[160px]"
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown
          className="w-3 h-3 text-[#888] shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-[220px] bg-white rounded-lg border py-1 z-50"
          style={{
            borderColor: "rgba(0,0,0,0.08)",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {showCreateForm ? (
            <div className="px-2 py-1">
              <TeamCreationForm
                onCreated={handleCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          ) : (
            <>
              {/* Personal workspace */}
              {personalTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  disabled={switching !== null}
                  className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
                    t.id === activeTeamId
                      ? "font-semibold text-[#1A1A1A] bg-[#f5f5f4]"
                      : "text-[#555] hover:bg-[#f5f5f4]"
                  } ${switching === t.id ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">My Workspace</span>
                    {switching === t.id && (
                      <span className="text-[11px] text-[#999]">...</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#999] font-normal">
                    Personal
                  </div>
                </button>
              ))}

              {/* Divider */}
              {personalTeams.length > 0 && realTeams.length > 0 && (
                <div
                  className="my-1 mx-3 border-t"
                  style={{ borderColor: "rgba(0,0,0,0.06)" }}
                />
              )}

              {/* Real teams */}
              {realTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  disabled={switching !== null}
                  className={`w-full text-left px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
                    t.id === activeTeamId
                      ? "font-semibold text-[#1A1A1A] bg-[#f5f5f4]"
                      : "text-[#555] hover:bg-[#f5f5f4]"
                  } ${switching === t.id ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{t.name}</span>
                    {switching === t.id && (
                      <span className="text-[11px] text-[#999]">...</span>
                    )}
                  </div>
                </button>
              ))}

              {/* Divider before actions */}
              <div
                className="my-1 mx-3 border-t"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              />

              {/* + New Team */}
              {showNewTeamOption && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-[#555] hover:bg-[#f5f5f4] transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-[#888]" />
                  <span>New Team</span>
                </button>
              )}

              {/* Settings */}
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                className="w-full text-left px-3 py-1.5 text-[13px] text-[#555] hover:bg-[#f5f5f4] transition-colors cursor-pointer flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-[#888]" />
                <span>Team Settings</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
