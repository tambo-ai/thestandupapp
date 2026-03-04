---
status: complete
phase: 03-workos-pipes-connections
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-04T05:30:00Z
updated: 2026-03-04T06:15:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. GitHub OAuth Connect
expected: Open the connections modal (gear icon or onboarding prompt). The Pipes widget shows GitHub as a connection option. Clicking connect initiates GitHub OAuth flow. After authorizing, the widget shows GitHub as connected.
result: pass

### 2. Linear OAuth Connect
expected: Same flow for Linear — Pipes widget shows Linear connection option. Clicking connect initiates Linear OAuth. After authorizing, widget shows Linear as connected.
result: pass

### 3. Status Dots Show Correct State
expected: In the user header area, two small colored dots are visible. Green dot = connected, gray dot = not connected, amber dot = needs reauthorization. Hovering shows a tooltip label identifying which service each dot represents.
result: issue
reported: "it does not show any colors, the state does not show even after i connect to github and linear, its the same as if its still not connected, and also the connect your accounts stuff is still there"
severity: major

### 4. Status Dots Update After Connecting
expected: After connecting an account via the modal, closing the modal causes the corresponding status dot to change from gray to green without a page reload.
result: issue
reported: "it stays in the same gray color"
severity: major

### 5. First-Use Onboarding Prompt
expected: When logged in with zero connected accounts, a prominent "Connect accounts" prompt is visible in the main app area. It invites the user to connect GitHub and/or Linear.
result: pass

### 6. Onboarding Prompt Disappears After Connecting
expected: After connecting at least one account and closing the modal, the onboarding prompt is no longer visible — the main app content shows instead.
result: issue
reported: "the onboarding prompt is still there"
severity: major

### 7. Disconnect via Pipes Widget
expected: In the connections modal, an already-connected provider shows a disconnect option. Clicking it removes the connection. Note: the Pipes widget controls this UX natively — verify if it provides inline confirmation or disconnects immediately.
result: issue
reported: "there are three dots beside the connected thing, but clicking on them does nothing"
severity: major

### 8. Reauthorize Broken Connection
expected: If a connection token has expired or been revoked, the status dot shows amber. Clicking the gear icon and opening the modal shows the provider needing reauthorization. Completing reauth restores the green dot.
result: skipped
reason: Cannot disconnect/revoke to test reauth flow

### 9. Old Settings Modal Removed
expected: There is no longer a settings modal with manual token entry fields. The old gear icon behavior (if any) now opens the connections modal instead. No references to "API key" or "token" entry fields in the UI.
result: pass

### 10. API Routes Work with Pipes Tokens
expected: With accounts connected, features that rely on GitHub or Linear data (standup generation, Linear issues, GitHub PRs) return real data. No "missing token" or authentication errors in the response.
result: issue
reported: "Linear says 'not connected', GitHub PRs prompt for manual org/repo, 'Connect your accounts' prompt still showing, 'Failed to load team: Linear not connected' error"
severity: blocker

## Summary

total: 10
passed: 4
issues: 5
pending: 0
skipped: 1

## Gaps

- truth: "Status dots show correct colors (green=connected, gray=not connected, amber=reauth needed) and update after connecting"
  status: failed
  reason: "User reported: it does not show any colors, the state does not show even after i connect to github and linear, its the same as if its still not connected, and also the connect your accounts stuff is still there"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Disconnect option in Pipes widget works when clicking three-dot menu"
  status: failed
  reason: "User reported: there are three dots beside the connected thing, but clicking on them does nothing"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Status dots update from gray to green after connecting without page reload"
  status: failed
  reason: "User reported: it stays in the same gray color"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Onboarding prompt disappears after connecting at least one account"
  status: failed
  reason: "User reported: the onboarding prompt is still there"
  severity: major
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "API routes use Pipes tokens so GitHub/Linear features return real data without authentication errors"
  status: failed
  reason: "User reported: Linear says 'not connected', GitHub PRs prompt for manual org/repo, 'Connect your accounts' prompt still showing, 'Failed to load team: Linear not connected' error"
  severity: blocker
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
