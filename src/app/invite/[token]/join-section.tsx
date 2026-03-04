"use client";

import { joinTeam, setPendingInvite } from "@/lib/team-actions";
import * as React from "react";

interface JoinSectionProps {
  token: string;
  teamName: string;
  isAuthenticated: boolean;
}

export function JoinSection({
  token,
  teamName,
  isAuthenticated,
}: JoinSectionProps) {
  const [state, setState] = React.useState<
    "idle" | "loading" | "joined" | "error"
  >("idle");
  const [joinedTeamName, setJoinedTeamName] = React.useState("");

  async function handleJoin() {
    if (!isAuthenticated) {
      // Set pending_invite_token cookie via server action, then redirect to sign-in
      await setPendingInvite(token);
      window.location.href = "/";
      return;
    }

    // Authenticated: call joinTeam server action directly
    setState("loading");
    try {
      const result = await joinTeam(token);
      if ("alreadyMember" in result) {
        window.location.href = "/app";
        return;
      }
      setJoinedTeamName(result.teamName);
      setState("joined");
    } catch {
      setState("error");
    }
  }

  if (state === "joined") {
    return (
      <div className="space-y-4">
        <div className="text-[20px] font-semibold text-[#1A1A1A]">
          Welcome to {joinedTeamName}!
        </div>
        <p className="text-[14px] text-[#888]">
          You&apos;re now a member of this team.
        </p>
        <a
          href="/app"
          className="inline-flex items-center justify-center w-full px-5 py-2.5 text-[14px] font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-[#333] transition-colors"
        >
          Go to workspace
        </a>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-3">
        <p className="text-[14px] text-red-500">
          Something went wrong. Please try again.
        </p>
        <button
          onClick={handleJoin}
          className="w-full px-5 py-2.5 text-[14px] font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-[#333] transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={state === "loading"}
      className="w-full px-5 py-2.5 text-[14px] font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50 cursor-pointer"
    >
      {state === "loading" ? "Joining..." : `Join ${teamName}`}
    </button>
  );
}
