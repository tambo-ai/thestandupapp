---
status: complete
phase: 06-team-scoped-ai-tools
source: [06-04-SUMMARY.md, 06-05-SUMMARY.md]
started: 2026-03-05T04:10:00Z
updated: 2026-03-05T04:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Thread Creation and Listing
expected: Creating new threads and listing existing threads works without errors. Thread isolation by team deferred (Tambo SDK limitation — cannot use both userKey and userToken on TamboProvider).
result: pass

### 2. AI Handles Missing Connections Gracefully
expected: If a team member hasn't connected their GitHub or Linear account, the AI still returns results for connected members and notes which members couldn't be queried (e.g. "GitHub not connected for [name]") — no blanket error, no crash.
result: pass

### 3. AI Team Scope Query (Regression)
expected: Ask the AI "show me everyone's PRs" or "what's the team working on?" and it returns data from all connected team members with attribution showing who each item belongs to.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Threads are isolated per team — switching teams shows different thread history"
  status: deferred
  reason: "Tambo SDK cannot accept both userKey and userToken on TamboProvider simultaneously. Server-side thread creation also hit auth issues. Deferred until SDK supports dual auth."
  severity: minor
