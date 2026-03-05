---
status: resolved
trigger: "Investigate why team-scope PR queries return 'GitHub returned Unauthorized' instead of partial results"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: confirmed - the error is structurally caught by Promise.allSettled but the tool's outputSchema rejects the errors-only response, causing the AI to surface the raw error text
test: full static trace of the call path completed
expecting: fix requires outputSchema adjustments and/or AI prompt guidance to handle partial errors
next_action: return diagnosis

## Symptoms

expected: team-scope PR query returns partial results for members with GitHub connected, with an errors array for members without GitHub
actual: the whole query surfaces "GitHub returned Unauthorized" instead of partial results
errors: "GitHub returned Unauthorized" shown to user
reproduction: query PRs with scope=team when at least one member has not connected GitHub
started: always (by design flaw, not regression)

## Eliminated

- hypothesis: apiFetchForMembers throws when any member fails
  evidence: Promise.allSettled is used correctly - it never throws and always resolves; rejected promises are caught and put into the errors array
  timestamp: 2026-03-04

- hypothesis: the API route throws instead of returning JSON
  evidence: withGitHubTokenForUser always returns NextResponse.json for the 401 case - never throws
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: src/lib/tambo.ts apiFetchForMembers (lines 34-71)
  found: uses Promise.allSettled correctly; each per-member fetch is inside an async lambda; non-ok responses throw an Error so allSettled catches them as "rejected"; error message is extracted from json.error or HTTP status
  implication: apiFetchForMembers itself is structurally correct - partial results DO work at the JS level

- timestamp: 2026-03-04
  checked: src/lib/github-client.ts withGitHubTokenForUser (lines 39-91)
  found: when result.active is false (user has not connected GitHub), returns NextResponse.json({ error: "GitHub not connected", code: ..., forUserId: ... }, { status: 401 })
  implication: the API route returns a WELL-FORMED JSON response with status 401 - it does not throw or crash

- timestamp: 2026-03-04
  checked: src/lib/tambo.ts apiFetchForMembers lines 45-48
  found: |
    const res = await fetch(memberUrl);
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
  implication: when the 401 comes back, json.error = "GitHub not connected", so throw new Error("GitHub not connected") fires, allSettled catches it as rejected, and it ends up in the errors array with error: "GitHub not connected"

- timestamp: 2026-03-04
  checked: getPullRequests tool outputSchema (lines 365-387)
  found: outputSchema requires every pullRequest object to have number, title, state, url, repo, labels, createdAt, updatedAt, mergedAt, author, authorAvatar - all non-optional
  implication: if ALL members fail (all-errors case), pullRequests: [] with errors populated is a valid response structurally. This is fine.

- timestamp: 2026-03-04
  checked: getPullRequests tool description (line 308-309)
  found: description says "The team_roster context helper tells you which members have GitHub connected — only pass those as memberIds"
  implication: the AI is INSTRUCTED to filter to only connected members before calling. If the AI passes an unconnected member anyway, errors flow correctly to the errors array. The real question is what the AI does with an errors array in the response.

- timestamp: 2026-03-04
  checked: getPullRequests tool outputSchema errors field (lines 381-386)
  found: errors is z.array(...).optional() - so it's optional in the schema
  implication: Tambo receives { pullRequests: [...], errors: [{memberId, memberName, error: "GitHub not connected"}] } as the tool result. The AI then interprets this and decides what to tell the user.

- timestamp: 2026-03-04
  checked: team_roster context reference in tool description
  found: the scopeSchema description says "only include members with the relevant connection" - but there is no enforcement. The AI could pass unconnected members.
  implication: if the AI passes a member without GitHub connected, the error propagates to the errors array but the pullRequests array may still have results for other members. The AI must be surfacing the errors array text ("GitHub not connected") as "GitHub returned Unauthorized" - suggesting the AI is treating any non-empty errors array as a failure.

## Resolution

root_cause: |
  The flow works structurally - Promise.allSettled does catch per-member failures, and the API route correctly returns { error: "GitHub not connected" } with status 401 rather than throwing. The error message ends up in the errors array as "GitHub not connected".

  The actual failure mode is one of two things (both potentially true simultaneously):

  CAUSE A - AI over-interprets errors array:
  The AI model receives { pullRequests: [valid data], errors: [{ error: "GitHub not connected" }] } and decides to surface the error to the user as "GitHub returned Unauthorized" instead of presenting the partial results. The tool output schema and description do not tell the AI how to handle partial errors gracefully.

  CAUSE B - AI passes unconnected members despite instructions:
  The tool description says "only pass members with GitHub connected" but team_roster context may not clearly distinguish which members have GitHub vs Linear connected. The AI may pass ALL team members regardless of GitHub connection status, causing some to 401. If the AI then sees ANY errors in the response, it escalates to a user-visible error.

  There is a secondary structural concern: the error message "GitHub not connected" (from the API) gets relabeled "GitHub returned Unauthorized" somewhere - this wording is not present anywhere in the codebase, suggesting the AI is paraphrasing the 401 status code into natural language rather than reading json.error.

fix: |
  THREE recommended changes:

  1. TOOL DESCRIPTION - add explicit AI instruction on how to handle partial errors:
     In getPullRequests description, add: "If the response includes an errors array alongside pullRequests results, show the successful results and mention which members had errors — do not treat partial errors as a full failure."

  2. TOOL OUTPUT SCHEMA - make the AI aware errors are expected/normal:
     Annotate the errors field description: "Per-member errors (e.g. GitHub not connected). Presence of errors does not mean the tool call failed — show results for successful members."

  3. OPTIONAL - surface the error message text more prominently:
     In apiFetchForMembers the error thrown is json.error || `HTTP ${res.status}`. Since json.error = "GitHub not connected", the errors array already has the right message. No change needed here.

  4. OPTIONAL - add a warning in the tool output when errors are present but results exist:
     The getPullRequests tool could add a top-level partialFailure: boolean field to make it unambiguous to the AI that this is partial, not total, failure.

verification: static trace complete - no runtime test performed (read-only investigation)
files_changed: []
