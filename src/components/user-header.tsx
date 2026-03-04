"use client";

import { logout } from "@/lib/auth-actions";
import { Settings, LogOut } from "lucide-react";
import * as React from "react";

function dotColor(status: string): string {
  if (status === "connected") return "#22C55E";
  if (status === "needs_reauthorization") return "#F59E0B";
  return "#DDD";
}

function dotLabel(provider: string, status: string): string {
  if (status === "connected") return `${provider}: Connected`;
  if (status === "needs_reauthorization")
    return `${provider}: Needs reconnection`;
  return `${provider}: Not connected`;
}

export function UserHeader({
  userName,
  userImage,
  connectionStatus,
  onOpenModal,
  teamSwitcherSlot,
}: {
  userName: string;
  userImage?: string;
  connectionStatus: { github: string; linear: string };
  onOpenModal: () => void;
  teamSwitcherSlot?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b"
      style={{ borderColor: "rgba(0,0,0,0.06)" }}
    >
      {teamSwitcherSlot}

      {teamSwitcherSlot && (
        <div
          className="h-4 w-px shrink-0"
          style={{ background: "rgba(0,0,0,0.08)" }}
        />
      )}

      {userImage ? (
        <img
          src={userImage}
          alt=""
          className="w-6 h-6 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-[#e5e5e4] flex items-center justify-center text-[11px] font-medium text-[#666]">
          {userName[0]?.toUpperCase() ?? "?"}
        </div>
      )}

      <span className="text-[13px] font-medium text-[#1A1A1A] truncate flex-1">
        {userName}
      </span>

      {/* Status dots */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenModal}
          className="p-1 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer"
          title={dotLabel("GitHub", connectionStatus.github)}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: dotColor(connectionStatus.github) }}
          />
        </button>
        <button
          onClick={onOpenModal}
          className="p-1 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer"
          title={dotLabel("Linear", connectionStatus.linear)}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: dotColor(connectionStatus.linear) }}
          />
        </button>
      </div>

      <button
        onClick={onOpenModal}
        className="p-1.5 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer"
        title="Connections"
      >
        <Settings className="w-3.5 h-3.5 text-[#888]" />
      </button>

      <form action={logout}>
        <button
          type="submit"
          className="p-1.5 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5 text-[#888]" />
        </button>
      </form>
    </div>
  );
}
