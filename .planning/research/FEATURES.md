# Feature Landscape

**Domain:** AI-powered team standup tool with WorkOS auth, OAuth pipe connections, team management, and live shared-screen standup sessions
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH (WorkOS Pipes docs verified; standup tool patterns from multiple sources; live session mechanics partially inferred from Spinach.ai)

---

## Table Stakes

Features users expect. Missing any of these = product feels incomplete or broken.

### Auth and Identity

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sign up / sign in via social or email | Entry-level expectation for any SaaS tool | Low | WorkOS AuthKit handles this entirely via hosted UI. No custom auth UI needed. |
| Session persistence across browser refreshes | Users should not re-login constantly | Low | WorkOS AuthKit manages sessions server-side. |
| Logout | Universal expectation | Low | AuthKit session termination. |
| Post-login redirect to intended destination | Prevents frustrating redirect-to-home behavior | Low | AuthKit supports redirect URI on callback. |
| Error feedback on failed auth | "Something went wrong" is unacceptable — tell users why | Low | AuthKit hosted UI handles most error display. |

### WorkOS Pipes Connection Flow

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| GitHub connection via OAuth widget | Users expect one-click connect, not token pasting | Low-Med | Use WorkOS Pipes widget + `workos.pipes.getAccessToken()`. Requires custom OAuth app in production. |
| Linear connection via OAuth widget | Same as GitHub — API key pasting is a power-user experience most skip | Low-Med | WorkOS Pipes supports Linear. Same widget pattern. |
| Connection status visibility | Users need to know if their accounts are connected or broken | Low | Widget natively shows connection state, reauthorization prompts. |
| Reauthorize a broken connection | Tokens expire or scopes change — users need a path to fix it | Low | Widget handles this: surfaces "needs reauth" state. |
| Disconnect an account | Users expect to be able to revoke at any time | Low | Widget provides disconnect. App must handle empty-token state gracefully. |
| Prompt to connect on first use | New users who skip connections should see a clear call to action, not a confusing empty state | Med | Custom "connect your accounts" onboarding state after first login. |

### Team / Workspace Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create a team (workspace) on first login | Users creating a new workspace need this as the starting point | Med | App creates WorkOS Organization + local DB team record. Owner role assigned automatically. |
| Invite teammates via email | Standard SaaS collaboration expectation | Med | WorkOS Invitations API: sends email, handles new vs. existing user paths automatically. |
| Join via invite link | Flexible alternative to email — useful for onboarding multiple people at once | Med | Needs shareable link that maps to organization membership. WorkOS supports this through custom invitation flows. |
| Accept invitation | Invited users must complete a clear accept/join step | Low | WorkOS Invitations API handles click-to-join with consent (doesn't silently add users). |
| See team members | Users need to know who is in their workspace | Low | Membership list from WorkOS Organization membership records. |
| Leave a team | Users may need to exit a workspace | Low | WorkOS delete organization membership API. |

### Workspace Owner Controls

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Remove a member | Owner must be able to manage membership | Low | WorkOS update/delete organization membership. |
| Resend invitation | Invites get lost in email — resend is standard | Low | WorkOS Invitations API supports re-invitation. |
| Revoke a pending invitation | Owner should be able to cancel sent invites | Low | WorkOS Invitations API: `revokeInvitation()`. |
| View pending invitations | Owner needs visibility into who has and hasn't joined | Low | WorkOS list invitations. |

### Connected Account Aggregation (Read Operations)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AI can query across all team members' connected accounts | The whole point of the team workspace — one conversation sees everyone's work | High | Per-user tokens retrieved server-side via WorkOS Pipes. AI tool routes use requesting user's session but pull all team members' tokens for read queries. |
| "What is the team working on?" answers everyone | Core value proposition — must work or the product is just a single-user tool | High | Requires mapping WorkOS user IDs to stored connection records. |
| Attribution: show which member a result belongs to | Data from multiple people's accounts must stay labeled | Med | Include member name/avatar in response. AI components already have `PersonDetail`. |

### AI Conversation (Existing, Must Remain Working)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Personal conversation threads | Each user's conversation is their own | Low | Already built. Must persist after WorkOS migration. |
| AI responses reflect team context | System prompt must include team membership, members' names | Med | Rebuild system prompt to use server-side team/member data instead of localStorage. |
| Tool invocations still work | All existing Linear/GitHub tools must function after auth migration | Med | API routes switch from header-passed tokens to server-side WorkOS Pipes token lookup. |

---

## Differentiators

Features that set this product apart. Not universally expected, but meaningfully valuable.

### Live Standup Mode

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Shared standup session (all members see the same AI conversation in real time) | The only standup tool combining live shared-screen with AI data aggregation across connected accounts | High | Requires real-time sync. Options: Ably, Liveblocks, Pusher, or Partykit. WebSockets preferred. Session URL shareable within team. |
| Presenter/driver role: one person drives the conversation at a time | Prevents chaotic multi-input; mirrors how standups actually work — one person asks, AI answers | Med | "Lock" state on thread input; non-drivers see input disabled. Driver visible to all (avatar/name indicator). |
| Rotate the driver role during session | Teams pass the mic — each person can "take the wheel" for their own update | Med | Button to transfer control. Can be manual (owner transfers) or any-member-requests-and-driver-approves. |
| Session participants list (who's watching) | Transparency about who is present in the standup | Low-Med | Presence list using real-time channel. WebSocket presence events. |
| Session start / end by owner or any member | Clear lifecycle signals — session has a beginning and end | Low | "Start standup" creates session record; "End standup" terminates it. |
| Post-standup summary | After session ends, AI generates a written summary of what was covered | Med | Tambo-based: AI summarizes thread after session ends. Stored as thread artifact. |

### Cross-Account Data Intelligence

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Aggregate GitHub PRs across all team members | One query surfaces everyone's open PRs without anyone writing a status update | Med | Already partially built (multi-member query). Needs server-side token resolution. |
| Risk detection across team | Surfaces blocked issues, stale PRs across the whole team automatically | Med | Existing `RiskReport` component. Extend to multi-member context. |
| "What is [person] working on?" resolves across their connected accounts | Named-person queries work even without knowing their token details | Med | Match name to team member, fetch their connections server-side. |

### Onboarding Intelligence

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Empty-state AI guidance: "Connect your GitHub and Linear to get started" | Removes blank-slate confusion for new users | Low | Conditional system prompt section when connections are absent. |
| First-standup walkthrough prompt: AI suggests "Try asking about the team" | Shortens time-to-value for new workspace owners | Low | One-time suggestion pills on first session. |

---

## Anti-Features

Features to deliberately NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom OAuth server / token refresh logic | WorkOS Pipes owns this entirely. Building it means duplicating infrastructure, managing edge cases, and maintaining security surface. | Use `workos.pipes.getAccessToken()` exclusively. Never store raw OAuth tokens in your DB — only WorkOS connection references. |
| Role-based permissions beyond Owner/Member | v1 complexity trap. RBAC sounds like a good idea until you're building permission matrices instead of features. | Two roles only: Owner (created workspace) and Member. Write-as-self is the permission model for data safety. |
| Async standup scheduling / bot reminders | There are 10+ tools that do this. This product's differentiator is live AI aggregation, not reminder bots. | Defer indefinitely. If added, use a simple cron + email. Not a core feature. |
| Real-time notifications / webhooks from GitHub and Linear | Already out of scope. On-demand queries are simpler and sufficient for standup cadence. | Poll on query. Cache responses at 2-5 min TTL as already implemented. |
| Billing / paywall UI | Not needed now. Adding it prematurely creates dead weight and distraction. | Defer. Free tier only for v1. |
| Native mobile app | Web-first is fine for standup tool used at a desk during a meeting. | Responsive web only. |
| Per-channel Slack bot integration | Standup bots in Slack are the incumbent approach this product is replacing. Build against the grain. | The value is the AI canvas, not a Slack bot. Don't dilute identity. |
| Manual team member token entry (old pattern) | The whole point of WorkOS Pipes is to eliminate this. Keeping it as a fallback confuses the UX. | Remove entirely. WorkOS Pipes or nothing. |
| Storing raw OAuth access tokens in your database | Security and compliance risk. WorkOS Pipes manages token storage and refresh. | Store only `workosUserId` + `workosConnectionId`. Fetch tokens on demand via Pipes API. |
| Workspace-level Linear/GitHub org configuration by admin | For a small-team standup tool, each person's individual connections are sufficient. Team-level config adds admin overhead. | Each member connects their own account. AI aggregates. |

---

## Feature Dependencies

Dependencies between features (B requires A to function):

```
WorkOS AuthKit login
  └── Team creation (requires authenticated user to become owner)
        └── Email invitation (requires team to exist)
              └── Member joins team (requires invitation or invite link)
                    └── Member connects GitHub/Linear via Pipes (requires team membership)
                          └── AI cross-team aggregation (requires at least one member connected)
                                └── Live standup mode (requires team + members with connections)
                                      └── Driver rotation (requires active standup session)
                                            └── Post-standup summary (requires session to have ended)

WorkOS Pipes widget
  └── Connection status display (requires Pipes widget embedded)
        └── Reauthorize / disconnect (requires connection status working)

Real-time session infrastructure (WebSockets/Ably/Liveblocks)
  └── Shared session view (requires real-time sync)
        └── Participants list (requires presence channel)
              └── Driver role (requires presence + lock state broadcast)
```

---

## MVP Recommendation

For this milestone (auth migration + team management + live standup), prioritize in this order:

**Phase 1 — Auth Migration (unblocks everything)**
1. WorkOS AuthKit replaces Better Auth for login/logout
2. API routes switch to server-side token lookup via WorkOS Pipes
3. WorkOS Pipes widget for GitHub and Linear connection
4. Connection status + reauth + disconnect in a settings/profile view

**Phase 2 — Team Workspace**
5. Team creation on first login (create WorkOS org + local team record)
6. Email invitation flow (WorkOS Invitations API)
7. Invite link flow (shareable URL → join team)
8. Team member list + owner controls (remove member, revoke invite)

**Phase 3 — Cross-Team AI**
9. AI system prompt rebuilt from server-side team/connection data
10. Tools refactored to use Pipes token lookup per member
11. "What is the team working on?" cross-member aggregation

**Phase 4 — Live Standup Mode**
12. Session create/join/end lifecycle
13. Real-time sync of AI conversation to all session participants
14. Driver role: one person controls input at a time
15. Driver rotation mechanism
16. Participants presence list
17. Post-standup summary

**Defer:**
- Async standup scheduling
- Slack integration
- Webhook-based notifications
- Advanced analytics

---

## Sources

- [WorkOS Pipes Docs](https://workos.com/docs/pipes) — MEDIUM confidence (verified official docs)
- [WorkOS Pipes blog announcement](https://workos.com/blog/workos-pipes-third-party-integrations) — HIGH confidence (official)
- [WorkOS Pipes: Fetch Linear data tutorial](https://workos.com/blog/fetch-data-from-linear-with-pipes-tutorial) — HIGH confidence (official tutorial)
- [WorkOS Pipes Widget Docs](https://workos.com/docs/widgets/pipes) — MEDIUM confidence (official docs, some gaps)
- [WorkOS AuthKit Modeling Your App](https://workos.com/docs/authkit/modeling-your-app) — HIGH confidence (official docs)
- [WorkOS Invitations Docs](https://workos.com/docs/authkit/invitations) — HIGH confidence (official docs)
- [WorkOS Organization Membership API](https://workos.com/docs/reference/authkit/organization-membership) — HIGH confidence (official docs)
- [Spinach.ai live standup feature description](https://www.spinach.ai/content/best-standup-tools) — MEDIUM confidence (competitor, self-reported)
- [Best async standup tools comparison](https://runsteady.com/best-async-standup-tools/) — MEDIUM confidence (industry overview, multiple tools)
- [Liveblocks real-time collaboration](https://liveblocks.io) — MEDIUM confidence (web search, not deeply verified)
- [SaaS invite flow patterns](https://userpilot.com/blog/onboard-invited-users-saas/) — MEDIUM confidence (community/blog)
