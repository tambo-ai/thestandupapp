# Phase 5: Team Owner Controls - Research

**Researched:** 2026-03-04
**Domain:** Team management UI + WorkOS organization/invitation APIs + Kysely DB operations
**Confidence:** HIGH

## Summary

Phase 5 extends the existing `TeamSettingsModal` component with interactive controls: leave team, remove member, view/resend/revoke invitations, edit team name/slug, and delete team. The existing codebase already has the modal structure (General/Invite/Members tabs), member listing, invite link management, and all necessary DB schemas. This phase is primarily UI extension + new API routes that compose existing patterns.

The WorkOS Node SDK provides all required server-side APIs: `listInvitations` (filter by organizationId), `revokeInvitation`, `resendInvitation`, `deleteOrganizationMembership`, `updateOrganization`, and `deleteOrganization`. The local DB (Turso/Kysely) handles membership records, invite links, and team metadata. Every API route follows the established `withAuth({ ensureSignedIn: true })` + membership/ownership verification pattern.

**Primary recommendation:** Extend the existing `team-settings-modal.tsx` with interactive controls in each tab, backed by new API routes that mirror the patterns in `invite-link/route.ts` and `invite-email/route.ts`. No schema changes needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- "Leave team" button appears in both General tab and bottom of Members tab
- Removing a member uses a three-dot menu on each non-owner member row; owner's own row has no menu
- Both leave and remove require inline confirmation within the settings modal (no nested modal dialog)
- Remove confirmation shows both name and email: "Remove Alex (alex@co.com) from Design Team?"
- After leaving or being removed, user is redirected to their personal workspace
- Removed member row animates out (fade/slide), then list refetches from server
- If the only owner tries to leave, block with message: "You're the only owner. Transfer ownership before leaving."
- Removed members see an in-app toast on their next visit: "You were removed from [Team]"
- If a removed member's API call returns 403, redirect them to personal workspace
- Pending invitations mixed into Members tab list with "Pending" badge (after active members, sorted: owners, members, pending)
- Both email invitations and shareable link invitations shown in Members tab
- Each pending row shows: email (or "Invite link"), sent date, who invited
- Generic person silhouette icon for pending avatar slot
- All members can see pending invitations; only owner gets action buttons
- Actions in three-dot menu on each pending row, consistent with member rows
- Email invitation menu: "Resend" and "Revoke"; Link invitation menu: "Revoke" and "Copy link"
- Revoking does NOT require confirmation; revoking shareable link auto-regenerates a new one
- Resending shows brief inline "Resent" text next to the row, then fades
- Owner sees editable input fields on General tab; members see read-only static text
- Auto-save on blur, no explicit Save button
- Slug auto-suggests from name changes; warning if slug was previously customized
- Slug uniqueness validated on save; inline error if taken, field reverts to previous value
- Team name synced to WorkOS Organization name on save
- "Delete team" danger zone at bottom of General tab (owner only)
- Delete requires typing the team name to confirm (GitHub-style)
- After deletion, redirect to personal workspace

### Claude's Discretion
- Tab count badge on Members tab (whether to show pending invitation count)
- Team name validation rules (reasonable min/max length, allowed characters based on WorkOS constraints)
- Animation timing and easing for row removal
- Three-dot menu positioning and styling
- "Saved" indicator placement and duration
- Delete team danger zone visual styling
- What happens to the team's data after deletion (soft delete vs hard delete)
- Toast implementation for "You were removed" notification

### Deferred Ideas (OUT OF SCOPE)
- Ownership transfer -- future phase (currently blocked with message if last owner tries to leave)
- Team archiving (soft delete alternative) -- future consideration
- Bulk member removal -- not needed for v1
- Invitation expiration settings -- invite_links schema supports expires_at but not exposed in UI yet
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEAM-06 | User can leave a team | Leave API route deletes local membership + WorkOS org membership; middleware already handles invalid active_team_id cookie by clearing it; redirect to personal workspace via switchTeam |
| TEAM-07 | Workspace owner can remove a team member | Remove API route (owner-only) deletes membership + WorkOS org membership; same redirect/toast pattern as leave |
| TEAM-08 | Workspace owner can view pending invitations | WorkOS `listInvitations({ organizationId })` returns pending email invitations; local `invite_links` table provides shareable link data; merge into Members tab |
| TEAM-09 | Workspace owner can resend or revoke a pending invitation | WorkOS `resendInvitation(id)` and `revokeInvitation(id)` for email invitations; local DB revoke + regenerate for shareable links |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.4.1 | App Router, API routes | Project framework |
| React | 19.1.0 | UI components | Project framework |
| @workos-inc/authkit-nextjs | installed | `withAuth`, `getWorkOS`, `switchToOrganization` | Auth + org management |
| @workos-inc/node | installed | WorkOS SDK for org/invitation/membership APIs | Server-side WorkOS calls |
| Kysely + @libsql/kysely-libsql | installed | Type-safe SQL queries against Turso | DB layer |
| Tailwind CSS | v4 | Styling | Project standard |
| lucide-react | installed | Icons (X, Copy, Link, Mail, RefreshCw, Users, etc.) | Already used in modal |

### No New Dependencies Required
This phase requires zero new npm packages. All functionality is covered by existing dependencies.

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/
├── app/api/teams/
│   ├── leave/route.ts              # POST: leave team
│   ├── members/route.ts            # GET (extend) + DELETE: remove member
│   ├── update/route.ts             # PATCH: update team name/slug
│   ├── delete/route.ts             # POST: delete team
│   └── invitations/route.ts        # GET: list pending invitations, POST: resend/revoke
├── components/
│   └── team-settings-modal.tsx     # Extend existing (primary modification target)
└── lib/
    └── team-actions.ts             # Extend with leaveTeam helper
```

### Pattern 1: Owner Permission Check (established)
**What:** Verify the requesting user is an owner of the target team before allowing destructive operations.
**When to use:** Remove member, revoke invitation, resend invitation, update team, delete team.
**Example:**
```typescript
// Source: src/app/api/teams/invite-link/route.ts (existing pattern)
const membership = await fullDb
  .selectFrom("memberships")
  .where("memberships.user_id", "=", user.id)
  .where("memberships.team_id", "=", teamId)
  .select("memberships.role")
  .executeTakeFirst();

if (!membership) {
  return NextResponse.json({ error: "Not a member" }, { status: 403 });
}
if (membership.role !== "owner") {
  return NextResponse.json({ error: "Owner only" }, { status: 403 });
}
```

### Pattern 2: WorkOS + Local DB Dual Operation
**What:** When modifying team membership, both the local DB and WorkOS must be updated.
**When to use:** Leave team, remove member, delete team.
**Example:**
```typescript
// Remove member: delete local membership, then WorkOS org membership
await fullDb.deleteFrom("memberships")
  .where("memberships.id", "=", membershipId)
  .execute();

// Find WorkOS org membership to delete
const workos = getWorkOS();
const orgMemberships = await workos.userManagement.listOrganizationMemberships({
  organizationId: workosOrgId,
  userId: targetUserId,
});
const orgMembership = orgMemberships.data[0];
if (orgMembership) {
  await workos.userManagement.deleteOrganizationMembership(orgMembership.id);
}
```

### Pattern 3: Inline Confirmation (new pattern for this phase)
**What:** Confirmation UI rendered inline within the modal, not as a nested dialog.
**When to use:** Leave team, remove member, delete team.
**Example:**
```typescript
// State pattern for inline confirmation
const [confirmingAction, setConfirmingAction] = React.useState<string | null>(null);

// In member row: clicking "Remove" sets confirmingAction to member ID
// Confirmation replaces the row content or appears below it
// Cancel resets confirmingAction to null
```

### Pattern 4: Animate Out + Refetch
**What:** When a row is removed, animate it out visually, then refetch the full list from server.
**When to use:** Member removal, invitation revocation.
**Example:**
```typescript
const [removingId, setRemovingId] = React.useState<string | null>(null);

// After successful API call:
setRemovingId(targetId);
setTimeout(() => {
  setRemovingId(null);
  refetchMembers(); // re-fetch from server
}, 300);

// In JSX:
<div className={`transition-all duration-300 ${
  removingId === member.id ? "opacity-0 -translate-x-4 h-0 overflow-hidden" : ""
}`}>
```

### Anti-Patterns to Avoid
- **Nested modal for confirmation:** User decision locks inline confirmation. Never spawn a second modal.
- **Optimistic removal without server refetch:** Always refetch after animation completes to ensure consistency.
- **Forgetting WorkOS sync:** Every membership change in local DB must also update WorkOS. If WorkOS call fails, log but don't block (local DB is source of truth for access control in this app).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email invitation listing | Custom invitation tracking table | WorkOS `listInvitations({ organizationId })` | WorkOS already tracks email invitation state (pending/accepted/expired/revoked) |
| Email invitation resend | Custom email sending | WorkOS `resendInvitation(invitationId)` | WorkOS handles email delivery and throttling |
| Email invitation revoke | Custom state management | WorkOS `revokeInvitation(invitationId)` | WorkOS manages invitation tokens and their validity |
| Organization name update | Only update local DB | WorkOS `updateOrganization({ organization, name })` + local DB | Keep WorkOS organization name in sync |
| Organization deletion | Only delete local records | WorkOS `deleteOrganization(id)` + local DB cleanup | WorkOS org must be cleaned up to avoid orphans |
| Org membership removal | Only delete local membership | WorkOS `deleteOrganizationMembership(id)` + local DB | Keep WorkOS and local DB in sync |

**Key insight:** WorkOS is the system of record for email invitations. The local `invite_links` table only tracks shareable link invitations. These are two different invitation mechanisms that get merged in the Members tab UI.

## Common Pitfalls

### Pitfall 1: Confusing Two Invitation Systems
**What goes wrong:** Treating WorkOS email invitations and local invite_links as the same thing.
**Why it happens:** Both appear as "pending" rows in the Members tab, but they come from different sources.
**How to avoid:** Email invitations come from `workos.userManagement.listInvitations({ organizationId })`. Shareable link invitations come from the local `invite_links` table. The Members tab API must merge both into a unified list.
**Warning signs:** If the API only returns one type of invitation, or tries to revoke a WorkOS invitation using a local DB ID.

### Pitfall 2: Last Owner Leaving
**What goes wrong:** The only owner leaves, creating an ownerless team.
**Why it happens:** No guard against the last owner departing.
**How to avoid:** Before processing a leave request, count owners. If count === 1 and the requester is that owner, return an error: "You're the only owner. Transfer ownership before leaving."
**Warning signs:** Team exists with zero owners in the memberships table.

### Pitfall 3: WorkOS Org Membership ID Lookup
**What goes wrong:** Trying to delete a WorkOS org membership using the local membership ID.
**Why it happens:** Local `memberships.id` is NOT the WorkOS org membership ID. They are different systems.
**How to avoid:** Use `listOrganizationMemberships({ organizationId, userId })` to find the WorkOS membership ID, then delete it.
**Warning signs:** 404 errors from WorkOS when trying to delete memberships.

### Pitfall 4: Stale Active Team Cookie After Removal
**What goes wrong:** Removed member continues to see team data because their `active_team_id` cookie still points to the old team.
**Why it happens:** Cookie was set before removal and won't auto-clear.
**How to avoid:** The middleware already validates `active_team_id` against memberships and clears invalid cookies (line 154-168 in middleware.ts). This existing behavior handles the "removed member's next visit" case. For the "currently viewing" case, the 403 from API calls should trigger client-side redirect.
**Warning signs:** Removed member sees stale data instead of being redirected.

### Pitfall 5: Race Condition on Team Deletion
**What goes wrong:** Team is deleted while other members are actively using it.
**Why it happens:** No lock mechanism across distributed requests.
**How to avoid:** Delete in order: (1) revoke all invite links, (2) delete all memberships, (3) delete team record, (4) delete WorkOS org. Other members will get 403 on their next API call, triggering redirect to personal workspace.
**Warning signs:** Orphaned memberships or invite links referencing a deleted team.

### Pitfall 6: Slug Uniqueness Race
**What goes wrong:** Two teams try to claim the same slug simultaneously.
**Why it happens:** Check-then-update is not atomic.
**How to avoid:** The `teams.slug` column should have a UNIQUE constraint (check existing migration). If so, the DB will reject duplicates. Handle the constraint violation error gracefully and return "Slug already taken."
**Warning signs:** Duplicate slugs in the teams table.

## Code Examples

### WorkOS List Pending Email Invitations
```typescript
// Source: @workos-inc/node type definitions (verified from node_modules)
const workos = getWorkOS();
const invitations = await workos.userManagement.listInvitations({
  organizationId: team.workos_organization_id!,
});
// Filter to pending only
const pending = invitations.data.filter((inv) => inv.state === "pending");
// Each invitation has: id, email, state, inviterUserId, createdAt, expiresAt
```

### WorkOS Revoke Email Invitation
```typescript
// Source: @workos-inc/node type definitions
await workos.userManagement.revokeInvitation(invitationId);
// Returns the updated Invitation object with state: 'revoked'
```

### WorkOS Resend Email Invitation
```typescript
// Source: @workos-inc/node type definitions
await workos.userManagement.resendInvitation(invitationId);
// Returns the updated Invitation object
```

### WorkOS Delete Organization Membership
```typescript
// Source: @workos-inc/node type definitions
// First, find the WorkOS org membership ID
const memberships = await workos.userManagement.listOrganizationMemberships({
  organizationId: workosOrgId,
  userId: targetUserId,
});
if (memberships.data.length > 0) {
  await workos.userManagement.deleteOrganizationMembership(memberships.data[0].id);
}
```

### WorkOS Update Organization Name
```typescript
// Source: @workos-inc/node type definitions
await workos.organizations.updateOrganization({
  organization: workosOrgId,  // the org ID string
  name: newName,
});
```

### WorkOS Delete Organization
```typescript
// Source: @workos-inc/node type definitions
await workos.organizations.deleteOrganization(workosOrgId);
// Returns void
```

### Local DB: Delete Membership
```typescript
// Using getFullDb() for cross-table operations (established pattern)
const fullDb = getFullDb();
await fullDb
  .deleteFrom("memberships")
  .where("memberships.user_id", "=", targetUserId)
  .where("memberships.team_id", "=", teamId)
  .execute();
```

### Local DB: Count Owners
```typescript
const ownerCount = await fullDb
  .selectFrom("memberships")
  .where("memberships.team_id", "=", teamId)
  .where("memberships.role", "=", "owner")
  .select(fullDb.fn.countAll().as("count"))
  .executeTakeFirst();
```

### Finding Personal Workspace for Redirect
```typescript
// After leave/removal, find user's personal workspace to redirect to
const personalTeam = await fullDb
  .selectFrom("teams")
  .innerJoin("memberships", "memberships.team_id", "teams.id")
  .where("memberships.user_id", "=", user.id)
  .where("teams.is_personal", "=", 1)
  .select(["teams.id", "teams.workos_organization_id"])
  .executeTakeFirst();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate invitations page | Inline in Members tab | User decision for this phase | Simpler UX, no navigation |
| Save button for edits | Auto-save on blur | User decision for this phase | Fewer clicks, modern feel |
| Confirmation dialogs | Inline confirmation | User decision for this phase | No modal stacking |

## Open Questions

1. **Soft delete vs hard delete for team deletion**
   - What we know: User deferred this to Claude's discretion. Hard delete is simpler for v1.
   - Recommendation: Hard delete. Delete all memberships, invite_links, connections, and team record. Also delete WorkOS organization. Simpler, no orphaned data. Team archiving is explicitly deferred.

2. **Toast implementation for "You were removed" notification**
   - What we know: User wants a toast on next visit. No toast system exists yet.
   - Recommendation: Simple approach -- store a `removed_from_team` value in a cookie (set during removal detection in middleware or via a lightweight flag). On next page load, AppShell reads it, shows a temporary toast, and clears it. Avoids adding a toast library; a simple `position: fixed` notification with auto-dismiss is sufficient for this single use case.

3. **Tab count badge on Members tab**
   - Recommendation: Yes, show pending count badge. It signals to owners that invitations are outstanding. Format: "Members (3)" where 3 includes pending count. Low implementation cost, high discoverability.

4. **Team name validation rules**
   - What we know: `teams/create/route.ts` validates name 1-100 chars and slug 3-50 chars with `SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`.
   - Recommendation: Reuse identical validation. Name: 1-100 characters, non-empty. Slug: 3-50 lowercase alphanumeric + hyphens, must start and end with alphanumeric.

5. **Animation timing**
   - Recommendation: 300ms ease-out for row removal (fade + slide left). Standard, not distracting.

6. **"Saved" indicator**
   - Recommendation: Small green checkmark icon that appears next to the field label, fades after 2 seconds. Consistent with the existing "Copied!" pattern in the invite link section.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-06 | User can leave a team | manual | Dev server: leave team, verify redirect + membership gone | N/A |
| TEAM-07 | Owner can remove a member | manual | Dev server: remove member as owner, verify removal | N/A |
| TEAM-08 | Owner can view pending invitations | manual | Dev server: send invite, check Members tab | N/A |
| TEAM-09 | Owner can resend or revoke invitation | manual | Dev server: resend/revoke from Members tab | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build passes + manual verification of all 4 requirements

### Wave 0 Gaps
None -- no test framework configured per project guidelines. Manual testing via development server is the established approach.

## Sources

### Primary (HIGH confidence)
- `@workos-inc/node` type definitions in `node_modules` -- verified all API signatures for: `listInvitations`, `revokeInvitation`, `resendInvitation`, `deleteOrganizationMembership`, `listOrganizationMemberships`, `updateOrganization`, `deleteOrganization`
- Existing codebase: `src/components/team-settings-modal.tsx`, `src/app/api/teams/members/route.ts`, `src/app/api/teams/invite-link/route.ts`, `src/app/api/teams/invite-email/route.ts`, `src/app/api/teams/create/route.ts`, `src/lib/team-actions.ts`, `src/lib/schema.ts`, `src/lib/db.ts`, `src/middleware.ts`, `src/app/app/app-shell.tsx`

### Secondary (MEDIUM confidence)
- WorkOS invitation interface: `state` field supports 'pending' | 'accepted' | 'expired' | 'revoked' -- verified from type definitions
- WorkOS `UpdateOrganizationOptions`: `{ organization: string, name?: string }` -- verified from type definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - extends established patterns visible in existing code
- Pitfalls: HIGH - identified from direct code analysis and WorkOS type inspection
- WorkOS APIs: HIGH - verified from installed SDK type definitions

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- no external API changes expected)
