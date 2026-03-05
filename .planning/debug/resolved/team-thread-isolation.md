---
status: resolved
trigger: "Investigate why per-team thread isolation doesn't work"
created: 2026-03-04T00:00:00Z
updated: 2026-03-05T04:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED — threads can be scoped per team by passing userKey as a listOptions argument to useTamboThreadList(), even when userToken is the auth mechanism. Thread creation must also encode teamId in the thread metadata. The SDK's auth conflict is only when userKey is passed to TamboProvider itself.
test: Verified SDK source for all thread filtering and metadata mechanisms
expecting: N/A — investigation complete
next_action: Report diagnosis

## Symptoms

expected: Each team sees only their own AI conversation threads
actual: After removing userKey (which broke auth), all threads are visible across teams — no isolation
errors: useTamboAuthState returns { status: "invalid" } when both userKey and userToken are provided (lines 24-27 of use-tambo-v1-auth-state.js)
reproduction: Set userKey and userToken simultaneously on TamboProvider
started: Phase 06-02 introduced composite userKey (userId:teamId) for scoping — this broke auth

## Eliminated

- hypothesis: Can use userKey alongside userToken for thread scoping (via TamboProvider prop)
  evidence: SDK auth validation explicitly returns "invalid" status when both userKey and userToken are provided (use-tambo-v1-auth-state.js lines 24-27)
  timestamp: 2026-03-04T00:00:00Z

- hypothesis: Thread metadata/tags can be used to filter threads server-side
  evidence: ThreadListParams only supports cursor, limit, userKey — no metadata filtering. Client-side filtering by metadata is possible but requires fetching all threads first.
  timestamp: 2026-03-04T00:00:00Z

- hypothesis: The SDK has no way to scope threads by team at all
  evidence: useTamboThreadList() accepts listOptions?: ThreadListParams which includes userKey field. This is separate from the TamboProvider-level userKey. The list hook merges context userKey with explicit listOptions, with explicit taking precedence (line 47-49 of use-tambo-v1-thread-list.js).
  timestamp: 2026-03-04T00:00:00Z

## Evidence

- timestamp: 2026-03-04T00:00:00Z
  checked: use-tambo-v1-auth-state.js lines 22-27
  found: SDK invalidates auth when BOTH userKey AND userToken are provided to TamboProvider
  implication: Cannot pass userKey to TamboProvider when using userToken

- timestamp: 2026-03-04T00:00:00Z
  checked: use-tambo-v1-thread-list.js lines 41-57
  found: useTamboThreadList(listOptions?, queryOptions?) accepts listOptions.userKey independently of TamboProvider-level userKey. The effective userKey is: listOptions.userKey ?? contextUserKey (context being TamboProvider's userKey prop).
  implication: Can pass userKey directly to useTamboThreadList() without going through TamboProvider. This bypasses the auth conflict.

- timestamp: 2026-03-04T00:00:00Z
  checked: threads.d.ts — ThreadListParams interface
  found: ThreadListParams = { cursor?, limit?, userKey? }. No metadata filter. Thread objects DO include metadata?: unknown and userKey?: string fields.
  implication: The only server-side filter is userKey. No tag/metadata-based filtering in the API.

- timestamp: 2026-03-04T00:00:00Z
  checked: threads.d.ts — ThreadCreateParams and ThreadCreateResponse
  found: ThreadCreateParams includes userKey?: string and metadata?: unknown. Threads created with a userKey will have that userKey stored and filterable via ThreadListParams.userKey.
  implication: If threads are created with a composite userKey (userId:teamId), they can later be filtered by that exact userKey.

- timestamp: 2026-03-04T00:00:00Z
  checked: use-tambo-v1-send-message.js lines 183-229 (createRunStream)
  found: When creating a new thread (no existing threadId), the SDK calls client.threads.runs.create() with thread: { userKey } where userKey comes from useTamboConfig() (the TamboProvider-level config). Since TamboProvider has no userKey when using userToken, all threads are created without a userKey.
  implication: This is the creation-side problem. Even if listing could filter by userKey, threads created without one can't be filtered.

- timestamp: 2026-03-04T00:00:00Z
  checked: tambo-client-provider.js lines 22-31
  found: userKey is sent as defaultQuery on ALL API requests when provided to TamboClientProvider. This means it goes on every request including thread creation.
  implication: The problem is circular — TamboProvider's userKey cannot coexist with userToken in auth validation, yet it's the mechanism for tagging threads at creation time.

- timestamp: 2026-03-04T00:00:00Z
  checked: app-shell.tsx lines 248-256
  found: TamboProvider uses userToken={userToken} only, no userKey. activeTeamId is available in scope but not passed to Tambo. Thread history component calls useTamboThreadList() with no arguments, getting all threads for the authenticated user.
  implication: All team threads are visible because: (a) no userKey on thread creation = no filter key, (b) useTamboThreadList() has no filter = shows all threads.

## Resolution

root_cause: |
  The Tambo SDK has mutually exclusive auth paths: userKey (anonymous identifier) vs userToken (OAuth token exchange). When userToken is used, userKey cannot be passed to TamboProvider without triggering an "invalid" auth state. This means:
  1. Threads created via TamboProvider with userToken have NO userKey attached (createRunStream passes userKey from TamboConfig, but TamboConfig has no userKey when only userToken is configured).
  2. useTamboThreadList() with no args returns ALL threads belonging to the authenticated user across all teams — no team scoping.

  The correct mechanism exists but is unused: useTamboThreadList() accepts listOptions.userKey independently, and thread creation via ThreadCreateParams supports userKey. But the SDK's own createRunStream only uses the userKey from TamboConfig (which is empty when userToken is used), so there's no path to tag threads at creation time through the standard API.

fix: |
  Two-pronged approach required:

  OPTION A — Client-side filtering (zero SDK changes, but leaks thread data across teams):
  - Pass a teamId filter to useTamboThreadList() using the metadata field
  - Filter returned threads client-side in thread-history.tsx by metadata.teamId
  - Store teamId in thread metadata when creating threads (need a custom thread creation path)
  - LIMITATION: All threads are still fetched — just hidden in UI. Cross-team leakage at API level.

  OPTION B — userKey-based server filtering (correct isolation, but requires bypassing SDK auth check):
  - Encode teamId in thread userKey: use composite key "userId:teamId"
  - Pass this as listOptions.userKey to useTamboThreadList() for filtered listing
  - For thread creation: use client.threads.create({ userKey: "userId:teamId" }) then run on that thread
  - OR: Use a server-side proxy API route that creates threads with the composite userKey injected
  - LIMITATION: The SDK's createRunStream doesn't support injecting a per-request userKey distinct from TamboProvider's userKey. Requires either a custom send path or server-side thread pre-creation.

  OPTION C — Most pragmatic approach (recommended):
  - Keep userToken for auth (no change)
  - Before starting any conversation, pre-create the thread via a server API route that calls Tambo's thread create endpoint with userKey set to "userId:teamId"
  - Use switchThread() / initThread() to load that pre-created thread
  - Filter thread list with useTamboThreadList({ userKey: "userId:teamId" })
  - This achieves true server-side isolation per team without touching auth

  KEY INSIGHT: The userKey field on thread list/create operations is independent of the TamboProvider auth userKey. The auth conflict is ONLY when userKey is passed as a TamboProvider prop. Passing userKey directly to useTamboThreadList() listOptions does NOT trigger auth conflicts.

verification:
files_changed: []
