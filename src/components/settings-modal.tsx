"use client";

import { fetchTeamMembers as fetchMembers, type TeamMember } from "@/lib/member-filter";
import {
  getGithubToken,
  getGithubOrg,
  getLinearApiKey,
  getSelectedTeam,
  getFilteredMembers,
  setGithubToken as saveGithubToken,
  setGithubOrg as saveGithubOrg,
  setLinearApiKey as saveLinearApiKey,
  setSelectedTeam as saveSelectedTeam,
  setFilteredMembers as saveFilteredMembers,
  getTokenHeaders,
} from "@/lib/user-tokens";
import { X, Github, ExternalLink, ChevronDown, Check, Loader2 } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

interface Team { id: string; name: string; key: string }

export function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [githubToken, setGithubToken] = React.useState("");
  const [githubOrg, setGithubOrg] = React.useState("");
  const [linearApiKey, setLinearApiKey] = React.useState("");
  const [selectedTeam, setSelectedTeam] = React.useState<{ id: string; name: string } | null>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = React.useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = React.useState(false);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(false);
  const [checkedMemberIds, setCheckedMemberIds] = React.useState<Set<string> | null>(null); // null = all
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      let active = true;
      Promise.all([getGithubToken(), getGithubOrg(), getLinearApiKey(), getSelectedTeam(), getFilteredMembers()]).then(([gh, org, lin, team, filtered]) => {
        if (!active) return;
        setGithubToken(gh);
        setGithubOrg(org);
        setLinearApiKey(lin);
        setSelectedTeam(team);
        setCheckedMemberIds(filtered ? new Set(filtered) : null);
        if (lin) {
          fetchTeams(lin, active).then(t => { if (active && t) setTeams(t); });
          if (team) loadTeamMembers(team.id, active);
        }
      });
      setSaved(false);
      return () => { active = false; };
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (teamDropdownOpen) setTeamDropdownOpen(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, teamDropdownOpen]);

  async function fetchTeams(apiKey: string, active: boolean): Promise<Team[] | null> {
    setTeamsLoading(true);
    try {
      const headers = await getTokenHeaders();
      headers["x-linear-api-key"] = apiKey;
      const res = await fetch("/api/linear/team", { headers });
      const data = await res.json();
      if (!active) return null;
      if (Array.isArray(data)) return data;
      return null;
    } catch {
      return null;
    } finally {
      if (active) setTeamsLoading(false);
    }
  }

  async function loadTeamMembers(teamId: string, active: boolean) {
    setMembersLoading(true);
    try {
      const members = await fetchMembers(teamId);
      if (active) setTeamMembers(members);
    } catch {
      // ignore — member list is optional
    } finally {
      if (active) setMembersLoading(false);
    }
  }

  const handleLinearKeyBlur = async () => {
    const trimmed = linearApiKey.trim();
    if (trimmed && trimmed.startsWith("lin_")) {
      const t = await fetchTeams(trimmed, true);
      if (t) setTeams(t);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await Promise.all([
      saveGithubToken(githubToken.trim()),
      saveGithubOrg(githubOrg.trim()),
      saveLinearApiKey(linearApiKey.trim()),
      saveSelectedTeam(selectedTeam),
      saveFilteredMembers(checkedMemberIds ? Array.from(checkedMemberIds) : null),
    ]);
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setTeamDropdownOpen(false);
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full mx-4 border border-[rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
              Connect your accounts
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "#999" }}>
              Keys are encrypted and stored in your browser
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#AAA]" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-5 pt-4 pb-5 space-y-3">
          {/* GitHub section */}
          <fieldset className="rounded-xl border border-[rgba(0,0,0,0.07)] p-3.5 space-y-3">
            <legend className="flex items-center gap-1.5 px-1 text-[12px] font-medium text-[#666]">
              <Github className="w-3.5 h-3.5" />
              GitHub
              <Dot active={!!githubToken.trim()} />
            </legend>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-medium text-[#555]">
                  Personal access token
                </label>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-[10px] text-[#BBB] hover:text-[#888] transition-colors"
                >
                  Create token <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full px-3 py-1.5 text-[13px] border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:bg-white transition-colors"
              />
              <p className="mt-1 text-[10px]" style={{ color: "#BBB" }}>
                Needs <code className="px-1 py-0.5 rounded bg-[rgba(0,0,0,0.03)] text-[9px]">repo</code> and <code className="px-1 py-0.5 rounded bg-[rgba(0,0,0,0.03)] text-[9px]">read:org</code> scopes
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#555] mb-1">
                Organization
                <span className="text-[10px] font-normal text-[#BBB] ml-1">optional</span>
              </label>
              <input
                type="text"
                value={githubOrg}
                onChange={(e) => setGithubOrg(e.target.value)}
                placeholder="my-company"
                className="w-full px-3 py-1.5 text-[13px] border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:bg-white transition-colors"
              />
            </div>
          </fieldset>

          {/* Linear section */}
          <fieldset className="rounded-xl border border-[rgba(0,0,0,0.07)] p-3.5 space-y-3">
            <legend className="flex items-center gap-1.5 px-1 text-[12px] font-medium text-[#666]">
              <LinearIcon className="w-3.5 h-3.5" />
              Linear
              <Dot active={!!linearApiKey.trim()} />
            </legend>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-medium text-[#555]">
                  Personal API key
                </label>
                <a
                  href="https://linear.app/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-[10px] text-[#BBB] hover:text-[#888] transition-colors"
                >
                  Create key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={linearApiKey}
                onChange={(e) => setLinearApiKey(e.target.value)}
                onBlur={handleLinearKeyBlur}
                placeholder="lin_api_..."
                className="w-full px-3 py-1.5 text-[13px] border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:bg-white transition-colors"
              />
            </div>

            {/* Team selector — shows after Linear key is entered */}
            {linearApiKey.trim() && (
              <div>
                <label className="block text-[12px] font-medium text-[#555] mb-1">
                  Team
                </label>
                {teamsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#999]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading teams...
                  </div>
                ) : teams.length > 0 ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] border border-[rgba(0,0,0,0.08)] rounded-lg bg-[#FAFAF9] hover:bg-white transition-colors cursor-pointer text-left"
                    >
                      <span style={{ color: selectedTeam ? "#1A1A1A" : "#999" }}>
                        {selectedTeam ? selectedTeam.name : "Select a team..."}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#AAA]" />
                    </button>
                    {teamDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-lg z-10 py-1 max-h-[200px] overflow-y-auto">
                        {teams.map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              const changed = selectedTeam?.id !== team.id;
                              setSelectedTeam({ id: team.id, name: team.name });
                              setTeamDropdownOpen(false);
                              if (changed) {
                                setCheckedMemberIds(null);
                                setTeamMembers([]);
                                loadTeamMembers(team.id, true);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left hover:bg-[rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                          >
                            <span className="flex-1">{team.name}</span>
                            <span className="text-[10px] text-[#CCC]">{team.key}</span>
                            {selectedTeam?.id === team.id && (
                              <Check className="w-3 h-3 text-[#22C55E]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#BBB]">
                    Enter your API key and click outside to load teams
                  </p>
                )}
              </div>
            )}

            {/* Member filter — shows after team is selected */}
            {selectedTeam && !membersLoading && teamMembers.length > 0 && (
              <div>
                <label className="block text-[12px] font-medium text-[#555] mb-1.5">
                  Focus on members
                  <span className="text-[10px] font-normal text-[#BBB] ml-1">optional</span>
                </label>
                {/* All toggle */}
                <button
                  type="button"
                  onClick={() => setCheckedMemberIds(checkedMemberIds === null ? new Set(teamMembers.map(m => m.linearUserId)) : null)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[rgba(0,0,0,0.02)] transition-colors cursor-pointer text-left"
                >
                  <span
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      borderColor: checkedMemberIds === null ? "#1A1A1A" : "rgba(0,0,0,0.15)",
                      background: checkedMemberIds === null ? "#1A1A1A" : "transparent",
                    }}
                  >
                    {checkedMemberIds === null && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className="text-[12px] font-medium" style={{ color: "#555" }}>All members</span>
                </button>
                {/* Individual members */}
                <div className="max-h-[140px] overflow-y-auto mt-0.5">
                  {teamMembers.map((member) => {
                    const isChecked = checkedMemberIds === null || checkedMemberIds.has(member.linearUserId);
                    return (
                      <button
                        key={member.linearUserId}
                        type="button"
                        onClick={() => {
                          if (checkedMemberIds === null) {
                            // Switching from "all" to individual: check everyone except this one
                            const all = new Set(teamMembers.map(m => m.linearUserId));
                            all.delete(member.linearUserId);
                            setCheckedMemberIds(all);
                          } else {
                            const next = new Set(checkedMemberIds);
                            if (next.has(member.linearUserId)) {
                              next.delete(member.linearUserId);
                            } else {
                              next.add(member.linearUserId);
                            }
                            // If all are checked again, go back to null (show all)
                            if (next.size === teamMembers.length) {
                              setCheckedMemberIds(null);
                            } else {
                              setCheckedMemberIds(next);
                            }
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-[rgba(0,0,0,0.02)] transition-colors cursor-pointer text-left"
                      >
                        <span
                          className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            borderColor: isChecked ? "#1A1A1A" : "rgba(0,0,0,0.15)",
                            background: isChecked ? "#1A1A1A" : "transparent",
                          }}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                        </span>
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="w-5 h-5 rounded-full shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[10px] font-medium text-[#888] shrink-0">
                            {member.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <span className="text-[12px] truncate" style={{ color: "#333" }}>{member.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedTeam && membersLoading && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-[#999]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading members...
              </div>
            )}
          </fieldset>

          {/* Save button */}
          <button
            type="submit"
            className="w-full py-2 text-[13px] font-medium text-white rounded-lg transition-all cursor-pointer"
            style={{ background: saved ? "#22C55E" : "#1A1A1A" }}
          >
            {saved ? "Saved" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full inline-block"
      style={{ background: active ? "#22C55E" : "#DDD" }}
    />
  );
}

function LinearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z" />
    </svg>
  );
}
