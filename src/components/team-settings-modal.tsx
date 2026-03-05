"use client";

import { Copy, Link, LogOut, Mail, MoreVertical, RefreshCw, User, Users, X } from "lucide-react";
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
  userId: string;
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

interface InvitationData {
  id: string;
  type: "email" | "link";
  email?: string;
  useCount?: number;
  invitedBy: string;
  createdAt: string;
  token?: string;
  url?: string;
}

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffHr < 1) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffDay < 1) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;

  const d = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function TeamSettingsModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  teamSlug,
  isPersonal,
  isOwner,
  userId,
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
          {activeTab === "members" && <MembersTab teamId={teamId} userId={userId} isOwner={isOwner} teamName={teamName} />}
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

function MembersTab({
  teamId,
  userId,
  isOwner,
  teamName,
}: {
  teamId: string;
  userId: string;
  isOwner: boolean;
  teamName: string;
}) {
  const [members, setMembers] = React.useState<MemberData[]>([]);
  const [invitations, setInvitations] = React.useState<InvitationData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = React.useState(false);
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const [resentId, setResentId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [leaveError, setLeaveError] = React.useState<string | null>(null);
  const [leavingTeam, setLeavingTeam] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const refetchAll = React.useCallback(async () => {
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch(`/api/teams/members?teamId=${teamId}`),
        fetch(`/api/teams/invitations?teamId=${teamId}`),
      ]);
      const membersData: { members: MemberData[] } = await membersRes.json();
      const invData: { invitations: InvitationData[] } = await invitationsRes.json();

      const sorted = [...membersData.members].sort((a, b) => {
        if (a.role === "owner" && b.role !== "owner") return -1;
        if (a.role !== "owner" && b.role === "owner") return 1;
        const aName = a.name ?? a.email;
        const bName = b.name ?? b.email;
        return aName.localeCompare(bName);
      });
      setMembers(sorted);
      setInvitations(invData.invitations ?? []);
    } catch {
      // Keep existing state on error
    }
  }, [teamId]);

  React.useEffect(() => {
    setLoading(true);
    refetchAll().finally(() => setLoading(false));
  }, [refetchAll]);

  // Close menu on outside click
  React.useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  // Close menu on Escape
  React.useEffect(() => {
    if (!menuOpenId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpenId(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpenId]);

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch("/api/teams/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, userId: memberId }),
      });
      if (!res.ok) return;
      setRemovingId(memberId);
      setConfirmingId(null);
      await new Promise((r) => setTimeout(r, 300));
      setRemovingId(null);
      await refetchAll();
    } catch {
      // Silently fail
    }
  };

  const handleResend = async (inv: InvitationData) => {
    try {
      const res = await fetch("/api/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, action: "resend", invitationId: inv.id, type: "email" }),
      });
      if (!res.ok) return;
      setResentId(inv.id);
      setMenuOpenId(null);
      setTimeout(() => setResentId(null), 2000);
    } catch {
      // Silently fail
    }
  };

  const handleRevoke = async (inv: InvitationData) => {
    try {
      const res = await fetch("/api/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, action: "revoke", invitationId: inv.id, type: inv.type }),
      });
      if (!res.ok) return;
      setMenuOpenId(null);
      setRemovingId(`inv-${inv.id}`);
      await new Promise((r) => setTimeout(r, 300));
      setRemovingId(null);
      await refetchAll();
    } catch {
      // Silently fail
    }
  };

  const handleCopyLink = async (inv: InvitationData) => {
    if (!inv.url) return;
    try {
      await navigator.clipboard.writeText(inv.url);
      setCopiedId(inv.id);
      setMenuOpenId(null);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Silently fail
    }
  };

  const handleLeave = async () => {
    setLeavingTeam(true);
    setLeaveError(null);
    try {
      const res = await fetch("/api/teams/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLeaveError(data.error ?? "Failed to leave team");
        setLeavingTeam(false);
        return;
      }
      window.location.href = "/app";
    } catch {
      setLeaveError("Failed to leave team");
      setLeavingTeam(false);
    }
  };

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

  if (members.length === 0 && invitations.length === 0) {
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
    <div>
      {/* Summary line */}
      <div className="text-[12px] text-[#888] mb-2">
        {members.length} member{members.length !== 1 ? "s" : ""}
        {invitations.length > 0 && `, ${invitations.length} pending`}
      </div>

      {/* Member rows */}
      <div className="space-y-0.5">
        {members.map((member) => {
          const isConfirming = confirmingId === member.id;
          const isRemoving = removingId === member.id;
          const showMenu = isOwner && member.id !== userId && member.role !== "owner";

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300 ${
                isRemoving ? "opacity-0 -translate-x-4 h-0 overflow-hidden py-0" : "hover:bg-[#f5f5f4]"
              }`}
            >
              {isConfirming ? (
                /* Inline confirmation */
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className="text-[12px] text-[#555] truncate">
                    Remove {member.name ?? member.email} from {teamName}?
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="px-2.5 py-1 rounded-md text-[12px] font-medium text-[#888] hover:bg-[#f0f0ee] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Avatar */}
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#e5e5e4] flex items-center justify-center text-[12px] font-medium text-[#666] shrink-0">
                      {(member.name ?? member.email)[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  {/* Name/email */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#1A1A1A] truncate">
                      {member.name ?? member.email}
                      {member.id === userId && (
                        <span className="text-[11px] text-[#888] font-normal ml-1">(you)</span>
                      )}
                    </div>
                    {member.name && (
                      <div className="text-[11px] text-[#888] truncate">{member.email}</div>
                    )}
                  </div>
                  {/* Role badge */}
                  <span
                    className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      member.role === "owner"
                        ? "bg-[#f0f0ee] text-[#555]"
                        : "text-[#999]"
                    }`}
                  >
                    {member.role === "owner" ? "Owner" : "Member"}
                  </span>
                  {/* Three-dot menu */}
                  {showMenu && (
                    <div className="relative" ref={menuOpenId === member.id ? menuRef : undefined}>
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === member.id ? null : member.id)}
                        className="p-1 rounded-md hover:bg-[#e5e5e4] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-[#888]" />
                      </button>
                      {menuOpenId === member.id && (
                        <div className="absolute right-0 top-7 z-10 bg-white rounded-lg shadow-lg border border-[rgba(0,0,0,0.08)] py-1 min-w-[120px]">
                          <button
                            onClick={() => {
                              setMenuOpenId(null);
                              setConfirmingId(member.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Pending invitation rows */}
        {invitations.map((inv) => {
          const invRemovingId = `inv-${inv.id}`;
          const isRemoving = removingId === invRemovingId;
          const label = inv.type === "email" ? inv.email ?? "Unknown" : `Invite link (${inv.useCount ?? 0} uses)`;

          return (
            <div
              key={`inv-${inv.id}`}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-300 ${
                isRemoving ? "opacity-0 -translate-x-4 h-0 overflow-hidden py-0" : "hover:bg-[#f5f5f4]"
              }`}
            >
              {/* Silhouette avatar */}
              <div className="w-8 h-8 rounded-full bg-[#e5e5e4] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#999]" />
              </div>
              {/* Label + invited by */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1A1A1A] truncate">{label}</div>
                <div className="text-[11px] text-[#888] truncate">
                  Invited by {inv.invitedBy}, {relativeTime(inv.createdAt)}
                </div>
              </div>
              {/* Pending badge / Resent indicator */}
              {resentId === inv.id ? (
                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full text-green-600 bg-green-50">
                  Resent
                </span>
              ) : copiedId === inv.id ? (
                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full text-blue-600 bg-blue-50">
                  Copied!
                </span>
              ) : (
                <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                  Pending
                </span>
              )}
              {/* Three-dot menu for invitations (owner only) */}
              {isOwner && (
                <div className="relative" ref={menuOpenId === `inv-${inv.id}` ? menuRef : undefined}>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === `inv-${inv.id}` ? null : `inv-${inv.id}`)}
                    className="p-1 rounded-md hover:bg-[#e5e5e4] transition-colors cursor-pointer"
                  >
                    <MoreVertical className="w-3.5 h-3.5 text-[#888]" />
                  </button>
                  {menuOpenId === `inv-${inv.id}` && (
                    <div className="absolute right-0 top-7 z-10 bg-white rounded-lg shadow-lg border border-[rgba(0,0,0,0.08)] py-1 min-w-[120px]">
                      {inv.type === "email" ? (
                        <button
                          onClick={() => handleResend(inv)}
                          className="w-full px-3 py-1.5 text-left text-[13px] text-[#1A1A1A] hover:bg-[#f5f5f4] transition-colors cursor-pointer"
                        >
                          Resend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCopyLink(inv)}
                          className="w-full px-3 py-1.5 text-left text-[13px] text-[#1A1A1A] hover:bg-[#f5f5f4] transition-colors cursor-pointer"
                        >
                          Copy link
                        </button>
                      )}
                      <button
                        onClick={() => handleRevoke(inv)}
                        className="w-full px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leave team section */}
      <div className="border-t mt-3 pt-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        {confirmingLeave ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-[#555]">
              Leave {teamName}? You&apos;ll lose access to this workspace.
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleLeave}
                disabled={leavingTeam}
                className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {leavingTeam ? "Leaving..." : "Leave"}
              </button>
              <button
                onClick={() => { setConfirmingLeave(false); setLeaveError(null); }}
                className="px-2.5 py-1 rounded-md text-[12px] font-medium text-[#888] hover:bg-[#f0f0ee] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingLeave(true)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave team
          </button>
        )}
        {leaveError && (
          <p className="text-[12px] text-red-500 mt-1.5">{leaveError}</p>
        )}
      </div>
    </div>
  );
}
