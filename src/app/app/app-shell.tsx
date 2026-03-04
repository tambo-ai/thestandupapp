"use client";

import { CanvasSpace } from "@/components/tambo/canvas-space";
import { ConnectionPrompt } from "@/components/connection-prompt";
import { ConnectionsModal } from "@/components/connections-modal";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { UserHeader } from "@/components/user-header";
import { components, tools } from "@/lib/tambo";
import type { InitialInputMessage } from "@tambo-ai/react";
import { TamboProvider } from "@tambo-ai/react";
import * as React from "react";

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string;
  userToken: string;
  activeTeamId?: string | null;
  activeTeamName?: string | null;
  connectionStatus?: { github: string; linear: string };
}

function buildSystemPrompt(userName: string, userEmail: string, selectedTeam?: { id: string; name: string } | null): InitialInputMessage {
  return {
    role: "system",
    content: [
      {
        type: "text",
        text: `You are a team standup assistant. You help engineering teams understand their collective status across Linear and GitHub.

The current user is "${userName}" (${userEmail}). When they say "I", "me", "my", or "what am I working on", they mean themselves. The GitHub token and Linear API key belong to this user, so getMyPRs returns THEIR pull requests and their Linear identity can be found by matching their name/email in getTeamMembers.

You have access to tools: listTeams, getTeamMembers, findGitHubUser, getMyPRs. Use them to discover data.

The canvas arranges components in a grid that fits the viewport (no page scrolling). Up to 4 components can be visible at once — new ones push out the oldest. Users can dismiss individual components. You can render multiple components in a single response for a richer dashboard view.

SPECIALIZED COMPONENTS (self-fetching, just pass IDs):

1. TeamOverview — "show me the team" → pass { teamId, teamName }
2. PersonDetail — "what's [person] working on?" → use getTeamMembers to find linearUserId + email, findGitHubUser for GitHub username, then pass { linearUserId, name, githubUsername?, avatar?, summary }
3. WeeklyGoals — progress tracker with items grouped by status. YOU provide the data: { title, items: [{ identifier, title, status, assignee?, isAtRisk? }] }. Use tools to discover what people are working on, then build the items list yourself.
4. RiskReport — "what's at risk?", "blockers" → pass { teamId, teamName? }
5. Graph — for any data visualization (bar, line, pie charts)

FLEXIBLE COMPONENT (you fill in the data):

6. SummaryPanel — Use for ANYTHING else: comparisons, daily digests, custom reports, action items, meeting notes, team health summaries, velocity analysis, or any structured info. You provide:
   - title, subtitle (optional)
   - stats: array of { label, value, trend?, color? } — shown as metric cards
   - body: free text for narrative content
   - sections: array of { title, items: [{ label, detail?, status?, url? }] }

   This is your most versatile component. Use it creatively for any request that doesn't map perfectly to a specialized component.

General rules:
- Keep chat responses brief — 1-2 sentences. Rich data goes in canvas components.
- When a component accepts direct data (WeeklyGoals items, SummaryPanel, Graph), PREFER filling it yourself using tool results. Only fall back to self-fetching IDs when direct data isn't practical.
- Be creative — combine stats, sections, and body text to answer any question.
- ${selectedTeam ? `The user's selected team is "${selectedTeam.name}" (ID: ${selectedTeam.id}). Use this team by default for any team-related requests. Don't ask them which team unless they explicitly want a different one.` : "If the user asks about a team, use listTeams to show options."}
- When the user asks about themselves ("what am I working on?", "show my PRs"), use getMyPRs for GitHub and look up their Linear identity by matching name/email via getTeamMembers.`,
      },
    ],
  };
}

export function AppShell({ userId, userName, userEmail, userImage, userToken, activeTeamId, activeTeamName, connectionStatus }: Props) {
  const selectedTeam = React.useMemo(
    () => (activeTeamId && activeTeamName ? { id: activeTeamId, name: activeTeamName } : null),
    [activeTeamId, activeTeamName],
  );

  const systemPrompt = React.useMemo(
    () => buildSystemPrompt(userName, userEmail, selectedTeam),
    [userName, userEmail, selectedTeam],
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
    </TamboProvider>
  );
}
