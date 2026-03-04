# The Standup App

## What This Is

An AI-powered standup tool for engineering teams. Team members connect their GitHub and Linear accounts, and an AI assistant surfaces what everyone is working on — PRs, issues, risks, weekly goals — through a conversational canvas UI built on Tambo AI and Next.js.

## Core Value

A team can see what everyone is working on across GitHub and Linear through a single AI-powered conversation, without anyone manually writing status updates.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Google OAuth login via Better Auth — existing
- ✓ AI-powered conversational UI via Tambo AI with canvas rendering — existing
- ✓ Linear integration: list teams, team members, search issues, cycle data, risk analysis — existing
- ✓ GitHub integration: search/list PRs by repo/org/author, find users by email — existing
- ✓ Encrypted client-side token storage (AES-GCM, PBKDF2 key derivation) — existing
- ✓ Canvas-based component layout (up to 4 visible, dismissable) — existing
- ✓ Registered AI components: TeamOverview, PersonDetail, PullRequestList, WeeklyGoals, RiskReport, SummaryPanel — existing
- ✓ Server-side API routes for Linear and GitHub with caching — existing
- ✓ Turso/libSQL database with Kysely for session storage — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Replace Better Auth with WorkOS AuthKit for user login
- [ ] Replace manual GitHub/Linear API key entry with WorkOS Pipes OAuth connections
- [ ] User can create a new team (workspace)
- [ ] User can join an existing team via invite link
- [ ] User can join an existing team via email invitation
- [ ] Team member can connect their GitHub account via WorkOS Pipes
- [ ] Team member can connect their Linear account via WorkOS Pipes
- [ ] Connected accounts stored server-side (not in localStorage)
- [ ] Write operations (create PR, open issue) use only the requesting user's connection
- [ ] Read operations can aggregate data across all team members' connections
- [ ] Each user has their own conversation threads
- [ ] Team shares a workspace (shared tools, config, team-wide queries)
- [ ] Workspace owner can manage team membership
- [ ] AI can answer "what is the team working on" by aggregating across members' connections

### Out of Scope

- Native mobile app — web-first
- Real-time notifications/webhooks from GitHub/Linear — on-demand queries only
- Role-based permissions beyond owner/member — keep it simple for v1
- Self-hosted deployment — SaaS-first
- Billing/payments — free for now

## Context

The app currently works as a single-user tool where each person pastes their own GitHub token and Linear API key into a settings modal. These are encrypted and stored in localStorage. The server-side API routes receive these tokens via request headers (`x-linear-api-key`, `x-github-token`).

The shift to WorkOS replaces two things:
1. **Login**: Better Auth (Google OAuth) → WorkOS AuthKit (handles login UI, sessions)
2. **API connections**: Manual token pasting → WorkOS Pipes (OAuth flows for GitHub and Linear)

This also introduces multi-tenancy: users belong to teams, and the AI can query across team members' connected accounts for read operations while restricting write operations to the acting user's connection.

The existing Turso/libSQL database (with Kysely) will be extended to store users, teams, memberships, and WorkOS connection references. The Tambo API key stays server-side as an environment variable.

## Constraints

- **Auth provider**: WorkOS AuthKit for login, WorkOS Pipes for GitHub/Linear OAuth
- **Database**: Turso/libSQL with Kysely (already in use)
- **AI framework**: Tambo AI (already integrated, keep as-is)
- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS v4

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| WorkOS AuthKit replaces Better Auth | Unified auth + OAuth pipe management under one provider | — Pending |
| WorkOS Pipes for GitHub/Linear | Eliminates manual token pasting, enables team-level aggregation | — Pending |
| Keep Turso + Kysely | Already set up, works well for the scale | — Pending |
| Read-across, write-as-self permission model | Team visibility without impersonation risk | — Pending |
| Invite links + email invitations for joining | Flexible team formation | — Pending |

---
*Last updated: 2026-03-03 after initialization*
