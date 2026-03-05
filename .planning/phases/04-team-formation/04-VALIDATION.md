---
phase: 4
slug: team-formation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured (manual testing per CLAUDE.md) |
| **Config file** | none — Wave 0 installs |
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
| 04-01-01 | 01 | 1 | TEAM-01 | manual | `npm run build` (type-check) | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | TEAM-01 | manual | Manual: create team in UI, verify DB + WorkOS dashboard | N/A | ⬜ pending |
| 04-02-01 | 02 | 2 | TEAM-02 | manual | `npm run build` (type-check) | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | TEAM-02 | manual | Manual: enter email, verify delivery | N/A | ⬜ pending |
| 04-03-01 | 03 | 2 | TEAM-03 | manual | `npm run build` (type-check) | ✅ | ⬜ pending |
| 04-03-02 | 03 | 2 | TEAM-03 | manual | Manual: copy link, open in incognito | N/A | ⬜ pending |
| 04-04-01 | 04 | 3 | TEAM-04 | manual | `npm run build` (type-check) | ✅ | ⬜ pending |
| 04-04-02 | 04 | 3 | TEAM-04 | manual | Manual: accept invite, verify membership | N/A | ⬜ pending |
| 04-05-01 | 05 | 3 | TEAM-05 | manual | `npm run build` (type-check) | ✅ | ⬜ pending |
| 04-05-02 | 05 | 3 | TEAM-05 | manual | Manual: open Members tab, verify list | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Migration `006_add_workos_org_id.ts` — must run before any team creation code
- [ ] Schema update for `TeamsTable` to include `workos_organization_id`
- [ ] Middleware update to allow `/invite:path*` as unauthenticated path (if matcher changes)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Create team provisions WorkOS org + local records | TEAM-01 | Requires WorkOS dashboard verification | Create team in UI, check DB for team row + WorkOS org ID |
| Email invitation sent via WorkOS | TEAM-02 | Requires real email delivery | Enter email, verify inbox delivery |
| Shareable invite link works | TEAM-03 | Requires browser interaction | Copy link, open in incognito, verify join |
| Invited user can join team | TEAM-04 | Requires multi-user flow | Accept invite, verify membership in DB |
| Member list shows all members | TEAM-05 | Requires visual verification | Open Members tab, verify list matches DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
