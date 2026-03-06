---
status: complete
phase: 03-workos-pipes-connections
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md]
started: 2026-03-04T08:00:00Z
updated: 2026-03-04T08:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. GitHub OAuth Connect
expected: Open the connections modal (gear icon in header). The Pipes widget shows GitHub as a connection option. Clicking connect initiates GitHub OAuth flow. After authorizing, the widget shows GitHub as connected.
result: pass

### 2. Linear OAuth Connect
expected: Same flow for Linear — Pipes widget shows Linear as a connection option. Clicking connect initiates Linear OAuth. After authorizing, widget shows Linear as connected.
result: pass

### 3. Status Dots Update After Connecting
expected: After connecting an account via the modal and closing it, the status dots in the header update from gray to green within ~10 seconds (polling with backoff). No page reload needed.
result: pass

### 4. Onboarding Prompt Disappears After Connecting
expected: When logged in with zero connected accounts, a "Connect accounts" prompt is visible. After connecting at least one account and closing the modal, the prompt disappears (once polling detects the new connection).
result: pass

### 5. Pipes Widget Disconnect Menu
expected: In the connections modal, a connected provider shows a three-dot menu. Clicking the three dots opens a dropdown menu (not clipped/hidden). The dropdown contains a disconnect option that works.
result: pass

### 6. Old Settings Modal Removed
expected: No settings modal with manual token entry fields exists. No references to "API key" or "token" entry in the UI. The gear icon opens the connections modal instead.
result: pass

### 7. GitHub API Works with Pipes Tokens
expected: With GitHub connected, features that use GitHub data (PRs, repos) return real data. No "missing token" or "not connected" errors.
result: pass

### 8. Linear API Works with Pipes Tokens
expected: With Linear connected, features that use Linear data (issues, teams) return real data. No "not connected" or authentication errors. No "Failed to load team" errors.
result: pass

### 9. No Client-Side Token Storage
expected: Open browser DevTools > Application > Local Storage. No OAuth tokens, encrypted keys, or token-related entries exist. All token management is server-side only.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
