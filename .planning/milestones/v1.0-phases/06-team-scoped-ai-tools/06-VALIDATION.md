---
phase: 6
slug: team-scoped-ai-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (manual testing per CLAUDE.md) |
| **Config file** | none — see Wave 0 |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green + manual verification of all 6 requirements
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | AI-01 | manual | Verify system prompt built from server data | N/A | ⬜ pending |
| 06-01-02 | 01 | 1 | AI-02 | manual | Call API route with forUserId, verify response | N/A | ⬜ pending |
| 06-02-01 | 02 | 1 | AI-03 | manual | Ask "what is the team working on?" in chat | N/A | ⬜ pending |
| 06-02-02 | 02 | 1 | AI-04 | manual | Verify cross-team results show member names | N/A | ⬜ pending |
| 06-03-01 | 03 | 2 | AI-05 | manual | Verify write API routes reject forUserId | N/A | ⬜ pending |
| 06-03-02 | 03 | 2 | AI-06 | manual | Switch teams, verify different thread history | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.
- Type checking via `npm run build` catches structural errors.
- No test framework installation needed (manual testing is the established pattern).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| System prompt reflects server-side team data | AI-01 | UI/runtime behavior, no test framework | Check browser dev tools for system prompt contents |
| Cross-member token lookup via Pipes | AI-02 | Requires live WorkOS Pipes connection | Call API with forUserId param, verify GitHub/Linear data returned |
| Team-wide query aggregation | AI-03 | End-to-end AI + multi-account flow | Ask "what is the team working on?" and verify synthesized answer |
| Attribution in cross-team results | AI-04 | Visual UI verification | Check that each result shows the team member it belongs to |
| Write ops restricted to requesting user | AI-05 | Security boundary — requires manual audit | Verify write API routes reject forUserId, check network tab |
| Per-user thread isolation | AI-06 | Multi-user session behavior | Log in as different users, verify separate thread histories |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
