---
status: resolved
phase: 06-team-scoped-ai-tools
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md]
started: 2026-03-05T03:00:00Z
updated: 2026-03-05T04:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Thread Scoping per Team
expected: When on a team, your AI threads are isolated to that team. If you switch to a different team (or personal workspace), the thread history changes — you see only threads created in that context.
result: issue
reported: "yup, thread are not isolated per team"
severity: major

### 2. Thread Name Display
expected: Thread sidebar shows thread names (not raw IDs). If a thread has no name set, it falls back to a truncated ID.
result: pass

### 3. Thread Rename
expected: You can rename a thread in the sidebar. After renaming, the new name persists and shows in the thread list.
result: pass

### 4. AI Knows Team Roster
expected: Ask the AI "who's on my team?" and it responds with a list of team members including their GitHub/Linear connection status (connected or not connected).
result: pass

### 5. AI Personal Scope Query
expected: Ask the AI "show me my PRs" and it returns only your own pull requests (personal scope, no other members' data).
result: pass

### 6. AI Team Scope Query
expected: Ask the AI "show me everyone's PRs" or "what's the team working on?" and it returns data from all connected team members with attribution showing who each item belongs to.
result: pass

### 7. AI Handles Missing Connections Gracefully
expected: If a team member hasn't connected their GitHub or Linear account, the AI still returns results for connected members and notes which members couldn't be queried (no crash or error).
result: issue
reported: "show me everyone's PRs returned 'GitHub returned Unauthorized' blanket error instead of partial results for connected members"
severity: major

## Summary

total: 7
passed: 5
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Threads are isolated per team — switching teams shows different thread history"
  status: resolved
  reason: "User reported: yup, thread are not isolated per team"
  severity: major
  test: 1
  root_cause: "Tambo SDK returns status:invalid when both userKey and userToken are provided. userKey was removed to fix auth. Without userKey, threads have no team scoping. Fix: pass userKey to useTamboThreadList() for filtering (independent of TamboProvider auth) and use server-side thread pre-creation with composite userKey."
  artifacts:
    - path: "src/app/app/app-shell.tsx"
      issue: "userKey removed from TamboProvider due to auth conflict"
    - path: "src/components/tambo/thread-history.tsx"
      issue: "useTamboThreadList() called with no userKey filter"
  missing:
    - "Server-side thread pre-creation route with composite userKey"
    - "Pass userKey to useTamboThreadList({ userKey: 'userId:teamId' })"
  debug_session: ".planning/debug/team-thread-isolation.md"

- truth: "AI returns partial results for connected members and notes which members couldn't be queried"
  status: resolved
  reason: "User reported: show me everyone's PRs returned 'GitHub returned Unauthorized' blanket error instead of partial results for connected members"
  severity: major
  test: 7
  root_cause: "Promise.allSettled and apiFetchForMembers work correctly — errors array is populated alongside results. But the AI model interprets a non-empty errors array as complete failure because tool description and outputSchema lack guidance on partial success. Fix: add description to errors field in outputSchema and update tool description to instruct AI to present partial results."
  artifacts:
    - path: "src/lib/tambo.ts"
      issue: "getPullRequests tool description and outputSchema errors field lack partial-success guidance"
  missing:
    - "Add .describe() to errors field in outputSchema explaining partial success"
    - "Update tool description to say 'present successful results, note errored members'"
  debug_session: ".planning/debug/team-scope-pr-unauthorized.md"
