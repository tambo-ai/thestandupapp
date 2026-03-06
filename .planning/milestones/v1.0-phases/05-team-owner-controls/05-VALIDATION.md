---
phase: 5
slug: team-owner-controls
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (manual testing per CLAUDE.md) |
| **Config file** | none |
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
| 05-01-01 | 01 | 1 | TEAM-06 | build + manual | `npm run build` | N/A | ⬜ pending |
| 05-01-02 | 01 | 1 | TEAM-07 | build + manual | `npm run build` | N/A | ⬜ pending |
| 05-02-01 | 02 | 1 | TEAM-08 | build + manual | `npm run build` | N/A | ⬜ pending |
| 05-02-02 | 02 | 1 | TEAM-09 | build + manual | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework configured per project guidelines — manual testing via development server is the established approach.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| User leaves team, removed from list | TEAM-06 | No test framework | Sign in as member, leave team, verify redirect and membership removed |
| Owner removes non-owner member | TEAM-07 | No test framework | Sign in as owner, remove member, verify removal |
| Owner views pending invitations | TEAM-08 | No test framework | Send invite, check Members tab shows pending row |
| Owner resends/revokes invitation | TEAM-09 | No test framework | Resend invite (check email), revoke invite (verify link invalid) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
