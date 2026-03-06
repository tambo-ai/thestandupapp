# The Standup App

## What This Is

An AI-powered standup tool for engineering teams. Team members connect their GitHub and Linear accounts via WorkOS Pipes, and an AI assistant surfaces what everyone is working on — PRs, issues, risks, weekly goals — through a conversational canvas UI built on Tambo AI and Next.js. Teams share a workspace where the AI aggregates data across all members' connections.

## Core Value

A team can see what everyone is working on across GitHub and Linear through a single AI-powered conversation, without anyone manually writing status updates.

## Requirements

### Validated

- ✓ WorkOS AuthKit login with persistent sessions and logout — v1.0
- ✓ WorkOS Pipes OAuth for GitHub and Linear (no manual token pasting) — v1.0
- ✓ Multi-tenant DB schema with team-scoped queries (Turso/Kysely) — v1.0
- ✓ Team creation with WorkOS Organization provisioning — v1.0
- ✓ Team join via email invitation or shareable invite link — v1.0
- ✓ Owner controls: remove members, manage invitations, edit team, delete team — v1.0
- ✓ AI aggregates across all team members' connections with per-member attribution — v1.0
- ✓ Write operations restricted to requesting user's own connection — v1.0
- ✓ Per-team conversation threads via composite userKey — v1.0
- ✓ Connection status visibility (connected/disconnected/needs reauth) — v1.0
- ✓ Server-side token management (no tokens in localStorage or API responses) — v1.0
- ✓ Canvas-based component layout with registered AI components — v1.0

### Active

- [ ] Live standup mode: shared screen where team views the same AI conversation
- [ ] Standup mode has input control (one person drives at a time)
- [ ] Driver role can be transferred during a session
- [ ] Post-standup AI summary when session ends
- [ ] Presence list showing who is in the session

### Out of Scope

- Native mobile app — web-first
- Real-time notifications/webhooks from GitHub/Linear — on-demand queries only
- Role-based permissions beyond owner/member — keep it simple
- Self-hosted deployment — SaaS-first
- Billing/payments — free for now
- Slack bot integration — this product replaces Slack standup bots

## Context

Shipped v1.0 with 16,313 LOC TypeScript across 6 phases in 9 days.

Tech stack: Next.js 15, React 19, Tailwind CSS v4, Tambo AI, WorkOS AuthKit + Pipes, Turso/libSQL + Kysely.

The app supports full multi-tenant team workflows: auth, connections, team management, and AI-powered cross-team queries. Live standup features (real-time shared sessions, driver control, summaries) are planned for v2.0.

## Constraints

- **Auth provider**: WorkOS AuthKit for login, WorkOS Pipes for GitHub/Linear OAuth
- **Database**: Turso/libSQL with Kysely
- **AI framework**: Tambo AI
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS v4

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| WorkOS AuthKit replaces Better Auth | Unified auth + OAuth pipe management under one provider | ✓ Good |
| WorkOS Pipes for GitHub/Linear | Eliminates manual token pasting, enables team-level aggregation | ✓ Good |
| Keep Turso + Kysely | Already set up, works well for the scale | ✓ Good |
| Read-across, write-as-self permission model | Team visibility without impersonation risk | ✓ Good |
| Invite links + email invitations for joining | Flexible team formation | ✓ Good |
| Composite userKey (userId:teamId) for threads | Scopes conversations per team without separate thread stores | ✓ Good |
| contextHelpers over system prompt for team data | Keeps prompt focused on behavior, dynamic data flows through context | ✓ Good |
| Promise.allSettled for cross-member queries | One member failure doesn't block the team query | ✓ Good |
| Description-only partial error guidance | Underlying code already handles errors; AI just needed coaching | ✓ Good |

---
*Last updated: 2026-03-06 after v1.0 milestone*
