---
phase: 2
slug: multi-tenant-db-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsx scripts (no test framework yet — Wave 0 establishes) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx tsx scripts/migrate.ts` |
| **Full suite command** | `npx tsx scripts/verify-schema.ts && npx tsx tests/test-team-scope.ts && npx tsx tests/test-user-upsert.ts` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx scripts/migrate.ts`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | DATA-01 | smoke | `npx tsx scripts/verify-schema.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | DATA-02 | unit | `npx tsx tests/test-team-scope.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | DATA-03 | unit | `npx tsx tests/test-user-upsert.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/verify-schema.ts` — smoke test that runs migrations and verifies all tables exist with correct columns and foreign keys
- [ ] `tests/test-team-scope.ts` — unit test verifying teamDb wrapper adds WHERE team_id clause
- [ ] `tests/test-user-upsert.ts` — unit test verifying user upsert with WorkOS user ID format
- [ ] Test database setup (in-memory libsql or separate Turso test database)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth callback upserts user on first login | DATA-03 | Requires real WorkOS authentication flow | Sign in via WorkOS, verify user row created in DB with matching WorkOS user ID |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
