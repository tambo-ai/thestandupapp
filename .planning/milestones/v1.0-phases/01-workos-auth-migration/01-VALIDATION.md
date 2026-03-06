---
phase: 01
slug: workos-auth-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (no test framework in project) |
| **Config file** | None — Wave 0 note below |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green + manual auth flow test
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | manual | Manual: visit `/`, click sign in, complete WorkOS flow, verify redirect to `/app` | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-02 | manual | Manual: sign in, close tab, reopen, verify still authenticated at `/app` | N/A | ⬜ pending |
| 01-01-03 | 01 | 1 | AUTH-03 | manual | Manual: click logout in UserHeader, verify redirect to `/`, verify `/app` redirects to WorkOS login | N/A | ⬜ pending |
| 01-01-04 | 01 | 1 | AUTH-04 | manual | Manual: visit `/app` while unauthenticated, complete login, verify lands on `/app` | N/A | ⬜ pending |
| 01-01-05 | 01 | 1 | AUTH-05 | automated | `grep -r "better-auth\|betterAuth\|auth-client\|getSessionCookie" src/ --include="*.ts" --include="*.tsx" && echo "FAIL" \|\| echo "PASS"` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- No test framework is configured. CLAUDE.md confirms: "No test framework is currently configured."
- `npm run build` serves as the primary automated gate — catches type errors, missing imports, and module-not-found errors from incomplete Better Auth removal.
- No Wave 0 setup needed — existing `npm run build && npm run lint` covers the automated verification surface.

*Existing infrastructure covers automated verification needs for this phase.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sign in via WorkOS AuthKit | AUTH-01 | OAuth flow requires browser-based redirect to WorkOS hosted UI | Visit `/`, click sign in, complete OAuth, verify redirect to `/app` with user data |
| Session persists across refreshes | AUTH-02 | Cookie persistence requires real browser session | Sign in, close tab, reopen `/app`, verify still authenticated |
| Logout from any page | AUTH-03 | Requires clicking UI button and verifying redirect chain | Click logout in UserHeader, verify redirect to `/`, then visit `/app` and verify redirect to WorkOS login |
| Post-login redirect to intended page | AUTH-04 | Requires browser redirect chain through OAuth flow | Visit `/app` while unauthenticated, complete login, verify landing on `/app` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
