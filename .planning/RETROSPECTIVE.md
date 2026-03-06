# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Multi-Tenant Team Platform

**Shipped:** 2026-03-06
**Phases:** 6 | **Plans:** 22 | **Commits:** 110

### What Was Built
- WorkOS AuthKit login replacing Better Auth (clean-break migration)
- Multi-tenant DB schema with type-level tenant isolation (Turso/Kysely)
- WorkOS Pipes OAuth for GitHub/Linear replacing localStorage token storage
- Full team management: create, invite (email + link), join, leave, remove, edit, delete
- AI cross-team queries aggregating across all members' connections with attribution
- Per-team conversation thread isolation via composite userKey

### What Worked
- Fine-grained phase decomposition kept each plan small (~2-4 min avg execution)
- UAT gap closure plans caught real issues (thread isolation, partial error handling, env loading)
- Promise.allSettled pattern for cross-member queries prevented cascade failures
- WorkOS Pipes eliminated all manual token management complexity
- Keeping wrapper function signatures stable (withGitHubToken, withLinearClient) minimized blast radius

### What Was Inefficient
- Phase 03-04 (connection status polling fix) took 45 min vs 2-4 min average — deep debugging of WorkOS organizationId requirement
- Some roadmap plan checkboxes got out of sync with actual execution status
- Performance metrics in STATE.md became stale partway through

### Patterns Established
- Composite userKey (userId:teamId) for multi-tenant thread scoping
- contextHelpers over system prompt injection for dynamic team data
- Description-only AI coaching (tool descriptions guide behavior without code changes)
- getFullDb() for cross-table operations, teamDb() for tenant-scoped queries
- Middleware cookie (httpOnly: false, short maxAge) for ephemeral client notifications

### Key Lessons
1. WorkOS Pipes getAccessToken requires organizationId when user belongs to an org — underdocumented but critical
2. UAT after each phase catches integration gaps that unit-level verification misses
3. Server actions and API routes serve different purposes — actions for redirects, routes for data
4. Keeping AI tool schemas stable while improving descriptions is the lowest-risk way to improve AI behavior

### Cost Observations
- Model mix: quality profile throughout (opus for planning/execution)
- Sessions: ~15 sessions across 9 days
- Notable: Average plan execution ~3 min; Phase 3 Pipes debugging was the main outlier

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 110 | 6 | Established GSD workflow with UAT gap closure |

### Top Lessons (Verified Across Milestones)

1. Small plans (1-3 tasks) execute fastest and have lowest rework rate
2. UAT gap closure is worth the extra planning — catches real issues before they compound
