"use client";

import { CanvasSpace } from "@/components/tambo/canvas-space";
import { ConnectionPrompt } from "@/components/connection-prompt";
import { ConnectionsModal } from "@/components/connections-modal";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { TeamSettingsModal } from "@/components/team-settings-modal";
import { TeamSwitcher } from "@/components/team-switcher";
import { UserHeader } from "@/components/user-header";
import { components, tools } from "@/lib/tambo";
import type { ContextHelpers, InitialInputMessage } from "@tambo-ai/react";
import { TamboProvider } from "@tambo-ai/react";
import * as React from "react";

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
  userToken: string;
  activeTeamId?: string | null;
  teams: Array<{
    id: string;
    name: string;
    slug: string;
    isPersonal: boolean;
    workosOrgId: string | null;
    role: "owner" | "member";
  }>;
  connectionStatus?: { github: string; linear: string };
  teamMembers: Array<{
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role: "owner" | "member";
    connections: { github: string; linear: string };
  }>;
}

function buildSystemPrompt(userName: string, userEmail: string, selectedTeam?: { id: string; name: string } | null): InitialInputMessage {
  return {
    role: "system",
    content: [
      {
        type: "text",
        text: `You are a standup assistant for engineering teams. You help teams understand what everyone is working on across GitHub and Linear — like a daily standup that's always up to date.

CURRENT USER: "${userName}" (${userEmail}). When they say "I", "me", "my", that means this user. getPullRequests returns THIS user's pull requests (personal scope). Their Linear identity is found by matching name/email via getTeamMembers.

QUERY SCOPE RULES:
- "my PRs", "what am I working on" → personal scope (current user only)
- "what is the team working on", "team status" → team scope (aggregate all members via team_roster context)
- "what is [name] working on" → per-member scope (look up that member in team_roster)

WRITE OPERATION RESTRICTION: NEVER perform write operations using another member's account. ALL writes (create PR, open issue, etc.) use the current user's credentials only. This is a hard security rule.

ATTRIBUTION: When showing cross-team data, always attribute results to the team member they belong to. Note members with missing connections (e.g., "Note: 2 of 5 members don't have GitHub connected").

${selectedTeam ? `SELECTED TEAM: "${selectedTeam.name}" (ID: ${selectedTeam.id}). Use this team by default for any team-related requests. Don't ask which team unless they explicitly want a different one.` : "If the user asks about a team, use listTeams to show options."}

TOOLS: listTeams, getTeamMembers, findGitHubUser, searchIssues, getPullRequests. All tools support scope='team' with memberIds for cross-team queries. Use team_roster context helper (provides member list with connection status on every message) to get member IDs. Only pass members with the relevant connection (github/linear) when using team scope.

CANVAS COMPONENTS:
The canvas arranges components in a grid (no page scrolling). Up to 4 visible at once — new ones push out the oldest. Users can dismiss individual components. Render multiple components for richer views.

Specialized (self-fetching, pass IDs):
1. TeamOverview — "show me the team" → { teamId, teamName }
2. PersonDetail — "what's [person] working on?" → find linearUserId + email via getTeamMembers, findGitHubUser for GitHub username, then pass { linearUserId, name, githubUsername?, avatar?, summary }
3. WeeklyGoals — progress tracker, YOU provide data: { title, items: [{ identifier, title, status, assignee?, isAtRisk? }] }
4. RiskReport — "what's at risk?" → { teamId, teamName? }
5. Graph — data visualization (bar, line, pie charts)

Flexible (you fill in data):
6. SummaryPanel — Anything else: comparisons, digests, reports, action items, health summaries, velocity. Provide: title, subtitle?, stats[], body, sections[].

RESPONSE STYLE:
- Brief chat responses (1-2 sentences). Rich data goes in canvas components.
- Prioritize standup-relevant data: recent activity, blockers, in-progress work, PRs awaiting review.
- When a component accepts direct data, PREFER filling it yourself from tool results.
- Be creative — combine stats, sections, and body text to answer any question.

// Phase 7: Live standup mode will extend this prompt with structured round-robin behavior`,
      },
    ],
  };
}

export function AppShell({ userId, userName, userEmail, userImage, userToken, activeTeamId, teams, connectionStatus, teamMembers }: Props) {
  const activeTeam = React.useMemo(
    () => teams.find((t) => t.id === activeTeamId) ?? null,
    [teams, activeTeamId],
  );

  const selectedTeam = React.useMemo(
    () => (activeTeam ? { id: activeTeam.id, name: activeTeam.name } : null),
    [activeTeam],
  );

  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Toast notification for removed members
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Read removed_from_team cookie
    const match = document.cookie.match(/(?:^|;\s*)removed_from_team=([^;]*)/);
    if (match) {
      const teamNameValue = decodeURIComponent(match[1]);
      // Clear the cookie immediately
      document.cookie = "removed_from_team=; path=/; max-age=0";
      setToast(`You were removed from ${teamNameValue}`);
      setTimeout(() => setToast(null), 5000);
    }
  }, []);

  const systemPrompt = React.useMemo(
    () => buildSystemPrompt(userName, userEmail, selectedTeam),
    [userName, userEmail, selectedTeam],
  );

  const contextHelpers: ContextHelpers = React.useMemo(
    () => ({
      team_roster: () => ({
        teamId: activeTeam?.id ?? null,
        teamName: activeTeam?.name ?? null,
        currentUser: { id: userId, name: userName, email: userEmail },
        members: teamMembers.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          avatarUrl: m.avatarUrl,
          role: m.role,
          connections: m.connections,
        })),
      }),
    }),
    [activeTeam, userId, userName, userEmail, teamMembers],
  );

  const [modalOpen, setModalOpen] = React.useState(false);
  const [connStatus, setConnStatus] = React.useState(
    connectionStatus ?? { github: "not_installed", linear: "not_installed" },
  );

  // Track latest connStatus in a ref so pollConnectionStatus can compare
  // against the pre-poll baseline without re-creating on every state change.
  const connStatusRef = React.useRef(connStatus);
  React.useEffect(() => {
    connStatusRef.current = connStatus;
  }, [connStatus]);

  const pollAbortRef = React.useRef<AbortController | null>(null);

  const pollConnectionStatus = React.useCallback(async () => {
    // Cancel any previous poll in progress
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    const baseline = connStatusRef.current;
    const delays = [500, 1000, 2000, 2000, 2000, 2000];
    let lastData: { github: string; linear: string } | null = null;

    for (const delay of delays) {
      if (controller.signal.aborted) return;
      await new Promise((r) => setTimeout(r, delay));
      if (controller.signal.aborted) return;

      try {
        const res = await fetch("/api/connections/status", {
          signal: controller.signal,
        });
        const data = await res.json();
        lastData = data;

        // Stop early if any provider changed status
        if (
          data.github !== baseline.github ||
          data.linear !== baseline.linear
        ) {
          setConnStatus(data);
          return;
        }
      } catch {
        if (controller.signal.aborted) return;
        // Network error — continue polling
      }
    }

    // Exhausted all attempts — update with latest result anyway
    if (lastData) {
      setConnStatus(lastData);
    }
  }, []);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const handleModalClose = React.useCallback(() => {
    setModalOpen(false);
    // Fire and forget — modal closes immediately, polling happens in background
    pollConnectionStatus();
  }, [pollConnectionStatus]);

  const hasNoConnections =
    connStatus.github !== "connected" && connStatus.linear !== "connected";

  const [chatWidth, setChatWidth] = React.useState(400);
  const [dragging, setDragging] = React.useState(false);
  const rafRef = React.useRef(0);

  const onDragStart = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      const startX = e.clientX;
      const startW = chatWidth;

      function onMove(ev: MouseEvent) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          setChatWidth(Math.min(Math.max(startW + ev.clientX - startX, 300), 600));
        });
      }
      function onUp() {
        cancelAnimationFrame(rafRef.current);
        setDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [chatWidth],
  );

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      userToken={userToken}
      contextHelpers={contextHelpers}
      initialMessages={[systemPrompt]}
    >
      <div className="flex h-screen w-screen overflow-hidden">
        <div
          className="shrink-0 relative flex flex-col"
          style={{
            width: chatWidth,
            transition: dragging ? "none" : "width 0.15s ease",
          }}
        >
          <UserHeader
            userName={userName}
            userImage={userImage}
            connectionStatus={connStatus}
            onOpenModal={() => setModalOpen(true)}
            teamSwitcherSlot={
              <TeamSwitcher
                teams={teams}
                activeTeamId={activeTeamId ?? null}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            }
          />
          {hasNoConnections && (
            <ConnectionPrompt onOpenModal={() => setModalOpen(true)} />
          )}
          <div className="flex-1 min-h-0">
            <MessageThreadFull />
          </div>
          <div
            onMouseDown={onDragStart}
            className="absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-10 group flex items-center justify-center"
          >
            <div
              className="w-px h-full transition-all duration-150 group-hover:w-0.5 group-hover:rounded-full"
              style={{
                background: dragging ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.06)",
              }}
            />
          </div>
        </div>

        <CanvasSpace />
      </div>
      <ConnectionsModal isOpen={modalOpen} onClose={handleModalClose} />
      <TeamSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        teamId={activeTeam?.id ?? ""}
        teamName={activeTeam?.name ?? ""}
        teamSlug={activeTeam?.slug ?? ""}
        isPersonal={activeTeam?.isPersonal ?? true}
        isOwner={activeTeam?.role === "owner"}
        userId={userId}
      />
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-[#1A1A1A] text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </TamboProvider>
  );
}

