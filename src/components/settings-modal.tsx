"use client";

import {
  getGithubToken,
  getGithubOrg,
  getLinearApiKey,
  setGithubToken as saveGithubToken,
  setGithubOrg as saveGithubOrg,
  setLinearApiKey as saveLinearApiKey,
} from "@/lib/user-tokens";
import { X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

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
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      let active = true;
      Promise.all([getGithubToken(), getGithubOrg(), getLinearApiKey()]).then(([gh, org, lin]) => {
        if (!active) return;
        setGithubToken(gh);
        setGithubOrg(org);
        setLinearApiKey(lin);
      });
      setSaved(false);
      return () => { active = false; };
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await Promise.all([
      saveGithubToken(githubToken.trim()),
      saveGithubOrg(githubOrg.trim()),
      saveLinearApiKey(linearApiKey.trim()),
    ]);
    setSaved(true);
    setTimeout(() => onClose(), 600);
  };

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 border border-[rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,0,0,0.06)]">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            API Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#f5f5f4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#888]" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1A1A1A] mb-1.5">
              GitHub Token
              <StatusBadge configured={!!githubToken.trim()} />
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20"
            />
            <p className="mt-1 text-[11px] text-[#999]">
              Personal access token with repo and org read access
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1A1A1A] mb-1.5">
              GitHub Organization
              <StatusBadge configured={!!githubOrg.trim()} />
            </label>
            <input
              type="text"
              value={githubOrg}
              onChange={(e) => setGithubOrg(e.target.value)}
              placeholder="my-company"
              className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20"
            />
            <p className="mt-1 text-[11px] text-[#999]">
              GitHub org name — used to match team members by name
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#1A1A1A] mb-1.5">
              Linear API Key
              <StatusBadge configured={!!linearApiKey.trim()} />
            </label>
            <input
              type="password"
              value={linearApiKey}
              onChange={(e) => setLinearApiKey(e.target.value)}
              placeholder="lin_api_..."
              className="w-full px-3 py-2 text-sm border border-[rgba(0,0,0,0.1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20"
            />
            <p className="mt-1 text-[11px] text-[#999]">
              Personal API key from Linear settings
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2 text-sm font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-[#333] transition-colors cursor-pointer"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span
      className="ml-2 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full"
      style={{
        color: configured ? "#166534" : "#92400e",
        background: configured ? "rgba(22,163,74,0.1)" : "rgba(217,119,6,0.1)",
      }}
    >
      {configured ? "configured" : "not configured"}
    </span>
  );
}
