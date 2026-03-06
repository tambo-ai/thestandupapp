"use client";

import { connectionBadge, StatusDot } from "@/components/connection-status-dot";
import { logout } from "@/lib/auth-actions";
import { Settings, LogOut } from "lucide-react";
import * as React from "react";

export function UserHeader({
  userName,
  userImage,
  connectionStatus,
  onOpenSettings,
  teamSwitcherSlot,
}: {
  userName: string;
  userImage?: string;
  connectionStatus: { github: string; linear: string };
  onOpenSettings: (tab?: "connections") => void;
  teamSwitcherSlot?: React.ReactNode;
}) {
  const badge = connectionBadge(connectionStatus);

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

      <button
        onClick={() => onOpenSettings(badge ? "connections" : undefined)}
        className="relative p-1.5 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer"
        title={badge?.title ?? "Settings"}
      >
        <Settings className="w-3.5 h-3.5 text-[#888]" />
        {badge && (
          <StatusDot color={badge.color} className="absolute top-0.5 right-0.5 ring-2 ring-white" />
        )}
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
