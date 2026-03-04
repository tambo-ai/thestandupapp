---
status: diagnosed
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
  root_cause: "refreshConnectionStatus() fires immediately on modal close without delay/retry; WorkOS backend may not have propagated the connection yet, returning stale state"
  artifacts:
    - path: "src/app/app/app-shell.tsx"
      issue: "refreshConnectionStatus() called immediately in handleModalClose() with no delay or retry"
    - path: "src/components/connections-modal.tsx"
      issue: "Pipes widget has no callback to signal connection completion"
    - path: "src/app/api/connections/status/route.ts"
      issue: "Returns stale state if called too quickly after OAuth"
  missing:
    - "Add delay (500-1000ms) before refreshConnectionStatus() call"
    - "Add retry logic with exponential backoff (3-4 attempts)"
    - "Consider polling after modal close to catch delayed state changes"

- truth: "Disconnect option in Pipes widget works when clicking three-dot menu"
  status: failed
  reason: "User reported: there are three dots beside the connected thing, but clicking on them does nothing"
  severity: major
  test: 7
  root_cause: "Radix UI Inset component applies overflow:hidden globally, clipping the DropdownMenu.Content inside WorkOS Pipes CardList.Item"
  artifacts:
    - path: "node_modules/@workos-inc/widgets/dist/esm/lib/card-list.js"
      issue: "Wraps items in Inset with clip='padding-box' causing overflow clipping"
    - path: "node_modules/@radix-ui/themes/src/components/inset.css"
      issue: ".rt-Inset { overflow: hidden } clips dropdown menus"
  missing:
    - "Add CSS override: .woswidgets-card-list, .woswidgets-card-list-item { overflow: visible !important }"
    - "Check if newer @workos-inc/widgets version fixes this"

- truth: "Status dots update from gray to green after connecting without page reload"
  status: failed
  reason: "User reported: it stays in the same gray color"
  severity: major
  test: 4
  root_cause: "Same as test 3 — refreshConnectionStatus() race condition on modal close returns stale WorkOS state"
  artifacts:
    - path: "src/app/app/app-shell.tsx"
      issue: "handleModalClose() refresh fires before WorkOS backend sync completes"
  missing:
    - "Same fix as test 3 — delay + retry on refreshConnectionStatus()"

- truth: "Onboarding prompt disappears after connecting at least one account"
  status: failed
  reason: "User reported: the onboarding prompt is still there"
  severity: major
  test: 6
  root_cause: "ConnectionPrompt visibility depends on connStatus state which isn't updated due to same refresh race condition as tests 3/4"
  artifacts:
    - path: "src/components/connection-prompt.tsx"
      issue: "Renders based on hasNoConnections prop which stays true because connStatus state is stale"
    - path: "src/app/app/app-shell.tsx"
      issue: "connStatus state not updated due to refresh race condition"
  missing:
    - "Same fix as tests 3/4 — delay + retry ensures connStatus updates, which hides the prompt"

- truth: "API routes use Pipes tokens so GitHub/Linear features return real data without authentication errors"
  status: failed
  reason: "User reported: Linear says 'not connected', GitHub PRs prompt for manual org/repo, 'Connect your accounts' prompt still showing, 'Failed to load team: Linear not connected' error"
  severity: blocker
  test: 10
  root_cause: "getWorkOS().pipes.getAccessToken() returns { active: false } — either WorkOS backend hasn't persisted the Pipes connection, or Pipes widget OAuth flow completes visually but doesn't finalize server-side"
  artifacts:
    - path: "src/lib/github-client.ts"
      issue: "withGitHubToken() calls getAccessToken({provider:'github'}) which returns !active"
    - path: "src/lib/linear-client.ts"
      issue: "withLinearClient() calls getAccessToken({provider:'linear'}) which returns !active"
    - path: "src/app/api/connections/status/route.ts"
      issue: "Status check returns not-connected because getAccessToken() returns inactive"
  missing:
    - "Verify WorkOS Pipes dashboard has GitHub and Linear OAuth apps properly registered"
    - "Log full getAccessToken() result to understand exact error code"
    - "Validate Pipes widget is completing the full OAuth flow (not just showing visual success)"
    - "Add error boundary with detailed logging on connection check failures"
