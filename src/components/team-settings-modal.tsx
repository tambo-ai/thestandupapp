"use client";

import { Copy, Link, Mail, RefreshCw, Users, X } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  teamSlug: string;
  isPersonal: boolean;
  isOwner: boolean;
}

type Tab = "general" | "invite" | "members";

interface InviteLinkData {
  token: string;
  url: string;
  useCount: number;
}

interface MemberData {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: "owner" | "member";
}

export function TeamSettingsModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  teamSlug,
  isPersonal,
  isOwner,
}: TeamSettingsModalProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("general");

  // Reset to general tab when modal opens
  React.useEffect(() => {
    if (isOpen) setActiveTab("general");
  }, [isOpen]);

  // Escape key close
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs: { key: Tab; label: string }[] = isPersonal
    ? [{ key: "general", label: "General" }]
    : [
        { key: "general", label: "General" },
        { key: "invite", label: "Invite" },
        { key: "members", label: "Members" },
      ];

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full mx-4 border border-[rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            Team Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[rgba(0,0,0,0.04)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-[#AAA]" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-0 px-5 mt-3 border-b"
          style={{ borderColor: "rgba(0,0,0,0.06)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer relative ${
                activeTab === tab.key
                  ? "text-[#1A1A1A]"
                  : "text-[#888] hover:text-[#555]"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#1A1A1A] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="px-5 py-4 min-h-[200px]">
          {activeTab === "general" && (
            <GeneralTab teamName={teamName} teamSlug={teamSlug} />
          )}
          {activeTab === "invite" && (
            <InviteTab teamId={teamId} isOwner={isOwner} />
          )}
          {activeTab === "members" && <MembersTab teamId={teamId} />}
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined"
    ? createPortal(modal, document.body)
    : null;
}

/* ── General Tab ─────────────────────────────────────────────── */

function GeneralTab({
  teamName,
  teamSlug,
}: {
  teamName: string;
  teamSlug: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-[#888] mb-1">
          Team name
        </label>
        <div className="border rounded-lg px-3 py-2 text-[13px] text-[#1A1A1A] bg-[#fafaf9]"
          style={{ borderColor: "rgba(0,0,0,0.06)" }}
        >
          {teamName}
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-[#888] mb-1">
          Team URL
        </label>
        <div className="border rounded-lg px-3 py-2 text-[13px] text-[#1A1A1A] bg-[#fafaf9]"
          style={{ borderColor: "rgba(0,0,0,0.06)" }}
        >
          {teamSlug}
        </div>
      </div>
    </div>
  );
}

/* ── Invite Tab ──────────────────────────────────────────────── */

function InviteTab({
  teamId,
  isOwner,
}: {
  teamId: string;
  isOwner: boolean;
}) {
  const [inviteLink, setInviteLink] = React.useState<InviteLinkData | null>(
    null,
  );
  const [linkLoading, setLinkLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);

  const [emails, setEmails] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [emailResult, setEmailResult] = React.useState<string | null>(null);

  // Fetch invite link on mount
  React.useEffect(() => {
    setLinkLoading(true);
    fetch(`/api/teams/invite-link?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data: InviteLinkData) => setInviteLink(data))
      .catch(() => setInviteLink(null))
      .finally(() => setLinkLoading(false));
  }, [teamId]);

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/teams/invite-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const data: InviteLinkData = await res.json();
      setInviteLink(data);
    } catch {
      // ignore
    } finally {
      setRegenerating(false);
    }
  };

  const handleSendEmails = async () => {
    if (!emails.trim()) return;
    setSending(true);
    setEmailResult(null);
    try {
      const res = await fetch("/api/teams/invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, emails: emails.trim() }),
      });
      const data = await res.json();
      const parts: string[] = [];
      if (data.sent > 0) parts.push(`Sent ${data.sent} invitation${data.sent > 1 ? "s" : ""}`);
      if (data.failed?.length > 0)
        parts.push(`Failed to send to: ${data.failed.join(", ")}`);
      setEmailResult(parts.join(". ") || "Done");
      if (data.sent > 0) setEmails("");
    } catch {
      setEmailResult("Failed to send invitations");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Shareable Link Section */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Link className="w-3.5 h-3.5 text-[#888]" />
          <span className="text-[12px] font-medium text-[#888]">
            Shareable link
          </span>
        </div>
        {linkLoading ? (
          <div className="h-9 rounded-lg bg-[#f5f5f4] animate-pulse" />
        ) : inviteLink ? (
          <>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink.url}
                className="flex-1 border rounded-lg px-3 py-2 text-[13px] text-[#1A1A1A] bg-[#fafaf9] truncate"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              />
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[12px] text-[#888]">
                Used {inviteLink.useCount} time
                {inviteLink.useCount !== 1 ? "s" : ""}
              </span>
              {isOwner && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex items-center gap-1 text-[12px] text-[#888] hover:text-[#555] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`}
                  />
                  Regenerate
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-[13px] text-[#888]">
            Unable to load invite link.
          </p>
        )}
      </div>

      {/* Divider */}
      <div
        className="border-t"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      />

      {/* Email Invitations Section */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Mail className="w-3.5 h-3.5 text-[#888]" />
          <span className="text-[12px] font-medium text-[#888]">
            Email invitations
          </span>
        </div>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="Enter email addresses, separated by commas"
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-[13px] text-[#1A1A1A] resize-none placeholder:text-[#bbb]"
          style={{ borderColor: "rgba(0,0,0,0.06)" }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] text-[#888] min-h-[18px]">
            {emailResult}
          </span>
          <button
            onClick={handleSendEmails}
            disabled={sending || !emails.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer disabled:opacity-50"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
          >
            {sending ? "Sending..." : "Send Invitations"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Members Tab ─────────────────────────────────────────────── */

function MembersTab({ teamId }: { teamId: string }) {
  const [members, setMembers] = React.useState<MemberData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/teams/members?teamId=${teamId}`)
      .then((r) => r.json())
      .then((data: { members: MemberData[] }) => {
        // Sort: owners first, then alphabetical by name
        const sorted = [...data.members].sort((a, b) => {
          if (a.role === "owner" && b.role !== "owner") return -1;
          if (a.role !== "owner" && b.role === "owner") return 1;
          const aName = a.name ?? a.email;
          const bName = b.name ?? b.email;
          return aName.localeCompare(bName);
        });
        setMembers(sorted);
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f5f5f4] animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-[#f5f5f4] rounded animate-pulse" />
              <div className="h-2.5 w-16 bg-[#f5f5f4] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Users className="w-8 h-8 text-[#ccc] mx-auto mb-2" />
          <p className="text-[13px] text-[#888]">No members found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#f5f5f4] transition-colors"
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#e5e5e4] flex items-center justify-center text-[12px] font-medium text-[#666]">
              {(member.name ?? member.email)[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
              {member.name ?? member.email}
            </div>
            {member.name && (
              <div className="text-[11px] text-[#888] truncate">
                {member.email}
              </div>
            )}
          </div>
          <span
            className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              member.role === "owner"
                ? "bg-[#f0f0ee] text-[#555]"
                : "text-[#999]"
            }`}
          >
            {member.role === "owner" ? "Owner" : "Member"}
          </span>
        </div>
      ))}
    </div>
  );
}
