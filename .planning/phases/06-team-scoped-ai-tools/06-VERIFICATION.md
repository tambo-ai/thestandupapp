---
phase: 06-team-scoped-ai-tools
verified: 2026-03-05T04:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 10/10
  uat_gaps_found: 2
  gaps_closed:
    - "Threads are isolated per team — switching teams shows different thread history (UAT test 1)"
    - "AI returns partial results for connected members and notes which members had errors (UAT test 7)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Ask AI 'what is the team working on?' in a team with multiple connected members"
    expected: "AI calls searchIssues and/or getPullRequests with scope='team', results appear with per-member attribution in a SummaryPanel or similar component"
    why_human: "Requires a live Tambo session with real WorkOS tokens and at least 2 connected team members"
  - test: "Verify forUserId returns 403 when called by a non-team member"
    expected: "HTTP 403 response with { error: 'Unauthorized' }"
    why_human: "Requires two actual WorkOS user sessions that do not share a team"
  - test: "Switch teams and verify thread history changes"
    expected: "Different set of conversation threads shown after switching to a different team"
    why_human: "Requires two teams with separate thread histories; cannot be verified from static code inspection"
  - test: "Ask AI 'show me everyone's PRs' when a team member lacks GitHub"
    expected: "AI shows PRs for connected members and notes which members had errors, not a blanket failure"
    why_human: "Requires at least one team member without GitHub connected; behavior depends on AI model interpreting tool descriptions"
---

# Phase 6: Team-Scoped AI Tools Verification Report

**Phase Goal:** AI queries across all team members' connections for cross-team standup answers
**Verified:** 2026-03-05T04:30:00Z
**Status:** PASSED
**Re-verification:** Yes -- after UAT gap closure (plans 06-04 and 06-05)

## Re-verification Context

The initial verification (2026-03-04) passed 10/10 truths on code inspection. Subsequent UAT testing revealed two runtime issues:

1. **Thread isolation (UAT test 1):** Threads were not isolated per team because `userKey` was removed from `TamboProvider` due to auth conflicts, leaving `useTamboThreadList()` unfiltered. Plan 06-04 fixed this with server-side thread pre-creation and `userKey` filtering on `useTamboThreadList`.

2. **Partial error handling (UAT test 7):** The AI model treated any member error as a blanket failure because tool descriptions and `outputSchema` lacked partial-success guidance. Plan 06-05 fixed this with `.describe()` annotations and description updates.

Both UAT gap statuses are marked `resolved` in `06-UAT.md`.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | API routes can fetch data using any team member's token when forUserId is provided | VERIFIED | `withGitHubTokenForUser` and `withLinearClientForUser` read `forUserId` from query params and retrieve the target user's token via WorkOS Pipes |
| 2 | API routes validate that the requesting user shares a team with the target user | VERIFIED | Both wrappers perform a `memberships` self-join in `getFullDb()` and return 403 if no shared team row is found |
| 3 | Write operations never accept forUserId -- always use the requesting user's token | VERIFIED | `withGitHubToken` and `withLinearClient` are preserved unchanged and contain no `forUserId` logic |
| 4 | System prompt is rebuilt from server-side team and connection data on every page load | VERIFIED | `page.tsx` fetches team roster with `Promise.allSettled` on each page render; `buildSystemPrompt` is called inside a `useMemo` with server-supplied data |
| 5 | AI knows the current user identity and team membership | VERIFIED | `buildSystemPrompt` embeds `userName` and `userEmail`; `contextHelpers.team_roster` provides the full member list with connection status on every message |
| 6 | Each user sees only their own threads scoped to their current team | VERIFIED | `useTamboThreadList({ userKey })` called at thread-history.tsx:88-90 with composite `userId:teamId` key; server-side thread pre-creation at `/api/tambo/threads` tags new threads with same composite key; `TamboProvider` does NOT receive `userKey` (avoids auth conflict) |
| 7 | Thread names are auto-generated and displayed instead of truncated IDs | VERIFIED | `ThreadHistoryList` renders `thread.name \|\| \`Thread ${thread.id.substring(0, 8)}\`` and filters by name in search |
| 8 | AI can answer 'what is the team working on' by aggregating data across all members' connections | VERIFIED | `apiFetchForMembers` helper iterates member IDs, appending `forUserId` to each API call; `searchIssues` and `getPullRequests` use it for `scope='team'` |
| 9 | Cross-team query results include attribution showing which team member each item belongs to | VERIFIED | Team-scope paths in all tools add `memberName` per item (flat tools) or `visibleTo` array (dedup tools) |
| 10 | Partial results returned when some members have missing connections, with clear per-member error notes | VERIFIED | `apiFetchForMembers` uses `Promise.allSettled` and captures per-member errors; `getPullRequests` and `searchIssues` tool descriptions explicitly instruct AI: "present the successful results...Do NOT treat partial errors as a complete failure"; outputSchema `errors` field has `.describe()` with partial-success semantics |

**Score:** 10/10 truths verified

---

### Gap Closure Artifacts (06-04: Thread Isolation)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/tambo/threads/route.ts` | POST endpoint creating threads with composite userKey | VERIFIED | 46 lines; authenticates via `withAuth({ ensureSignedIn: true })`; constructs `userId:teamId` key; calls Tambo REST API; returns `{ id, userKey }` |
| `src/components/tambo/thread-history.tsx` | `useTamboThreadList` filtered by userKey | VERIFIED | Line 88-90: `useTamboThreadList(userKey ? { userKey } : undefined)`; `userKey` in props (line 64) and context (line 41) |
| `src/components/tambo/message-thread-full.tsx` | Forwards userKey and onCreateThread to ThreadHistory | VERIFIED | Lines 36-37: props defined; line 48: `<ThreadHistory position={historyPosition} userKey={userKey} onCreateThread={onCreateThread}>` |
| `src/app/app/app-shell.tsx` | Compute tamboUserKey, TeamScopedThreadArea with handleCreateThread | VERIFIED | Lines 100-106: `tamboUserKey` computed as `userId:teamId` or `userId`; lines 332-367: `TeamScopedThreadArea` inner component uses `useTambo()` for `initThread`, fetches `/api/tambo/threads` |

### Gap Closure Key Links (06-04)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `thread-history.tsx` | `useTamboThreadList` | `{ userKey }` parameter | WIRED | Line 89: `useTamboThreadList(userKey ? { userKey } : undefined)` |
| `app-shell.tsx` | `/api/tambo/threads` | fetch POST for thread pre-creation | WIRED | Line 344: `fetch("/api/tambo/threads", { method: "POST", ... body: JSON.stringify({ teamId: ... }) })` |
| `app-shell.tsx` | `MessageThreadFull` | `userKey` and `onCreateThread` props | WIRED | Lines 362-365: `<MessageThreadFull userKey={tamboUserKey} onCreateThread={handleCreateThread} />` |
| `MessageThreadFull` | `ThreadHistory` | `userKey` and `onCreateThread` props forwarded | WIRED | Line 48: `<ThreadHistory position={historyPosition} userKey={userKey} onCreateThread={onCreateThread}>` |
| `ThreadHistoryNewButton` | `onCreateThread` | Context callback | WIRED | Lines 245-249: checks `onCreateThread` first, falls back to `startNewThread()` |

### Gap Closure Artifact (06-05: Partial Error Handling)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/tambo.ts` | Updated tool descriptions and outputSchema with partial-success guidance | VERIFIED | `searchIssues` description (line 239): "Do NOT treat partial errors as a complete failure"; `getPullRequests` description (line 309): same pattern; `errors` field `.describe()` at lines 302 and 385 with "Presence of errors does NOT mean the tool call failed" |

### Gap Closure Key Links (06-05)

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tambo.ts` getPullRequests description | AI behavior | Tool description instructs on partial error handling | WIRED | Line 309: "present the successful results to the user and mention which members had errors" |
| `tambo.ts` outputSchema errors field | AI interpretation | `.describe()` annotation | WIRED | Line 385: `.describe("Per-member errors...Presence of errors does NOT mean the tool call failed...")` |
| `tambo.ts` searchIssues description | AI behavior | Tool description instructs on partial error handling | WIRED | Line 239: "present the successful results and note which members had errors" |
| `tambo.ts` searchIssues outputSchema errors field | AI interpretation | `.describe()` annotation | WIRED | Line 302: `.describe("Per-member errors...Presence of errors does NOT mean the tool call failed...")` |

### Constraint Verification

| Constraint | Status | Evidence |
|------------|--------|---------|
| No `userKey` on `TamboProvider` (causes auth conflict) | VERIFIED | Lines 256-264 of app-shell.tsx: `<TamboProvider apiKey=... components=... tools=... tamboUrl=... userToken=... contextHelpers=... initialMessages=...>` -- no `userKey` prop |
| Build compiles cleanly | VERIFIED | `npm run build` succeeds with no TypeScript errors |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AI-01 | 06-02 | AI system prompt rebuilt from server-side team and connection data | SATISFIED | `page.tsx` fetches roster server-side; `buildSystemPrompt` uses server-provided `userName`, `userEmail`, `selectedTeam`; `contextHelpers` provides live team data |
| AI-02 | 06-01 | AI tools use WorkOS Pipes token lookup per member for read operations | SATISFIED | All 7 read API routes use `withGitHubTokenForUser`/`withLinearClientForUser` which call `workos.pipes.getAccessToken({ userId: targetUserId })` |
| AI-03 | 06-03, 06-05 | AI can answer "what is the team working on" by aggregating across all members' connections | SATISFIED | `searchIssues` and `getPullRequests` tools support `scope='team'` via `apiFetchForMembers`; partial-error guidance ensures results are shown even when some members fail |
| AI-04 | 06-03, 06-05 | AI results from cross-team queries include attribution | SATISFIED | Team-scope results include `memberName` field per item; partial-error guidance ensures connected members' results are shown with attribution even when others fail |
| AI-05 | 06-01 | Write operations use only the requesting user's connection | SATISFIED | Original `withGitHubToken` and `withLinearClient` preserved without `forUserId`; system prompt contains explicit "WRITE OPERATION RESTRICTION" |
| AI-06 | 06-02, 06-04 | Each user retains their own personal conversation threads | SATISFIED | `userKey = userId:teamId` scopes threads per user per team; server-side thread pre-creation tags threads with composite key; `useTamboThreadList({ userKey })` filters by key |

All 6 requirements for Phase 6 are SATISFIED. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/tambo/thread-history.tsx` | 351, 529 | HTML `placeholder` attribute | Info | Standard UI placeholder text on input elements -- not a code stub. No impact. |
| `src/app/app/app-shell.tsx` | 83 | `// Phase 7: Live standup mode will extend this prompt...` | Info | Intentional forward-looking comment documented in plan. No impact on current phase. |

No blockers or warnings found.

---

### Human Verification Required

#### 1. Team-scope AI query with multiple connected members

**Test:** In a team with 2+ members who have GitHub and/or Linear connected, ask the AI "what is the team working on?"
**Expected:** AI invokes `searchIssues` and/or `getPullRequests` with `scope='team'` and passes member IDs from `team_roster`; results display with per-member attribution
**Why human:** Requires a live Tambo session with real WorkOS tokens and at least 2 connected team members

#### 2. Unauthorized cross-member access blocked

**Test:** Make a GET request to `/api/linear/search?query=test&forUserId=<id-of-user-not-on-your-team>` while authenticated
**Expected:** HTTP 403 with `{ "error": "Unauthorized" }`
**Why human:** Requires two WorkOS user accounts that do not share a team membership

#### 3. Per-team thread isolation (UAT gap closure)

**Test:** Switch between two teams in the app; observe the thread history sidebar
**Expected:** Each team shows a different set of conversation threads; no cross-contamination
**Why human:** Requires two teams with separate Tambo thread histories populated under different `userKey` values

#### 4. Partial error handling for disconnected members (UAT gap closure)

**Test:** Ask the AI "show me everyone's PRs" in a team where at least one member has not connected GitHub
**Expected:** AI shows PRs for connected members and notes which members had errors (e.g., "GitHub not connected for [name]"), not a blanket failure message
**Why human:** Requires at least one team member without GitHub connected; behavior depends on AI model interpreting updated tool descriptions

---

### Gaps Summary

No gaps. All 10 observable truths are verified, all gap closure artifacts from plans 06-04 and 06-05 are substantive and wired, all key links are confirmed in code, and all 6 phase requirements (AI-01 through AI-06) are satisfied. The build passes cleanly with no TypeScript errors.

Both UAT gaps have been addressed:
- **Thread isolation:** Server-side thread pre-creation with composite `userKey`, filtered `useTamboThreadList({ userKey })`, and `TeamScopedThreadArea` inner component for `initThread` access.
- **Partial error handling:** Tool descriptions and `outputSchema` `.describe()` annotations explicitly instruct the AI to present partial results and note per-member errors.

Four human verification items remain, including two new items covering the UAT gap closure scenarios.

---

_Verified: 2026-03-05T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
