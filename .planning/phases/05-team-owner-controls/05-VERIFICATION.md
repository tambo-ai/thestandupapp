---
phase: 05-team-owner-controls
verified: 2026-03-04T00:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 5: Team Owner Controls Verification Report

**Phase Goal:** Team owner controls — leave team, remove members, manage invitations, edit team settings, delete team
**Verified:** 2026-03-04
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/teams/leave removes user from team and returns personal workspace ID | VERIFIED | `leave/route.ts` — deletes membership, wraps WorkOS in try/catch, returns `personalTeamId/personalWorkosOrgId` |
| 2 | DELETE /api/teams/members removes a non-owner member (owner-only) | VERIFIED | `members/route.ts` lines 52-160 — checks requester is owner, checks target is not owner, deletes local + WorkOS membership |
| 3 | GET /api/teams/invitations returns merged list of WorkOS email invitations and local invite links | VERIFIED | `invitations/route.ts` lines 5-138 — fetches WorkOS `listInvitations` (pending filter), fetches invite_links, merges with inviter names |
| 4 | POST /api/teams/invitations can resend or revoke email invitations and revoke link invitations | VERIFIED | `invitations/route.ts` lines 140-270 — owner-only check, `resendInvitation`/`revokeInvitation` for email, revoke+regenerate for link, 400 for link resend |
| 5 | PATCH /api/teams/update saves team name/slug and syncs to WorkOS | VERIFIED | `update/route.ts` — validates name (1-100 chars), validates slug (SLUG_REGEX, 3-50), uniqueness check with 409, `updateOrganization` in try/catch |
| 6 | POST /api/teams/delete deletes team, all memberships, invite links, and WorkOS org | VERIFIED | `delete/route.ts` — personal check, confirmName match, cascading delete (invite_links → connections → memberships → teams), `deleteOrganization` in try/catch |
| 7 | Members tab shows active members AND pending invitations in sorted order | VERIFIED | `team-settings-modal.tsx` lines 756-764 — owners sorted first, then alpha; invitations appended after members |
| 8 | Owner sees three-dot menu on non-owner member rows with 'Remove' option | VERIFIED | Line 923: `showMenu = isOwner && member.id !== userId && member.role !== 'owner'`; menu at lines 991-1013 |
| 9 | Owner sees three-dot menu on pending invitation rows with type-specific options | VERIFIED | Lines 1059-1093 — `isOwner &&` gate; email shows Resend+Revoke, link shows Copy link+Revoke |
| 10 | Non-owner members see pending invitations but without action menus | VERIFIED | Invitation menu at line 1059 gated on `isOwner`; invitation rows always rendered |
| 11 | 'Leave team' button appears at bottom of Members tab with last-owner guard | VERIFIED | Lines 1099-1134 — Leave button with inline confirm; API returns 400 error shown inline; Members tab also has leave in GeneralTab |
| 12 | Owner sees editable name and slug fields on General tab with auto-save on blur | VERIFIED | `GeneralTab` lines 212-266 — `handleNameBlur` and `handleSlugBlur` call PATCH `/api/teams/update` with saved indicator |
| 13 | Delete team danger zone appears at bottom of General tab for owner only | VERIFIED | Lines 487-538 — `AlertTriangle` danger zone, `confirmDelete` state, `deleteInput !== teamName` disables button |
| 14 | Removed members see toast notification on next visit | VERIFIED | Middleware lines 165-179 sets `removed_from_team` cookie; AppShell lines 92-102 reads cookie on mount and shows fixed-position toast |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/teams/leave/route.ts` | Leave team endpoint (POST) | VERIFIED | 105 lines, exports POST, last-owner guard, WorkOS sync, returns personalTeamId |
| `src/app/api/teams/members/route.ts` | Members list + remove member (GET, DELETE) | VERIFIED | 160 lines, exports GET and DELETE, owner-only enforcement on DELETE |
| `src/app/api/teams/invitations/route.ts` | Invitations list + actions (GET, POST) | VERIFIED | 270 lines, exports GET and POST, merges WorkOS + local, resend/revoke for both types |
| `src/app/api/teams/update/route.ts` | Team update endpoint (PATCH) | VERIFIED | 143 lines, exports PATCH, slug uniqueness 409, WorkOS name sync |
| `src/app/api/teams/delete/route.ts` | Team delete endpoint (POST) | VERIFIED | 144 lines, exports POST, confirmName validation, cascading delete, WorkOS org cleanup |
| `src/components/team-settings-modal.tsx` | Extended Members tab + editable General tab | VERIFIED | 1137 lines (minimum was 500 for plan 03), all interactions implemented |
| `src/app/app/app-shell.tsx` | Toast notification for removed members + userId threading | VERIFIED | Toast state at line 90, cookie effect at lines 92-102, toast render at lines 277-281, `userId={userId}` at line 275 |
| `src/middleware.ts` | Removal detection cookie | VERIFIED | Lines 165-179 — sets `removed_from_team` cookie when active_team_id is invalid for non-personal team |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `leave/route.ts` | WorkOS deleteOrganizationMembership | `getWorkOS().userManagement` | WIRED | Line 85: `workos.userManagement.deleteOrganizationMembership(om.id)` in try/catch |
| `members/route.ts` | WorkOS deleteOrganizationMembership | `getWorkOS().userManagement` | WIRED | Line 149: same pattern for target user removal |
| `invitations/route.ts` | WorkOS listInvitations + revokeInvitation + resendInvitation | `getWorkOS().userManagement` | WIRED | Lines 62, 215, 220 — all three WorkOS calls present |
| `delete/route.ts` | WorkOS deleteOrganization | `getWorkOS().organizations` | WIRED | Line 122: `workos.organizations.deleteOrganization(team.workos_organization_id)` |
| `team-settings-modal.tsx` | DELETE /api/teams/members | fetch DELETE for member removal | WIRED | Lines 798-804: `fetch('/api/teams/members', { method: 'DELETE', ... })` |
| `team-settings-modal.tsx` | GET/POST /api/teams/invitations | fetch for pending list and resend/revoke | WIRED | Lines 745-748 (GET in refetchAll), 817-822 (POST resend), 832-837 (POST revoke) |
| `team-settings-modal.tsx` | POST /api/teams/leave | fetch POST for leave action | WIRED | Lines 865-869 (MembersTab), lines 285-289 (GeneralTab) |
| `team-settings-modal.tsx` | PATCH /api/teams/update | fetch PATCH on blur for auto-save | WIRED | Lines 216-220 (name blur), 247-251 (slug blur) |
| `team-settings-modal.tsx` | POST /api/teams/delete | fetch POST for team deletion | WIRED | Lines 307-311: `fetch('/api/teams/delete', { method: 'POST', ... })` |
| `middleware.ts` | removed_from_team cookie | Sets cookie when membership validation fails for non-personal team | WIRED | Lines 172-179: cookie set with `httpOnly: false, maxAge: 60` |
| `app-shell.tsx` | removed_from_team cookie | Reads cookie, shows toast, clears cookie | WIRED | Lines 94-99: regex match, decode, clear, setToast |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| TEAM-06 | 05-01, 05-02, 05-03 | User can leave a team | SATISFIED | `leave/route.ts` + leave button on both Members and General tabs with last-owner guard |
| TEAM-07 | 05-01, 05-02, 05-03 | Workspace owner can remove a team member | SATISFIED | `members/route.ts` DELETE + owner three-dot menu in Members tab with inline confirmation |
| TEAM-08 | 05-01, 05-02 | Workspace owner can view pending invitations | SATISFIED | `invitations/route.ts` GET merges WorkOS email invitations + invite links; Members tab displays them |
| TEAM-09 | 05-01, 05-02 | Workspace owner can resend or revoke a pending invitation | SATISFIED | `invitations/route.ts` POST handles resend/revoke; Members tab owner menus wire both actions |

All 4 required requirements are SATISFIED. No orphaned requirements (REQUIREMENTS.md traceability table maps TEAM-06 through TEAM-09 to Phase 5 only).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `team-settings-modal.tsx` | 91 | `return null` | Info | Guard clause: `if (!isOpen) return null` — correct modal rendering pattern, not a stub |

No blockers or warnings found. The single `return null` is an intentional early exit for a closed modal.

### Human Verification Required

#### 1. Leave team — last-owner block UX

**Test:** Open a team where you are the only owner. Go to Members tab. Click "Leave team". Confirm.
**Expected:** The leave confirmation button performs the action, API returns 400 with the last-owner error message, and the inline error "You're the only owner. Transfer ownership before leaving." appears below the leave button.
**Why human:** Error display path (line 876 in MembersTab, line 293 in GeneralTab) requires a real API response to reach.

#### 2. Auto-save on blur with saved indicator

**Test:** Open team settings as owner. Change the team name. Click outside the input.
**Expected:** PATCH request fires, a green checkmark (Check icon) appears next to the label, fades after 2 seconds.
**Why human:** Timing and visual feedback require browser interaction.

#### 3. Slug uniqueness inline error and revert

**Test:** Open team settings as owner. Change slug to one that is already taken by another team. Tab out.
**Expected:** Slug field shows "This URL is already taken" inline error and reverts to the previous slug value.
**Why human:** Requires two teams to exist in the same environment.

#### 4. Removed-member toast on next visit

**Test:** Remove a member from a team. Have that member navigate to /app.
**Expected:** A dark toast notification appears at bottom center: "You were removed from {teamName}". Disappears after 5 seconds.
**Why human:** Requires two real user accounts and a running server.

#### 5. Delete team with name confirmation

**Test:** Open General tab as owner. Expand danger zone. Type team name exactly. Click Delete.
**Expected:** Delete button becomes enabled, POST fires, user is redirected to /app (personal workspace).
**Why human:** Requires verifying the disabled state of the button and the redirect behavior together.

### Gaps Summary

No gaps. All 14 observable truths are verified. All 8 required artifacts exist, are substantive, and are properly wired. All 4 requirements (TEAM-06, TEAM-07, TEAM-08, TEAM-09) are satisfied.

The 5 human verification items are behavioral/interactive tests that require a running browser environment. All automated checks pass.

---

_Verified: 2026-03-04_
_Verifier: Claude (gsd-verifier)_
