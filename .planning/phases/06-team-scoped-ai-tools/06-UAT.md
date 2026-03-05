---
status: testing
phase: 06-team-scoped-ai-tools
source: [06-04-SUMMARY.md, 06-05-SUMMARY.md]
started: 2026-03-05T04:10:00Z
updated: 2026-03-05T04:10:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Thread Scoping per Team
expected: |
  When on a team, your AI threads are isolated to that team. If you switch to a different team (or personal workspace), the thread history changes — you see only threads created in that context. Creating a new thread tags it with the active team.
awaiting: user response

## Tests

### 1. Thread Scoping per Team
expected: When on a team, your AI threads are isolated to that team. If you switch to a different team (or personal workspace), the thread history changes — you see only threads created in that context. Creating a new thread tags it with the active team.
result: [pending]

### 2. AI Handles Missing Connections Gracefully
expected: If a team member hasn't connected their GitHub or Linear account, the AI still returns results for connected members and notes which members couldn't be queried (e.g. "GitHub not connected for [name]") — no blanket error, no crash.
result: [pending]

### 3. AI Team Scope Query (Regression)
expected: Ask the AI "show me everyone's PRs" or "what's the team working on?" and it returns data from all connected team members with attribution showing who each item belongs to.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0

## Gaps

[none yet]
