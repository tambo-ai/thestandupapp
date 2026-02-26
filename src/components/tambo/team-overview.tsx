"use client";

import { useFilteredMemberIds, type TeamMember } from "@/lib/member-filter";
import { useFetchJSON } from "@/lib/use-fetch-json";
import { useTamboThreadInput } from "@tambo-ai/react";
import { z } from "zod";

export const teamOverviewSchema = z.object({
  teamId: z.string().describe("Linear team ID"),
  teamName: z.string().optional().describe("Team display name"),
});

const STATUS_CONFIG = {
  "on-track": { color: "#4CAF50", label: "On track" },
  "at-risk": { color: "#F5A623", label: "At risk" },
  idle: { color: "#CCC", label: "Idle" },
} as const;

function MemberCard({
  member,
  onClick,
}: {
  member: TeamMember;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[member.status] || STATUS_CONFIG["idle"];

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-4 py-3.5 transition-all hover:border-[rgba(0,0,0,0.12)] hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={member.name}
            className="w-8 h-8 rounded-full shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-medium"
            style={{ background: "#F0F0F0", color: "#888" }}
          >
            {member.name?.charAt(0) || "?"}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[13px] font-medium truncate"
              style={{ color: "#1A1A1A" }}
            >
              {member.name}
            </span>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: status.color }}
              title={status.label}
            />
          </div>

          {member.role && (
            <div
              className="text-[11px] mt-0.5 truncate"
              style={{ color: "#AAA" }}
            >
              {member.role}
            </div>
          )}

          <div
            className="flex items-center gap-3 mt-2 text-[11px]"
            style={{ color: "#888", fontFamily: "var(--font-mono)" }}
          >
            <span>{member.inProgressIssues} issues in progress</span>
          </div>

          {member.topIssue && (
            <div
              className="text-[11px] mt-1.5 truncate leading-snug"
              style={{ color: "#999" }}
            >
              {member.topIssue}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function MemberSkeleton() {
  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-4 py-3.5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#F0F0F0] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-[#F0F0F0] rounded w-24" />
          <div className="h-3 bg-[#F0F0F0] rounded w-16" />
          <div className="h-3 bg-[#F0F0F0] rounded w-32" />
        </div>
      </div>
    </div>
  );
}

type TeamOverviewProps = z.infer<typeof teamOverviewSchema>;

interface TeamData {
  teamName: string;
  members: TeamMember[];
}

export function TeamOverview({
  teamId,
  teamName,
}: Partial<TeamOverviewProps>) {
  const { setValue, submit } = useTamboThreadInput();
  const { data, error } = useFetchJSON<TeamData>(
    teamId ? `/api/linear/team?id=${teamId}` : null,
  );
  const filterIds = useFilteredMemberIds();

  if (!teamId) return null;

  const displayName = data?.teamName || teamName || "Team";
  const allMembers = data?.members ?? null;
  const members = allMembers && filterIds
    ? allMembers.filter((m) => filterIds.has(m.linearUserId))
    : allMembers;

  if (error) {
    return (
      <div className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-5 py-4">
        <p className="text-[13px]" style={{ color: "#C45555" }}>
          Failed to load team: {error}
        </p>
      </div>
    );
  }

  if (!members) {
    return (
      <div className="space-y-4">
        <div>
          <h2
            className="text-[15px] font-medium"
            style={{ color: "#1A1A1A" }}
          >
            {displayName}
          </h2>
          <div className="text-[11px] mt-1" style={{ color: "#AAA" }}>
            Loading members...
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MemberSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-5 py-4">
        <p className="text-[13px]" style={{ color: "#999" }}>
          No team members found.
        </p>
      </div>
    );
  }

  const atRiskCount = members.filter((m) => m.status === "at-risk").length;
  const idleCount = members.filter((m) => m.status === "idle").length;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2
            className="text-[15px] font-medium"
            style={{ color: "#1A1A1A" }}
          >
            {displayName}
          </h2>
          <div
            className="flex items-center gap-3 mt-1 text-[11px]"
            style={{ color: "#AAA" }}
          >
            <span>{members.length} members</span>
            {atRiskCount > 0 && (
              <span style={{ color: "#F5A623" }}>
                {atRiskCount} at risk
              </span>
            )}
            {idleCount > 0 && <span>{idleCount} idle</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member, i) => (
          <MemberCard
            key={member.linearUserId || i}
            member={member}
            onClick={() => {
              if (!member.name) return;
              setValue(`What's ${member.name} working on?`);
              submit();
            }}
          />
        ))}
      </div>
    </div>
  );
}
