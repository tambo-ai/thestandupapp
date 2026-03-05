# Phase 6: Team-Scoped AI Tools - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The AI can answer team-wide questions by aggregating data across all connected team members' accounts, while restricting write operations to the acting user only and preserving per-user conversation threads. This phase updates the tool system, API routes, system prompt, and thread scoping to support multi-member queries with attribution.

</domain>

<decisions>
## Implementation Decisions

### Cross-Team Query Pattern
- Modify existing tools with a scope parameter (personal vs team) — not separate team-wide tools
- Both per-member queries ("what is Sarah working on?" using Sarah's tokens) and team-wide queries ("what is the team working on?" aggregating all members) must be supported
- AI decides scope per query based on user intent — no hardcoded default ("my PRs" = personal, "team status" = team-wide)
- AI must note when members have missing connections — e.g., "Note: 2 of 5 members don't have GitHub connected"
- Caching: context-dependent mix — standup summaries can use cached data, "what's happening right now" gets fresh results
- Parallelism: depends on query count — small teams can parallel fetch, large teams may need batching
- On token errors: skip the failed member and note it in the response ("Could not fetch data for Alex — connection issue")
- Member lookup by name + email for per-member queries
- AI can compare members' activity when asked ("who has the most open PRs?", "compare Sarah and Alex")
- Known concern: refresh token concurrency race (authkit-nextjs #28) may surface during parallel Pipes token lookups — must be tested

### Attribution in Results
- Claude's discretion on grouping style (by person vs inline labels) based on component and query type
- Claude's discretion on component modifications vs SummaryPanel for aggregated results
- Claude's discretion on including member avatars (based on available WorkOS user profile data)
- Show binary connection status per member in team-wide results (GitHub connected/not, Linear connected/not)
- Claude's discretion on dedup strategy when same item appears from multiple members' data

### System Prompt & Team Context
- System prompt rebuilt from server-side data on every page load (extends current pattern in page.tsx)
- AI knows the current user identity (for natural language like "my PRs" vs "Sarah's PRs") AND server enforces write-as-self
- Research Tambo's additional context features for passing team/member data — may be better than stuffing everything into the system prompt
- Use Tambo additional context for timezone awareness across team members
- Personal workspace functions as a team of one — same tools work, just no aggregation
- Standup-focused AI persona — prioritize standup-relevant data (recent activity, blockers, in-progress work) as the default lens
- Mode-aware prompt structure — design so Phase 7 live standup can extend with different behavior (more structured, round-robin awareness)
- Claude's discretion on prompt member info granularity and formatting guidance

### Thread & Conversation Scoping
- Per-user-per-team thread scoping (carries forward Phase 4 decision: switching teams shows different conversation history)
- Each user's threads are strictly private — no team member can see another's conversation history
- Thread sidebar filtered to current team only
- Unlimited thread history — no caps
- Tambo manages thread lifecycle — no custom cleanup needed on member removal
- Research Tambo SDK for thread title auto-generation + edit support (thread history component may already support this)
- Research Tambo's additional context features for light cross-thread references ("like I showed you earlier")
- Research how Tambo handles thread scoping per team — may need configuration beyond userToken
- No thread pinning for v1
- Claude's discretion on thread deletion and new-thread-on-app-open behavior

### Write Operation Enforcement
- Dual enforcement: AI system prompt instructs "never write as another member" AND server routes always use requesting user's own token
- Write operations (create PR, open issue) always use the requesting user's own token — never another member's
- Server-side enforcement via WorkOS Pipes (withGitHubToken/withLinearClient already scoped to current user)

### Claude's Discretion
- Attribution display style per component/query type (grouped vs inline)
- Component modifications vs SummaryPanel for aggregated results
- Avatar inclusion in attribution
- Dedup strategy for overlapping data
- System prompt member info granularity and formatting
- Personal workspace code path (same mechanism vs keep existing)
- Per-member result limits for team-wide queries
- Thread deletion support
- New-thread-on-app-open vs resume-last behavior
- Connection gap suggestion tone (just report vs suggest connecting)

</decisions>

<specifics>
## Specific Ideas

- The AI should feel like a team assistant that knows everyone — when you ask "what is the team working on?" it just works
- Missing connections should be noted transparently but not block the query — partial results are better than no results
- Write-as-self is a hard rule, not a suggestion — the server must enforce this regardless of what the AI tries to do
- Research Tambo's additional context, resources, and tool context features as alternatives to bloating the system prompt
- Thread titles should be auto-generated and editable (verify existing thread history component support)
- Mode-aware prompt prepares for Phase 7 live standup without adding that functionality now

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/tambo.ts`: Current tool definitions (listTeams, getTeamMembers, findGitHubUser, searchIssues) — modify with scope parameter
- `src/lib/github-client.ts`: `withGitHubToken()` wrapper retrieves current user's GitHub token via WorkOS Pipes — pattern for per-member token lookup
- `src/lib/linear-client.ts`: `withLinearClient()` wrapper retrieves current user's Linear token via WorkOS Pipes — same pattern
- `src/app/app/page.tsx`: Already queries user's teams and connection status server-side — extend to include team member roster
- `src/app/app/app-shell.tsx`: `buildSystemPrompt()` function — extend with team member context and standup persona
- `src/lib/db.ts`: `getFullDb()` for cross-table queries, `teamDb(teamId)` for scoped queries
- `src/lib/schema.ts`: MembershipsTable with user_id, team_id, role — needed for member roster queries
- SummaryPanel component: Flexible enough to display attributed cross-team results without modification
- Thread history sidebar: May already support thread title editing — verify during research

### Established Patterns
- `apiFetch()` in tambo.ts — tools call API routes which handle token retrieval internally
- WorkOS Pipes `getAccessToken({ provider, userId, organizationId })` — can be called for any user, not just the current one
- Server-component-first: page.tsx fetches data, passes to client AppShell
- HTTP cache headers on API responses (300s for team list, 60-120s for queries)
- Components can be self-fetching (TeamOverview, RiskReport) or data-provided (WeeklyGoals, SummaryPanel)

### Integration Points
- `src/lib/tambo.ts` — Modify tools with scope parameter for team-wide queries
- `src/app/api/` routes — Need modifications for multi-member token iteration
- `src/app/app/page.tsx` — Extend to pass team member roster to AppShell for system prompt
- `src/app/app/app-shell.tsx` — Extend buildSystemPrompt() with team context and standup persona
- `src/lib/github-client.ts` and `src/lib/linear-client.ts` — Need variants that accept a specific userId for cross-member token lookup
- Tambo TamboProvider — Research additional context features and thread scoping configuration
- Research: Tambo's additional context helpers, resources, and tool context features

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-team-scoped-ai-tools*
*Context gathered: 2026-03-04*
