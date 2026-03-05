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
- Claude's discretion on tool architecture (new team-wide tools vs modifying existing tools vs hybrid)
- Both per-member queries ("what is Sarah working on?") and team-wide queries ("what is the team working on?") must be supported
- Per-member queries should use that specific member's token via WorkOS Pipes
- AI must note when members have missing connections — e.g., "Note: 2 of 5 members don't have GitHub connected"
- Claude's discretion on caching strategy for team-wide queries (existing HTTP cache patterns available as reference)
- Known concern: refresh token concurrency race (authkit-nextjs #28) may surface during parallel Pipes token lookups — must be tested

### Attribution in Results
- Claude's discretion on grouping style (by person vs inline labels) based on component and query type
- Claude's discretion on whether to update existing components (add attribution props) or route cross-team results through SummaryPanel
- Claude's discretion on including member avatars alongside attribution names (based on available data from WorkOS user profiles)
- Claude's discretion on whether to show per-member connection status in team-wide results

### System Prompt & Team Context
- System prompt rebuilt from server-side data on every page load (extends current pattern in page.tsx)
- Claude's discretion on what member info to include in prompt (names, emails, roles, connection status — balance freshness vs prompt size)
- AI knows the current user identity (for natural language like "my PRs" vs "Sarah's PRs") AND server enforces write-as-self regardless
- Personal workspace functions as a team of one — same tools work, just no aggregation

### Thread & Conversation Scoping
- Per-user-per-team thread scoping (carries forward Phase 4 decision: switching teams shows different conversation history)
- Each user's threads are strictly private — no team member can see another's conversation history
- Claude's discretion on thread cleanup when a member leaves/is removed
- Claude's discretion on thread memory between conversations (independent vs light context carryover)

### Write Operation Enforcement
- Write operations (create PR, open issue) always use the requesting user's own token — never another member's
- Server-side enforcement via WorkOS Pipes (withGitHubToken/withLinearClient already scoped to current user)
- AI system prompt should reinforce this: "When performing write actions, always use the current user's connection"

### Claude's Discretion
- Tool architecture pattern (new tools vs modifying existing vs hybrid)
- Caching and performance strategy for multi-member queries
- Attribution display style per component/query type
- Component modifications vs SummaryPanel for aggregated results
- System prompt member info granularity
- Thread cleanup on membership changes
- Cross-thread memory approach
- Avatar inclusion in attribution

</decisions>

<specifics>
## Specific Ideas

- The AI should feel like a team assistant that knows everyone, not a tool that requires configuration — when you ask "what is the team working on?" it just works
- Missing connections should be noted transparently but not block the query — partial results are better than no results
- Write-as-self is a hard rule, not a suggestion — the server must enforce this regardless of what the AI tries to do

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/tambo.ts`: Current tool definitions (listTeams, getTeamMembers, findGitHubUser, searchIssues) — extend or wrap for team-wide queries
- `src/lib/github-client.ts`: `withGitHubToken()` wrapper retrieves current user's GitHub token via WorkOS Pipes — pattern for per-member token lookup
- `src/lib/linear-client.ts`: `withLinearClient()` wrapper retrieves current user's Linear token via WorkOS Pipes — same pattern
- `src/app/app/page.tsx`: Already queries user's teams and connection status server-side — extend to include team member roster
- `src/app/app/app-shell.tsx`: `buildSystemPrompt()` function — extend with team member context
- `src/lib/db.ts`: `getFullDb()` for cross-table queries, `teamDb(teamId)` for scoped queries
- `src/lib/schema.ts`: MembershipsTable with user_id, team_id, role — needed for member roster queries
- SummaryPanel component: Flexible enough to display attributed cross-team results without modification

### Established Patterns
- `apiFetch()` in tambo.ts — tools call API routes which handle token retrieval internally
- WorkOS Pipes `getAccessToken({ provider, userId, organizationId })` — can be called for any user, not just the current one
- Server-component-first: page.tsx fetches data, passes to client AppShell
- HTTP cache headers on API responses (300s for team list, 60-120s for queries)
- Components can be self-fetching (TeamOverview, RiskReport) or data-provided (WeeklyGoals, SummaryPanel)

### Integration Points
- `src/lib/tambo.ts` — Add/modify tools for team-wide queries
- `src/app/api/` routes — May need new routes or modifications for multi-member token iteration
- `src/app/app/page.tsx` — Extend to pass team member roster to AppShell for system prompt
- `src/app/app/app-shell.tsx` — Extend buildSystemPrompt() with team member info
- `src/lib/github-client.ts` and `src/lib/linear-client.ts` — May need variants that accept a specific userId for cross-member token lookup
- Tambo TamboProvider — Thread scoping may need configuration changes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-team-scoped-ai-tools*
*Context gathered: 2026-03-04*
