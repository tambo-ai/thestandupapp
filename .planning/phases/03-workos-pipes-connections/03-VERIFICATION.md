---
phase: 03-workos-pipes-connections
verified: 2026-03-04T08:00:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 11/11
  gaps_closed:
    - "Status dots update from gray to green after connecting without page reload (polling with backoff now in place)"
    - "Onboarding prompt disappears after connecting at least one account (driven by polled status update)"
    - "Three-dot disconnect menu in Pipes widget is clickable (CSS overflow: visible override applied)"
    - "getAccessToken returns active tokens for org-scoped users (organizationId now passed to all 4 call sites)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Connect GitHub account via Pipes widget"
    expected: "Modal opens, WorkOS Pipes widget displays GitHub as a provider, clicking 'Connect' initiates OAuth, returns to app with green dot within ~10 seconds of closing modal"
    why_human: "OAuth flow requires a real browser and live WorkOS configuration — cannot verify programmatically"
  - test: "Connect Linear account via Pipes widget"
    expected: "Modal shows Linear as a provider, OAuth completes, app shows green dot for Linear within ~10 seconds of closing modal"
    why_human: "OAuth flow requires live WorkOS Pipes configuration and user interaction"
  - test: "Connection status dots update after connecting"
    expected: "Dots refresh to green within 10 seconds after closing the connections modal; ConnectionPrompt disappears once at least one account is connected"
    why_human: "Requires live API call to /api/connections/status responding with 'connected' status after WorkOS backend propagates state"
  - test: "Disconnect an account via Pipes widget three-dot menu"
    expected: "Three-dot menu next to connected provider is clickable and shows options (no longer clipped); disconnect option functions as expected"
    why_human: "CSS fix verified in code; actual dropdown behavior controlled by WorkOS Pipes widget — needs browser verification"
  - test: "Reauthorize broken connection (needs_reauthorization)"
    expected: "Amber dot visible; opening modal shows reauth option; completing flow turns dot green"
    why_human: "Requires a WorkOS connection in needs_reauthorization state to test"
  - test: "Disconnect UX deviation review"
    expected: "User to verify: does the Pipes widget provide inline 'Are you sure? [Yes] [Cancel]' within the card, or does it disconnect immediately / use a separate dialog?"
    why_human: "Plan 03-02 flagged this as a locked decision deviation — widget behavior is externally controlled and could not be customized. Needs user sign-off on actual widget behavior."
  - test: "New user with no connections sees onboarding prompt"
    expected: "ConnectionPrompt ('Connect your GitHub and Linear accounts to get started') visible above chat area; clicking 'Connect accounts' opens modal"
    why_human: "Requires a user session where both GitHub and Linear return non-connected status"
  - test: "AI responds helpfully when connections are missing"
    expected: "When user sends a query with no connections, API routes return 401 and AI responds conversationally explaining they need to connect accounts"
    why_human: "Requires live AI inference and a session with no Pipes connections"
---

# Phase 3: WorkOS Pipes Connections Verification Report

**Phase Goal:** Replace client-side encrypted token storage with WorkOS Pipes connections for GitHub and Linear integrations
**Verified:** 2026-03-04
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 03-04)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | API routes retrieve GitHub tokens from WorkOS Pipes server-side instead of request headers | VERIFIED | `withGitHubToken` in `src/lib/github-client.ts` calls `getWorkOS().pipes.getAccessToken({ provider: "github", userId: user.id, ...organizationId })` — no `request.headers.get()` for tokens anywhere |
| 2 | API routes retrieve Linear tokens from WorkOS Pipes server-side instead of request headers | VERIFIED | `withLinearClient` in `src/lib/linear-client.ts` calls `getWorkOS().pipes.getAccessToken({ provider: "linear", userId: user.id, ...organizationId })` — `linearClientFromRequest` removed entirely |
| 3 | A connection status endpoint returns each provider's status without exposing tokens | VERIFIED | `GET /api/connections/status` returns `{ github: "connected"\|error_string, linear: "connected"\|error_string }` — no token values in response |
| 4 | Server component passes connection status to AppShell on initial load | VERIFIED | `src/app/app/page.tsx` calls `workos.pipes.getAccessToken` for both providers with organizationId and passes `connectionStatus` prop to `<AppShell>` |
| 5 | User can connect GitHub via Pipes widget embedded in the connections modal | VERIFIED (automated) / NEEDS HUMAN (e2e) | `connections-modal.tsx` renders `<WorkOsWidgets><Pipes authToken={getAccessToken} /></WorkOsWidgets>` — live OAuth flow needs human |
| 6 | User can connect Linear via Pipes widget embedded in the connections modal | VERIFIED (automated) / NEEDS HUMAN (e2e) | Same Pipes widget serves all configured providers |
| 7 | User can see connection status via colored dots in the header (green/gray/amber) | VERIFIED | `user-header.tsx` renders two `<button>` dots with `dotColor()` helper: `'connected' -> #22C55E`, `'needs_reauthorization' -> #F59E0B`, else `#DDD` |
| 8 | User can reauthorize a broken connection by clicking Reconnect in the modal | VERIFIED (structure) / NEEDS HUMAN (e2e) | Pipes widget handles reauth natively — structure correct, live behavior needs human |
| 9 | User can disconnect an account via the three-dot menu in the Pipes widget | VERIFIED (CSS fix) / NEEDS HUMAN (e2e) | `.rt-Inset { overflow: visible !important }` override in `globals.css` removes clipping; actual widget menu behavior needs browser verification |
| 10 | New user with no connections sees an inline prompt directing them to connect | VERIFIED | `app-shell.tsx` renders `<ConnectionPrompt>` when `hasNoConnections` (both statuses !== 'connected'); prompt has "Connect accounts" button wired to `setModalOpen(true)` |
| 11 | user-tokens.ts and settings-modal.tsx are fully removed, no file imports them | VERIFIED | Both files deleted (confirmed `test ! -f`); zero grep matches for `user-tokens`, `settings-modal`, `getTokenHeaders`, `x-github-token`, `x-linear-api-key` anywhere in `src/` |

**Score:** 11/11 truths verified (8 fully automated, 3 need human confirmation for live e2e behavior)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/github-client.ts` | withGitHubToken using WorkOS Pipes with organizationId | VERIFIED | 64 lines; uses `withAuth` + `getWorkOS().pipes.getAccessToken` with conditional organizationId spread; exports `withGitHubToken`, `ghHeaders`, `resolveGitHubLogin`, `GITHUB_API` |
| `src/lib/linear-client.ts` | withLinearClient using WorkOS Pipes with organizationId | VERIFIED | 45 lines; uses `withAuth` + `getWorkOS().pipes.getAccessToken` with conditional organizationId spread; exports `withLinearClient`, `LinearClient` re-export |
| `src/app/api/connections/status/route.ts` | GET endpoint returning connection status, organizationId-aware | VERIFIED | 47 lines; `GET` export; `pipeOpts` helper with organizationId spread; Promise.all both providers with `.catch` fallback; returns `{ github, linear }` strings only |
| `src/components/connections-modal.tsx` | Connections modal with embedded Pipes widget | VERIFIED | 60 lines; `useAccessToken`, `WorkOsWidgets`, `Pipes`, `createPortal`; Escape key + click-outside-to-close |
| `src/components/connection-prompt.tsx` | Inline onboarding prompt | VERIFIED | 21 lines; renders prompt text + "Connect accounts" button |
| `src/components/user-header.tsx` | Updated header with status dots | VERIFIED | 95 lines; `dotColor()`, `dotLabel()`, two dot buttons, gear icon — all call `onOpenModal` |
| `src/app/app/app-shell.tsx` | Polling-based connection status refresh with retry after modal close | VERIFIED | `pollConnectionStatus` with 6-attempt backoff (500ms, 1s, 2s, 2s, 2s, 2s); `connStatusRef` for stable comparison; `pollAbortRef` with AbortController for cleanup; `handleModalClose` calls poll fire-and-forget |
| `src/app/globals.css` | CSS override for Radix Inset overflow clipping | VERIFIED | Line 87-89: `.rt-Inset { overflow: visible !important }` present after WorkOS widgets import |
| `src/app/app/page.tsx` | Server component with organizationId-aware connection status | VERIFIED | `pipeOpts` helper with conditional organizationId spread; passes `connectionStatus` to AppShell |
| `src/lib/tambo.ts` | apiFetch uses plain fetch | VERIFIED | `apiFetch` uses `fetch(url)` with no headers; no user-tokens import |
| `src/lib/user-tokens.ts` | DELETED | VERIFIED | File does not exist on disk |
| `src/components/settings-modal.tsx` | DELETED | VERIFIED | File does not exist on disk |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/github-client.ts` | `workos.pipes.getAccessToken` | `getWorkOS()` + `organizationId` from withAuth | WIRED | Line 41-45: `getWorkOS().pipes.getAccessToken({ provider: "github", userId: user.id, ...organizationId })` |
| `src/lib/linear-client.ts` | `workos.pipes.getAccessToken` | `getWorkOS()` + `organizationId` from withAuth | WIRED | Line 20-24: `getWorkOS().pipes.getAccessToken({ provider: "linear", userId: user.id, ...organizationId })` |
| `src/app/app/page.tsx` | `workos.pipes.getAccessToken` | Server-side connection status check with organizationId | WIRED | Lines 22-34: `pipeOpts` helper; Promise.all both providers; `connectionStatus` passed to AppShell line 54 |
| `src/app/api/connections/status/route.ts` | `workos.pipes.getAccessToken` | `pipeOpts` helper with organizationId | WIRED | Lines 8-12: `pipeOpts` captures `organizationId` from `withAuth`; used in both getAccessToken calls |
| `src/components/connections-modal.tsx` | `@workos-inc/widgets Pipes` | `useAccessToken` from authkit-nextjs/components | WIRED | Line 15: `const { getAccessToken } = useAccessToken()`; Line 50: `<Pipes authToken={getAccessToken as () => Promise<string>} />` |
| `src/app/app/app-shell.tsx` | `/api/connections/status` | polling fetch with retry on modal close | WIRED | `pollConnectionStatus` fetches `/api/connections/status` up to 6 times with backoff; `handleModalClose` calls `pollConnectionStatus()` fire-and-forget |
| `src/app/app/app-shell.tsx` | `src/components/connection-prompt.tsx` | Conditional render when no connections | WIRED | Line 207-209: `{hasNoConnections && <ConnectionPrompt onOpenModal={() => setModalOpen(true)} />}` |
| All 7 API routes | `withGitHubToken` / `withLinearClient` | Wrapper signatures unchanged | WIRED | All 7 routes (2 GitHub + 5 Linear) confirmed using wrappers via grep |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CONN-01 | 03-02, 03-04 | User can connect GitHub via WorkOS Pipes widget | VERIFIED (structure) / NEEDS HUMAN (e2e) | `ConnectionsModal` renders `<Pipes>` widget; live OAuth needs human |
| CONN-02 | 03-02, 03-04 | User can connect Linear via WorkOS Pipes widget | VERIFIED (structure) / NEEDS HUMAN (e2e) | Same Pipes widget serves all configured providers |
| CONN-03 | 03-02, 03-04 | User can see connection status (connected/disconnected/needs reauth) | VERIFIED | Status dots with three color states in `user-header.tsx`; polling ensures state refreshes after modal close |
| CONN-04 | 03-02 | User can reauthorize a broken connection | VERIFIED (structure) / NEEDS HUMAN (e2e) | Pipes widget handles reauth natively when status is `needs_reauthorization` |
| CONN-05 | 03-02, 03-04 | User can disconnect an account | VERIFIED (CSS fix) / NEEDS HUMAN (e2e) | Three-dot menu no longer clipped by `.rt-Inset` overflow fix; actual UX via Pipes widget needs browser verification; plan 03-02 flagged inline-confirmation deviation — awaiting user sign-off |
| CONN-06 | 03-02 | New user sees prompt to connect accounts on first use | VERIFIED | `hasNoConnections` guard in AppShell renders `ConnectionPrompt`; auto-disappears when poll detects status change after connecting |
| CONN-07 | 03-01 | Tokens managed server-side via WorkOS Pipes (never in localStorage) | VERIFIED | `withGitHubToken` and `withLinearClient` use Pipes; zero localStorage references in any auth/token path |
| CONN-08 | 03-03 | Client-side encrypted token storage (user-tokens.ts) fully removed | VERIFIED | `user-tokens.ts` deleted; zero grep matches for `user-tokens`, `getTokenHeaders` anywhere in `src/` |

All 8 CONN requirements claimed by phase 3 are accounted for. All marked as `[x]` complete in REQUIREMENTS.md. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/connections-modal.tsx` | 50 | `getAccessToken as () => Promise<string>` type assertion | Info | Documented in SUMMARY as a blocking fix for type mismatch between authkit-nextjs return type (`Promise<string \| undefined>`) and Pipes `authToken` prop (`Promise<string>`). Acceptable workaround given third-party type constraint. |
| `src/components/mcp-config-modal.tsx` | multiple | `localStorage` usage | Info | Unrelated to phase 3 — this is the Tambo MCP config component (pre-existing Tambo template code). Not a phase 3 concern. |

No blockers or warnings found. Diagnostic logging added in task 2 commit (cc6cbb5) was cleaned up in the organizationId fix commit (d6cfe64) — zero `console.log` calls remain in the three token-related files.

### Human Verification Required

#### 1. Connect GitHub Account (CONN-01)

**Test:** Sign in as a new user, open the connections modal via gear icon or status dot, connect GitHub account through Pipes widget OAuth flow
**Expected:** Modal displays GitHub provider card, OAuth flow completes, modal closes with green dot for GitHub visible in header within ~10 seconds (polling detects the change), ConnectionPrompt disappears if no other connections needed
**Why human:** OAuth flow requires live browser, real WorkOS Pipes configuration, and GitHub OAuth app setup

#### 2. Connect Linear Account (CONN-02)

**Test:** Open connections modal, connect Linear account through Pipes widget OAuth flow
**Expected:** Linear provider card shown, OAuth completes, green dot appears for Linear within ~10 seconds, ConnectionPrompt disappears if both now connected
**Why human:** OAuth flow requires live WorkOS Pipes configuration and Linear OAuth app setup

#### 3. Connection Status Dots Refresh (CONN-03 dynamic behavior)

**Test:** Connect an account, close the modal, observe header dots
**Expected:** Within ~10 seconds, the relevant dot turns green; ConnectionPrompt auto-disappears when at least one account becomes connected. Polling retries up to 6 times (500ms + 1s + 2s + 2s + 2s + 2s) and stops early once a status change is detected.
**Why human:** Requires live `/api/connections/status` returning `"connected"` — depends on WorkOS Pipes having a real active connection. The polling fix (plan 03-04, commit 71c722b) and organizationId fix (commit d6cfe64) address the two known root causes from UAT.

#### 4. Disconnect Account — Three-Dot Menu (CONN-05 partial)

**Test:** Connect an account, open modal, click the three-dot menu next to the connected provider
**Expected:** Dropdown menu appears (no longer clipped). Options should include disconnect.
**Why human:** CSS override (`.rt-Inset { overflow: visible !important }`) verified in code. Actual dropdown render behavior controlled by WorkOS Pipes widget — needs live browser verification.

#### 5. Disconnect UX Deviation Review (CONN-05)

**Test:** Connect an account, open modal, attempt to disconnect
**Expected per user's locked decision:** Disconnect shows inline confirmation within the card ("Are you sure? [Yes] [Cancel]" replaces the Disconnect button)
**Actual behavior unknown:** WorkOS Pipes widget controls disconnect UX. Plan 03-02 SUMMARY flagged this as a locked-decision deviation — the widget may disconnect immediately or use a native dialog instead of inline card confirmation.
**Why human:** Must verify actual widget disconnect behavior and obtain user sign-off if it deviates from the locked decision.

#### 6. Reauthorize Broken Connection (CONN-04)

**Test:** Put a connection into `needs_reauthorization` state (or simulate), open modal, reauthorize
**Expected:** Amber dot visible in header; Pipes widget shows reauth option; completing flow turns dot green within ~10 seconds (polling detects change)
**Why human:** Requires a WorkOS connection in a broken/expired state

#### 7. New User Onboarding Prompt (CONN-06)

**Test:** Sign in as a user with no GitHub or Linear connections; observe the chat panel
**Expected:** "Connect your GitHub and Linear accounts to get started" prompt visible above chat input, with "Connect accounts" button that opens the modal
**Why human:** Requires a fresh user session where WorkOS Pipes returns no active connections for either provider

#### 8. AI Behavior With No Connections

**Test:** As a user with no connections, send a query like "what's the team working on?"
**Expected:** AI responds conversationally explaining they need to connect accounts (not a raw error)
**Why human:** Requires live AI inference and the 401 error path through the API wrapper to be handled gracefully by the AI system prompt

### Re-Verification: Gap Closure Summary

**Previous status (2026-03-03):** human_needed (11/11 automated truths verified, 8 items flagged for human e2e verification)

The UAT run on 2026-03-04 found 5 failures. Plan 03-04 was created and executed to close them. Three root causes were addressed:

**1. Stale connection status after modal close (UAT tests 3, 4, 6)**
- Root cause: `refreshConnectionStatus()` fired immediately on modal close; WorkOS backend hadn't propagated state yet
- Fix: `pollConnectionStatus()` in `app-shell.tsx` — retries up to 6 times with exponential-then-plateau backoff (500ms, 1s, 2s, 2s, 2s, 2s). Stops early when a status change is detected. Uses `connStatusRef` for stable comparison without re-creating the callback.
- Commits: 71c722b

**2. Three-dot disconnect menu clipped by Radix Inset (UAT test 7)**
- Root cause: Radix Themes `.rt-Inset` sets `overflow: hidden` globally, clipping the DropdownMenu.Content rendered inside WorkOS Pipes card list items
- Fix: CSS override `.rt-Inset { overflow: visible !important }` in `globals.css` after the WorkOS widgets stylesheet import
- Commits: 71c722b

**3. getAccessToken returning `{ active: false, error: 'not_installed' }` for org users (UAT test 10)**
- Root cause: WorkOS Pipes `getAccessToken` requires `organizationId` when the user belongs to a WorkOS Organization. Without it, the API returns `not_installed` even after successful OAuth connection.
- Fix: All four `getAccessToken` call sites now extract `organizationId` from `withAuth()` and spread it conditionally: `...(organizationId ? { organizationId } : {})`
  - `src/app/api/connections/status/route.ts` — `pipeOpts` helper pattern
  - `src/app/app/page.tsx` — `pipeOpts` helper pattern
  - `src/lib/github-client.ts` — inline spread
  - `src/lib/linear-client.ts` — inline spread
- Commits: d6cfe64
- User confirmed both GitHub and Linear return `active: true` with valid access tokens after this fix

Diagnostic logging added in commit cc6cbb5 was cleaned up in the same PR cycle (d6cfe64). Zero `console.log` calls remain in the three affected files.

### Gaps Summary

No blocking gaps identified. All automated verifications pass:

- `npm run build` exits cleanly with zero TypeScript errors (`✓ Compiled successfully`)
- Zero references to `user-tokens`, `settings-modal`, `getTokenHeaders`, `x-github-token`, `x-linear-api-key` in `src/`
- All 7 API routes (2 GitHub + 5 Linear) confirmed using `withGitHubToken`/`withLinearClient` wrappers
- `organizationId` confirmed in all 4 `getAccessToken` call sites
- `pollConnectionStatus` with backoff confirmed wired in `app-shell.tsx`
- CSS overflow fix confirmed in `globals.css`
- All 3 task commits (71c722b, cc6cbb5, d6cfe64) confirmed in git history
- All 8 CONN requirements confirmed `[x]` complete in REQUIREMENTS.md

The only remaining items are human e2e tests requiring a live browser and WorkOS configuration. The previous human_needed items for tests 3, 4, 6 (status dot refresh) and test 7 (three-dot menu) now have code-level fixes in place — those human tests are now about confirming the fixes work in a live environment, not identifying missing code.

CONN-05 disconnect UX deviation (locked-decision issue from plan 03-02) remains open for user sign-off on the actual Pipes widget behavior.

---

_Verified: 2026-03-04_
_Verifier: Claude (gsd-verifier)_
