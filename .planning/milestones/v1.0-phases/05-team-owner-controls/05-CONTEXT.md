# Phase 5: Team Owner Controls - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Workspace owners can manage team membership and pending invitations, any member can leave a team, and the General tab becomes editable. This phase extends the existing team settings modal (General/Invite/Members tabs) with interactive controls: leave team, remove member, view/resend/revoke invitations, edit team name/slug, and delete team.

</domain>

<decisions>
## Implementation Decisions

### Leave & Removal Flows
- "Leave team" button appears in both General tab and bottom of Members tab
- Removing a member uses a three-dot menu (⋮) on each non-owner member row — owner's own row has no menu (leave via dedicated button only)
- Both leave and remove require inline confirmation within the settings modal (no nested modal dialog)
- Remove confirmation shows both name and email: "Remove Alex (alex@co.com) from Design Team?"
- After leaving or being removed, user is redirected to their personal workspace
- Removed member row animates out (fade/slide), then list refetches from server
- If the only owner tries to leave, block with message: "You're the only owner. Transfer ownership before leaving." (ownership transfer deferred to future phase)
- Removed members see an in-app toast on their next visit: "You were removed from [Team]"
- If a removed member's API call returns 403, redirect them to personal workspace (handles the "other tab" edge case)

### Pending Invitations List
- Pending invitations are mixed into the Members tab list with a "Pending" badge (instead of Owner/Member role badge)
- Appear after active members (sort: owners first, then members, then pending)
- Both email invitations and shareable link invitations shown — email shows the email address, link shows as "Invite link (X uses)"
- Each pending row shows: email (or "Invite link"), sent date, who invited — e.g., "Invited by Sarah, 2 days ago"
- Generic person silhouette icon for the avatar slot (not email initial)
- All members can see pending invitations; only the owner gets action buttons (resend/revoke)

### Invitation Actions
- Actions appear in a three-dot menu (⋮) on each pending row — consistent with member rows
- Email invitation menu: "Resend" and "Revoke"
- Shareable link invitation menu: "Revoke" and "Copy link"
- Revoking does NOT require confirmation — low stakes, can re-invite
- Revoking animates the row out + refetches (same pattern as member removal)
- Revoking the shareable link auto-regenerates a new one (there's always an active link)
- Resending shows brief inline "Resent" text next to the row, then fades
- No rate limit on resend — trust the user, WorkOS handles email throttling

### General Tab Editing
- Owner sees editable input fields; members see read-only static text (no edit toggle)
- Auto-save on blur — no explicit Save button
- Brief checkmark or "Saved" text appears after successful save, then fades
- Slug auto-suggests from name changes but user can reject/customize — warning if slug was previously customized
- Slug uniqueness validated on save; inline error below field if taken ("This URL is already taken"), field reverts to previous value
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

</decisions>

<specifics>
## Specific Ideas

- Three-dot menu pattern should be consistent across member rows and pending invitation rows — same visual treatment
- Inline confirmation keeps the flow within the settings modal without stacking modals
- "Animate out + refetch" pattern used for both member removal and invitation revocation — consistent interaction
- Delete team confirmation follows GitHub's repo deletion pattern (type name to confirm) — deliberate and familiar
- Auto-save on blur for name/slug feels modern and lightweight — no Save button clutter

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/team-settings-modal.tsx`: Full modal with General/Invite/Members tabs — extend with new functionality
- `src/app/api/teams/members/route.ts`: GET route fetches members with role/avatar/email — extend to include pending invitations
- `src/app/api/teams/invite-link/route.ts`: GET/POST for invite links with revoke logic — extend for revoke-from-members-tab
- `src/lib/schema.ts`: MembershipsTable (role: owner|member), InviteLinksTable (token, revoked_at, use_count) — no schema changes needed
- `src/lib/db.ts`: `getFullDb()` for cross-table queries — needed for member removal and invitation lookups
- `src/lib/team-actions.ts`: `setActiveTeam()` and `getActiveTeamId()` — used for redirect after leave/removal

### Established Patterns
- Portal-based modal rendering with backdrop blur and Escape key handling
- Server-component-first: page.tsx fetches data, passes to client AppShell
- Cookie-based team context with middleware validation
- `withAuth({ ensureSignedIn: true })` for protected API routes
- Owner permission check pattern in invite-link POST route (membership role check)
- Member row layout: avatar, name/email, role badge — extend with three-dot menu

### Integration Points
- `src/components/team-settings-modal.tsx` — Primary file to extend (all 4 areas modify this component)
- `src/app/api/teams/members/route.ts` — Extend to support DELETE for member removal
- New: `src/app/api/teams/leave/route.ts` or similar for leave action
- New: `src/app/api/teams/[teamId]/route.ts` or `src/app/api/teams/update/route.ts` for name/slug updates
- New: `src/app/api/teams/delete/route.ts` for team deletion
- New: `src/app/api/teams/invitations/route.ts` for pending invitations list + resend/revoke
- `src/middleware.ts` — May need to handle "removed member" detection for toast notification
- `src/app/app/app-shell.tsx` — Toast notification rendering for "You were removed" message

</code_context>

<deferred>
## Deferred Ideas

- Ownership transfer — future phase (currently blocked with message if last owner tries to leave)
- Team archiving (soft delete alternative) — future consideration
- Bulk member removal — not needed for v1
- Invitation expiration settings — invite_links schema supports expires_at but not exposed in UI yet

</deferred>

---

*Phase: 05-team-owner-controls*
*Context gathered: 2026-03-04*
