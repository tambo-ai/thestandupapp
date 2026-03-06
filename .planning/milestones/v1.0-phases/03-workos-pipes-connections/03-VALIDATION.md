---
phase: 3
slug: workos-pipes-connections
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (manual testing via dev server per CLAUDE.md) |
| **Config file** | none — no test framework |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | CONN-01,02 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | CONN-01 | manual | Dev server: click Connect GitHub in modal | N/A | ⬜ pending |
| 3-01-03 | 01 | 1 | CONN-02 | manual | Dev server: click Connect Linear in modal | N/A | ⬜ pending |
| 3-01-04 | 01 | 1 | CONN-03 | manual | Dev server: check status indicators in modal | N/A | ⬜ pending |
| 3-01-05 | 01 | 1 | CONN-04 | manual | Dev server: revoke token, check reauth flow | N/A | ⬜ pending |
| 3-01-06 | 01 | 1 | CONN-05 | manual | Dev server: click Disconnect, confirm removal | N/A | ⬜ pending |
| 3-01-07 | 01 | 2 | CONN-06 | manual | Dev server: new user sees connect prompt | N/A | ⬜ pending |
| 3-01-08 | 01 | 2 | CONN-07 | build | `npm run build` (no token imports in client) | N/A | ⬜ pending |
| 3-01-09 | 01 | 2 | CONN-08 | build | `npm run build` (file deleted, no broken imports) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `@workos-inc/widgets @radix-ui/themes @tanstack/react-query`
- [ ] Add CSS imports for Radix Themes and WorkOS Widgets
- [ ] Configure GitHub and Linear as Pipes providers in WorkOS Dashboard
- [ ] Add app origin to WorkOS CORS allowed origins (if not already done)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Connect GitHub via Pipes widget | CONN-01 | Requires live OAuth flow with WorkOS | Open modal, click Connect GitHub, complete OAuth, verify connected status |
| Connect Linear via Pipes widget | CONN-02 | Requires live OAuth flow with WorkOS | Open modal, click Connect Linear, complete OAuth, verify connected status |
| See connection status | CONN-03 | Requires visual inspection of UI state | Check header status dots and modal card indicators for each state |
| Reauthorize broken connection | CONN-04 | Requires revoking token at provider level | Revoke token in GitHub/Linear settings, check app shows reauth, click Reconnect |
| Disconnect an account | CONN-05 | Requires full widget interaction | Click Disconnect in modal, confirm dialog, verify disconnected state |
| New user sees connect prompt | CONN-06 | Requires visual inspection of empty state | Log in as new user with no connections, verify prompt + button appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
