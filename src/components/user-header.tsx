"use client";

import { logout } from "@/lib/auth-actions";
import { SettingsModal } from "@/components/settings-modal";
import { getGithubToken, getLinearApiKey, tokenReady } from "@/lib/user-tokens";
import { Settings, LogOut } from "lucide-react";
import * as React from "react";

export function UserHeader({ userName, userImage }: { userName: string; userImage?: string }) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [needsSetup, setNeedsSetup] = React.useState(false);

  // Check if tokens are configured (wait for crypto key to be ready first)
  React.useEffect(() => {
    let active = true;
    tokenReady()
      .then(() => Promise.all([getGithubToken(), getLinearApiKey()]))
      .then(([gh, lin]) => {
        if (active) setNeedsSetup(!gh || !lin);
      });
    return () => { active = false; };
  }, [settingsOpen]); // re-check after settings modal closes

  return (
    <>
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
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
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer"
          title="Settings"
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

      {needsSetup && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 mx-3 mt-2 px-3 py-1.5 rounded-md text-[11px] text-left cursor-pointer transition-colors hover:bg-[rgba(0,0,0,0.03)]"
          style={{ color: "#999" }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#F59E0B" }} />
          Add your API keys to get started
        </button>
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
