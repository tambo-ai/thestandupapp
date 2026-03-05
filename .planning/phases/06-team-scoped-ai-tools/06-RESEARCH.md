# Phase 6: Team-Scoped AI Tools - Research

**Researched:** 2026-03-04
**Domain:** Cross-team AI query aggregation, Tambo SDK thread/context management, WorkOS Pipes multi-user token access
**Confidence:** HIGH

## Summary

Phase 6 transforms the AI from a single-user assistant into a team-aware assistant that can aggregate data across all connected team members. The core technical challenges are: (1) looking up WorkOS Pipes tokens for arbitrary team members (not just the current user), (2) extending Tambo tools with a scope parameter for personal vs team-wide queries, (3) using Tambo's contextHelpers to inject team roster data into every message instead of bloating the system prompt, and (4) achieving per-user-per-team thread isolation despite Tambo only supporting per-userKey scoping.

The existing codebase is well-positioned for this. WorkOS Pipes `getAccessToken()` already accepts an arbitrary `userId` parameter -- the current `withGitHubToken`/`withLinearClient` wrappers just happen to use the requesting user's ID. API routes need variants that accept a target `userId` parameter for read operations while always using the requesting user's token for writes. Tambo's `contextHelpers` feature is the right mechanism for passing dynamic team data (member roster, connection status, current user identity) without stuffing it all into the system prompt.

**Primary recommendation:** Modify existing API routes to accept an optional `forUserId` query parameter for read operations (validated that the requesting user is in the same team), create a `contextHelpers` configuration that provides team roster and connection data on every message, and use a composite `userKey` (`${userId}:${teamId}`) to achieve per-team thread isolation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Modify existing tools with a scope parameter (personal vs team) -- not separate team-wide tools
- Both per-member queries ("what is Sarah working on?" using Sarah's tokens) and team-wide queries ("what is the team working on?" aggregating all members) must be supported
- AI decides scope per query based on user intent -- no hardcoded default
- AI must note when members have missing connections
- Member lookup by name + email for per-member queries
- AI can compare members' activity when asked
- Known concern: refresh token concurrency race (authkit-nextjs #28) may surface during parallel Pipes token lookups -- must be tested
- System prompt rebuilt from server-side data on every page load (extends current pattern in page.tsx)
- AI knows the current user identity AND server enforces write-as-self
- Per-user-per-team thread scoping (carries forward Phase 4 decision)
- Each user's threads are strictly private
- Thread sidebar filtered to current team only
- Unlimited thread history
- Tambo manages thread lifecycle -- no custom cleanup needed on member removal
- Dual enforcement for write operations: AI system prompt instructs "never write as another member" AND server routes always use requesting user's own token
- Server-side enforcement via WorkOS Pipes (withGitHubToken/withLinearClient already scoped to current user)
- Standup-focused AI persona
- Mode-aware prompt structure -- design so Phase 7 live standup can extend with different behavior
- Personal workspace functions as a team of one -- same tools work, just no aggregation

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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | AI system prompt is rebuilt from server-side team and connection data (not localStorage) | page.tsx already fetches server-side data; extend to include team member roster and connection status per member; use Tambo contextHelpers for dynamic data |
| AI-02 | AI tools use WorkOS Pipes token lookup per member for read operations | WorkOS Pipes `getAccessToken({ provider, userId, organizationId })` supports arbitrary userId; create `forUserId` parameter on API routes |
| AI-03 | AI can answer "what is the team working on" by aggregating across all members' connections | Tools gain scope parameter; API routes iterate over team members' tokens in parallel with error isolation per member |
| AI-04 | AI results from cross-team queries include attribution (which member each result belongs to) | API response format extended with `memberName`/`memberId` fields; AI instructed via prompt to include attribution |
| AI-05 | Write operations use only the requesting user's connection | Existing `withGitHubToken`/`withLinearClient` already enforce this; no `forUserId` parameter on write routes |
| AI-06 | Each user retains their own personal conversation threads | Tambo `userKey` prop with composite key `${userId}:${teamId}` provides per-user-per-team thread isolation |

</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tambo-ai/react | current | AI conversation framework | Already the app's AI layer; contextHelpers + userKey features enable this phase |
| @workos-inc/node | current | WorkOS Pipes token access | `pipes.getAccessToken()` with arbitrary userId is the cross-member token mechanism |
| @workos-inc/authkit-nextjs | current | Auth + session | `withAuth()` for route protection; provides requesting user identity |
| kysely + @libsql/kysely-libsql | current | Database queries | Team member roster queries via `getFullDb()` |

### No New Dependencies Needed
This phase requires zero new libraries. All functionality is achieved by extending existing patterns with the tools already in the stack.

## Architecture Patterns

### Recommended Changes Structure
```
src/
├── app/
│   ├── app/
│   │   ├── page.tsx              # MODIFY: fetch team member roster + connection status per member
│   │   └── app-shell.tsx         # MODIFY: pass contextHelpers to TamboProvider, composite userKey
│   └── api/
│       ├── github/
│       │   └── prs/route.ts      # MODIFY: add forUserId param for cross-member reads
│       ├── linear/
│       │   ├── team/route.ts     # MODIFY: add forUserId param
│       │   ├── issues/route.ts   # MODIFY: add forUserId param
│       │   ├── search/route.ts   # MODIFY: add forUserId param
│       │   ├── risks/route.ts    # MODIFY: add forUserId param
│       │   └── cycle/route.ts    # MODIFY: add forUserId param
│       └── teams/
│           └── members/route.ts  # Already exists, already returns member roster
├── lib/
│   ├── tambo.ts                  # MODIFY: tools gain scope/memberId params, apiFetch passes forUserId
│   ├── github-client.ts          # ADD: withGitHubTokenForUser() variant
│   ├── linear-client.ts          # ADD: withLinearClientForUser() variant
│   └── team-context.ts           # NEW: helper to build team context data for contextHelpers
└── components/
    └── tambo/
        └── thread-history.tsx    # MINOR: display thread.name instead of truncated ID
```

### Pattern 1: Cross-Member Token Lookup
**What:** API routes accept `forUserId` query param to look up another team member's token
**When to use:** Read-only operations that need data from another team member's account
**Example:**
```typescript
// Source: WorkOS Pipes SDK types + existing withGitHubToken pattern
export function withGitHubTokenForUser(
  handler: (token: string, request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const { user, organizationId } = await withAuth({ ensureSignedIn: true });
    const forUserId = request.nextUrl.searchParams.get("forUserId");
    const targetUserId = forUserId || user.id;

    // If forUserId specified, verify requesting user is in the same team
    if (forUserId && forUserId !== user.id) {
      const fullDb = getFullDb();
      // Verify both users share a team (authorization check)
      const sharedTeam = await fullDb
        .selectFrom("memberships as m1")
        .innerJoin("memberships as m2", "m1.team_id", "m2.team_id")
        .where("m1.user_id", "=", user.id)
        .where("m2.user_id", "=", forUserId)
        .select("m1.team_id")
        .executeTakeFirst();
      if (!sharedTeam) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const result = await getWorkOS().pipes.getAccessToken({
      provider: "github",
      userId: targetUserId,
      ...(organizationId ? { organizationId } : {}),
    });

    if (!result.active) {
      return NextResponse.json(
        { error: "GitHub not connected", code: result.error, forUserId: targetUserId },
        { status: 401 },
      );
    }

    return handler(result.accessToken.accessToken, request);
  };
}
```

### Pattern 2: Tambo contextHelpers for Team Data
**What:** Pass dynamic team roster and connection data via contextHelpers instead of system prompt
**When to use:** Data that changes between sessions (team membership changes, connection status)
**Example:**
```typescript
// Source: Tambo SDK contextHelpers types
const contextHelpers: ContextHelpers = {
  team_roster: () => ({
    teamId: activeTeam.id,
    teamName: activeTeam.name,
    currentUser: { id: userId, name: userName, email: userEmail },
    members: teamMembers.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      connections: { github: m.githubConnected, linear: m.linearConnected },
    })),
  }),
};

// In TamboProvider:
<TamboProvider
  apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
  components={components}
  tools={tools}
  userKey={`${userId}:${activeTeamId}`}  // Composite key for per-team threads
  userToken={userToken}
  contextHelpers={contextHelpers}
  initialMessages={[systemPrompt]}
>
```

### Pattern 3: Tool Scope Parameter
**What:** Existing tools gain an optional scope/memberIds parameter
**When to use:** AI decides based on user intent whether to query personal or team-wide data
**Example:**
```typescript
// Source: existing tambo.ts defineTool pattern
const searchIssues = defineTool({
  name: "searchIssues",
  description:
    "Search Linear issues. Use scope='team' to search across all team members, or scope='personal' for the current user only. Pass memberIds to query specific members.",
  tool: async ({ query, limit, scope, memberIds }) => {
    if (scope === "team" || memberIds) {
      // Aggregate across members
      const targets = memberIds || "all"; // "all" triggers server-side member iteration
      const params = new URLSearchParams({ query, scope: "team" });
      if (limit) params.set("first", String(limit));
      if (memberIds) params.set("memberIds", memberIds.join(","));
      return apiFetch(`/api/linear/search?${params}`);
    }
    // Personal scope (existing behavior)
    const params = new URLSearchParams({ query });
    if (limit) params.set("first", String(limit));
    return apiFetch(`/api/linear/search?${params}`);
  },
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().optional(),
    scope: z.enum(["personal", "team"]).optional().describe("personal = current user only, team = all team members"),
    memberIds: z.array(z.string()).optional().describe("Specific member IDs to query"),
  }),
  outputSchema: z.array(/* ... */),
});
```

### Pattern 4: Composite userKey for Per-Team Thread Isolation
**What:** Use `userKey` prop (not `userToken` alone) to scope threads per team
**When to use:** Ensures switching teams shows different conversation history
**Example:**
```typescript
// Tambo SDK supports both userKey and userToken simultaneously.
// userKey takes precedence for thread scoping when provided.
// userToken is still used for API auth.
<TamboProvider
  apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
  userToken={userToken}           // Auth with Tambo API
  userKey={`${userId}:${activeTeamId}`}  // Thread scoping
  // ...
>
```
**Verification:** The Tambo SDK `ThreadListParams` accepts `userKey` for filtering, and `ThreadCreateParams` accepts `userKey` for association. The `useTamboThreadList()` hook automatically uses the provider's userKey.

### Anti-Patterns to Avoid
- **Stuffing team roster into system prompt:** Use contextHelpers instead -- system prompt should contain static instructions, contextHelpers carry dynamic data.
- **Creating separate tool functions for team vs personal:** Use a scope parameter on existing tools instead. The CONTEXT.md explicitly states this.
- **Calling Pipes getAccessToken in parallel without error isolation:** Each member's token lookup must be wrapped in try/catch to handle failures gracefully.
- **Using forUserId on write operations:** Write routes MUST NEVER accept forUserId. Only the requesting user's token is used for writes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Thread-per-team isolation | Custom thread DB table | Tambo `userKey` composite key | Tambo already handles thread storage, listing, pagination |
| Dynamic AI context | Giant system prompt string | Tambo `contextHelpers` | Runs on every message, can be async, automatically included |
| Cross-member token access | Custom OAuth token storage | WorkOS Pipes `getAccessToken({ userId })` | Pipes handles refresh, storage, error states |
| Thread name auto-generation | Custom naming logic | Tambo `autoGenerateThreadName` (default true) | Already enabled, generates after 3 messages |
| Thread renaming | Custom thread metadata | `useTambo().updateThreadName()` | SDK method already exists |

## Common Pitfalls

### Pitfall 1: Refresh Token Concurrency Race
**What goes wrong:** Parallel Pipes token lookups for multiple team members may trigger concurrent refresh token operations, causing race conditions (authkit-nextjs #28)
**Why it happens:** WorkOS Pipes may need to refresh an expired OAuth token, and if multiple requests hit simultaneously for the same user, the refresh can race
**How to avoid:** Serialize token lookups per-user (not per-member), or use Promise.allSettled with retry logic. For team-wide queries, batch members and handle failures individually.
**Warning signs:** Intermittent 401 errors during team-wide queries, tokens becoming invalid after parallel lookups

### Pitfall 2: Missing organizationId in Pipes Calls
**What goes wrong:** `getAccessToken` returns `not_installed` even after successful OAuth
**Why it happens:** Phase 03-04 discovered that WorkOS Pipes requires `organizationId` when user belongs to an organization
**How to avoid:** Always pass `organizationId` from the requesting user's session. For cross-member lookups, use the team's `workos_organization_id` from the DB.
**Warning signs:** All cross-member token lookups fail with "not_installed"

### Pitfall 3: userKey vs userToken Precedence
**What goes wrong:** Threads not scoped correctly when both userKey and userToken are provided
**Why it happens:** Tambo SDK docs say userKey OR userToken, not both. Need to verify behavior when both are set.
**How to avoid:** Test explicitly: set `userKey` to composite key and `userToken` for API auth. If conflicts arise, may need to drop `userToken` and use `userKey` only (would need to handle token exchange differently).
**Warning signs:** Thread lists showing all threads across teams, or no threads at all

### Pitfall 4: N+1 API Calls in Team-Wide Queries
**What goes wrong:** A 5-person team query makes 5 separate GitHub API calls sequentially, causing slow responses
**Why it happens:** Naive implementation loops through members one at a time
**How to avoid:** Use Promise.allSettled for parallel execution. Set per-member result limits. For larger teams (>5), consider batching.
**Warning signs:** Team-wide queries taking >10 seconds

### Pitfall 5: Tool Error Responses Breaking AI Flow
**What goes wrong:** When one member's token lookup fails, the entire tool call fails
**Why it happens:** Tool throws an error instead of returning partial results
**How to avoid:** Always return partial results with error annotations per member. Never throw from a tool for expected failures (missing connections, token errors).
**Warning signs:** AI responding with generic error messages instead of partial results

## Code Examples

### Team Member Roster Query (page.tsx extension)
```typescript
// Source: existing page.tsx pattern + schema.ts MembershipsTable
// Fetch team members with connection status for the active team
const teamMembers = activeTeamId ? await fullDb
  .selectFrom("memberships")
  .innerJoin("users", "users.id", "memberships.user_id")
  .where("memberships.team_id", "=", activeTeamId)
  .select([
    "users.id",
    "users.name",
    "users.email",
    "users.avatar_url",
    "memberships.role",
  ])
  .execute() : [];

// Check connection status for each member via Pipes
const memberConnections = await Promise.allSettled(
  teamMembers.map(async (member) => {
    const [gh, linear] = await Promise.allSettled([
      workos.pipes.getAccessToken({ provider: "github", userId: member.id, ...(orgId ? { organizationId: orgId } : {}) }),
      workos.pipes.getAccessToken({ provider: "linear", userId: member.id, ...(orgId ? { organizationId: orgId } : {}) }),
    ]);
    return {
      userId: member.id,
      github: gh.status === "fulfilled" && gh.value.active ? "connected" : "not_connected",
      linear: linear.status === "fulfilled" && linear.value.active ? "connected" : "not_connected",
    };
  })
);
```

### Thread History with Names
```typescript
// Source: Tambo SDK useTambo().updateThreadName + thread.name field
// In thread-history.tsx, display thread.name when available
<span className="font-medium line-clamp-1">
  {thread.name || `Thread ${thread.id.substring(0, 8)}`}
</span>

// Rename handler using useTambo hook
const { updateThreadName } = useTambo();
const handleNameSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingThread || !newName.trim()) return;
  await updateThreadName(editingThread.id, newName.trim());
  setEditingThread(null);
};
```

### System Prompt Structure (Mode-Aware for Phase 7)
```typescript
// Source: existing buildSystemPrompt pattern
function buildSystemPrompt(userName: string, userEmail: string): InitialInputMessage {
  return {
    role: "system",
    content: [{
      type: "text",
      text: `You are a team standup assistant for engineering teams.
Your primary role is helping teams understand their collective status across Linear and GitHub.

## Current User
You are speaking with "${userName}" (${userEmail}).
When they say "I", "me", "my", they mean themselves.

## Query Behavior
- "my PRs" / "what am I working on?" -> personal scope, current user only
- "what is [name] working on?" -> personal scope, specific member
- "what is the team working on?" / "team status" -> team scope, all members
- "compare Sarah and Alex" -> team scope, specific members

## Write Operations
NEVER perform write operations (create PR, open issue, etc.) using another member's account.
ALL write operations use the current user's credentials only.

## Attribution
When showing cross-team data, always attribute results to the team member they belong to.
Note any members with missing connections transparently.

## Response Style
Keep chat responses brief (1-2 sentences). Rich data goes in canvas components.
Prioritize standup-relevant data: recent activity, blockers, in-progress work.`,
    }],
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| System prompt with all context | contextHelpers for dynamic data | Tambo v1 SDK | Dynamic data sent per-message, not embedded in static prompt |
| Thread ID display only | Auto-generated thread names | Tambo v1 SDK | `autoGenerateThreadName` enabled by default, threshold 3 messages |
| No thread renaming | `updateThreadName()` method | Tambo v1 SDK | useTambo() hook provides updateThreadName |
| Custom thread storage | Tambo-managed threads | Already in use | Threads persisted by Tambo, scoped by userKey |

## Open Questions

1. **userKey + userToken Coexistence**
   - What we know: Tambo docs say provide ONE of userKey or userToken. The SDK types accept both on TamboProvider.
   - What's unclear: Does providing both cause conflicts? Does userKey override userToken for thread scoping while userToken handles API auth?
   - Recommendation: Test in Phase 6 Wave 0. If conflicts, use userKey only and handle Tambo API auth via API key alone (no user token exchange needed for tool-based flows).

2. **organizationId for Cross-Member Pipes Lookups**
   - What we know: Phase 03-04 discovered organizationId is required. Current code uses the requesting user's session organizationId.
   - What's unclear: For cross-member lookups, should we use the team's `workos_organization_id` from our DB, or the requesting user's session organizationId?
   - Recommendation: Use the team's `workos_organization_id` from DB -- it's the canonical org association for the team.

3. **Refresh Token Concurrency (authkit-nextjs #28)**
   - What we know: Known issue flagged in STATE.md. Parallel Pipes calls for different users may trigger concurrent refresh.
   - What's unclear: Whether this affects server-side Pipes calls (not just client auth) and whether batching mitigates it.
   - Recommendation: Must test explicitly. Mitigation: serialize Pipes calls within a single request, or use a simple mutex/queue for token lookups.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (manual testing) |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run build` (type checking) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | System prompt built from server-side data | manual | Verify in browser: system prompt contains team members | N/A |
| AI-02 | Pipes token lookup for other members | manual | Call API route with forUserId param, verify response | N/A |
| AI-03 | Team-wide query aggregation | manual | Ask "what is the team working on?" in chat | N/A |
| AI-04 | Attribution in results | manual | Verify cross-team results show member names | N/A |
| AI-05 | Write ops use requesting user only | manual | Verify write API routes reject forUserId, check network tab | N/A |
| AI-06 | Per-user thread isolation | manual | Switch teams, verify different thread history | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full manual verification of all 6 requirements

### Wave 0 Gaps
- No test framework configured (per CLAUDE.md: "No test framework is currently configured")
- Manual testing via development server is the established pattern
- Type checking via `npm run build` catches structural errors

## Sources

### Primary (HIGH confidence)
- Tambo SDK `@tambo-ai/react` package source types -- TamboProvider props, contextHelpers, useTambo hook, thread types, ThreadListParams
- WorkOS `@workos-inc/node` Pipes types -- `getAccessToken({ provider, userId, organizationId })`
- Existing codebase: `src/lib/tambo.ts`, `src/app/app/app-shell.tsx`, `src/app/app/page.tsx`, `src/lib/github-client.ts`, `src/lib/linear-client.ts`
- Tambo official docs at docs.tambo.co -- contextHelpers, user authentication, conversation storage

### Secondary (MEDIUM confidence)
- Tambo docs on additional context -- confirmed contextHelpers run on every message, auto-included in AI context
- Tambo docs on user authentication -- confirmed threads scoped to userKey, isolated per user

### Tertiary (LOW confidence)
- userKey + userToken coexistence behavior -- needs testing, SDK types allow both but docs say "provide ONE"
- Refresh token concurrency behavior under parallel server-side Pipes calls -- flagged concern, needs explicit testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, types verified from node_modules
- Architecture: HIGH - patterns extend existing working code, Tambo SDK features verified from source types
- Pitfalls: MEDIUM - refresh token concurrency is a known but untested concern; userKey/userToken interaction needs validation

**Research date:** 2026-03-04
**Valid until:** 2026-03-18 (14 days -- Tambo SDK may update, but patterns are stable)
