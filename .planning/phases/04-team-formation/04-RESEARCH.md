# Phase 4: Team Formation - Research

**Researched:** 2026-03-04
**Domain:** Team CRUD, WorkOS Organizations/Invitations, multi-tenant UI
**Confidence:** HIGH

## Summary

Phase 4 builds the team creation, invitation, and joining flows on top of the existing multi-tenant database schema (Phase 2) and WorkOS AuthKit session management (Phase 1). The core technical challenges are: (1) bridging local team records with WorkOS Organizations so that `organizationId` flows through the session for Pipes token scoping, (2) implementing invite links via both local tokens and the WorkOS Invitations API, and (3) building a team switcher dropdown that triggers a WorkOS session organization switch (via `switchToOrganization` from authkit-nextjs) followed by a full page reload.

The database schema from Phase 2 is nearly complete but requires one migration: adding a `workos_organization_id` column to the `teams` table. This is critical because `withAuth()` returns the `organizationId` from the WorkOS session, and all Pipes `getAccessToken` calls already conditionally pass it. Without mapping local teams to WorkOS Organizations, team-scoped Pipes connections will not work.

**Primary recommendation:** Add `workos_organization_id` to teams table, use `switchToOrganization` from authkit-nextjs for team switching (not just cookie-based), and implement shareable invite links as local tokens in the `invite_links` table while email invitations use the WorkOS Invitations API.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- "+ New Team" option in the team switcher dropdown -- only visible when user is in their personal workspace
- Form fields: team name (required) + editable URL slug (auto-suggested from name, user can customize)
- Slug uniqueness validated on submit (not real-time)
- Creating a team immediately provisions a WorkOS Organization via the Organizations API
- After creation, user lands straight in the new team's workspace (cookie set, redirect to /app)
- Soft limit on team creation (e.g., 5 teams) -- show warning but don't block
- Team deletion is out of scope for Phase 4
- Team switcher always visible in header, even for single-team users
- Shows current team name; clicking opens dropdown with all teams
- Personal workspace shown in dropdown but visually separated from real teams
- Active team highlighted/bold in the dropdown list
- Switching teams triggers a full page reload (server component re-fetches everything, clean state)
- Modal overlay consistent with connections modal from Phase 3
- Three tabbed sections: General, Invite, Members
- General tab: Read-only in Phase 4 (shows team name and slug)
- Invite tab: Shareable link section (primary) + email invite section (secondary)
- Members tab: List of team members with avatar, display name, and role badge
- Accessible from personal workspace with stripped-down version (no invite/member tabs)
- Shareable link is primary invite method, email invite is secondary
- Any team member can send invites (not restricted to owner)
- One persistent invite link per team -- owner can regenerate to invalidate the old one
- Email invites support comma-separated batch input
- Email delivery handled by WorkOS Invitations API (no custom email infrastructure)
- Invite landing page: public route showing team name + "Join [Team]" button
- Unauthenticated users: landing page, clicking "Join" triggers WorkOS sign-in, then auto-joins on callback
- Already a member: silently redirect to team workspace
- Expired/revoked link: error page with explanation
- After successfully joining: welcome screen with "Welcome to [Team]!" and "Go to workspace" button
- Same flow for both email invite links and shareable invite links
- Threads are scoped per team -- each team has its own conversation history

### Claude's Discretion
- Team switcher placement in header (left side vs near user avatar)
- Team settings modal trigger (gear icon vs dropdown menu option)
- Invite link URL format (token-based /invite/abc123 vs slug-based /join/team-slug)
- Connection scoping across teams (whether Pipes connections carry over or are team-independent)
- Whether to show pending invitations list after sending
- Exact styling, spacing, and animations for team switcher and settings modal
- Personal workspace settings view content

### Deferred Ideas (OUT OF SCOPE)
- Team name/slug editing -- Phase 5 (owner controls)
- Team deletion/archiving -- future phase
- Member removal -- Phase 5 (TEAM-07)
- Invitation management (resend/revoke pending) -- Phase 5 (TEAM-08, TEAM-09)
- Connection status per member in member list -- Phase 6
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEAM-01 | User can create a new team (workspace) which creates a WorkOS Organization | WorkOS `organizations.createOrganization()` + `userManagement.createOrganizationMembership()` + local DB transaction |
| TEAM-02 | User can invite team members via email (WorkOS Invitations API) | `workos.userManagement.sendInvitation({ email, organizationId, inviterUserId })` -- WorkOS handles email delivery |
| TEAM-03 | User can invite team members via shareable invite link | Local `invite_links` table token -- no WorkOS API needed, app-managed tokens |
| TEAM-04 | Invited user can accept invitation and join the team | Public `/invite/[token]` route + auth callback that auto-joins via `createOrganizationMembership` + local membership insert |
| TEAM-05 | User can view all team members | Query `memberships` joined with `users` table, scoped by `teamDb(teamId)` |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @workos-inc/authkit-nextjs | ^2.15.0 | Auth, session, org switching | Already integrated; provides `switchToOrganization`, `withAuth`, `getWorkOS` |
| @workos-inc/widgets | ^1.9.0 | WorkOS UI widgets (Pipes, potentially OrganizationSwitcher) | Already installed for Pipes widget |
| kysely | ^0.28.11 | Type-safe SQL query builder | Already integrated with Turso/libSQL |
| @libsql/kysely-libsql | ^0.4.1 | Turso dialect for Kysely | Already configured |
| lucide-react | ^0.554.0 | Icons (ChevronDown, Settings, Users, Link, Mail, etc.) | Already used throughout app |
| next | ^15.5.7 | App Router, server components, server actions | Core framework |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | (via tambo) | Schema validation | Validate team creation form, invite inputs |
| framer-motion | ^12.23.24 | Animations | Dropdown open/close, modal transitions |

### No New Dependencies Needed
All required functionality is covered by existing packages. The WorkOS Node SDK (accessed via `getWorkOS()` from authkit-nextjs) includes Organizations API, Invitations API, and Organization Memberships API.

## Architecture Patterns

### New File Structure
```
src/
├── app/
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx          # Public invite landing page (server component)
│   ├── api/
│   │   └── teams/
│   │       ├── create/route.ts   # POST: create team + WorkOS org
│   │       ├── switch/route.ts   # POST: switch active team (or use server action)
│   │       ├── invite-link/route.ts  # GET/POST: get or regenerate invite link
│   │       ├── invite-email/route.ts # POST: send email invitations
│   │       ├── join/route.ts     # POST: join team via invite token
│   │       └── members/route.ts  # GET: list team members
│   └── app/
│       └── page.tsx              # Updated: pass team list for switcher
├── components/
│   ├── team-switcher.tsx         # Dropdown with team list + "New Team"
│   ├── team-settings-modal.tsx   # Tabbed modal: General, Invite, Members
│   └── team-creation-form.tsx    # Team name + slug form
├── lib/
│   └── team-actions.ts           # Extended: switchTeam, createTeam server actions
└── migrations/
    └── 006_add_workos_org_id.ts  # Add workos_organization_id to teams table
```

### Pattern 1: Team Creation Flow
**What:** Create local team + WorkOS Organization in a single transaction-like operation
**When to use:** When user submits the "New Team" form

```typescript
// Server action or API route
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { db, getFullDb } from "@/lib/db";

async function createTeam(name: string, slug: string) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const workos = getWorkOS();

  // 1. Check slug uniqueness
  const existing = await db.selectFrom('teams').where('slug', '=', slug).select('id').executeTakeFirst();
  if (existing) throw new Error('Slug already taken');

  // 2. Create WorkOS Organization
  const org = await workos.organizations.createOrganization({ name });

  // 3. Create local team + membership in transaction
  const teamId = crypto.randomUUID();
  const fullDb = getFullDb();
  await fullDb.transaction().execute(async (trx) => {
    await trx.insertInto('teams').values({
      id: teamId, name, slug, is_personal: 0,
      workos_organization_id: org.id,
    }).execute();
    await trx.insertInto('memberships').values({
      id: crypto.randomUUID(), team_id: teamId,
      user_id: user.id, role: 'owner',
    }).execute();
  });

  // 4. Create WorkOS Organization Membership
  await workos.userManagement.createOrganizationMembership({
    organizationId: org.id,
    userId: user.id,
    roleSlug: 'admin',
  });

  // 5. Create default invite link
  await fullDb.insertInto('invite_links').values({
    id: crypto.randomUUID(), team_id: teamId,
    created_by: user.id, token: crypto.randomUUID(),
  }).execute();

  return { teamId, orgId: org.id };
}
```

### Pattern 2: Team Switching via WorkOS Session
**What:** Switch the WorkOS session organization context + set active_team_id cookie
**When to use:** When user selects a different team in the switcher

```typescript
// Server action
'use server';
import { switchToOrganization } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";

export async function switchTeam(teamId: string, workosOrgId: string | null) {
  // 1. Switch WorkOS organization context (for non-personal teams)
  if (workosOrgId) {
    await switchToOrganization(workosOrgId);
  }

  // 2. Set local active_team_id cookie
  const cookieStore = await cookies();
  cookieStore.set('active_team_id', teamId, {
    httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
  });
}
```

**Important:** For personal workspaces (no WorkOS Organization), skip `switchToOrganization` and just set the cookie. The existing code already handles the case where `organizationId` is undefined/null in Pipes calls.

### Pattern 3: Invite Link Join Flow
**What:** Public route that validates token, handles auth, and joins user to team
**When to use:** When user visits `/invite/[token]`

The invite landing page is a server component that:
1. Looks up the invite link token in DB (check not revoked, not expired, usage limits)
2. If valid, renders team name + "Join" button
3. If user is authenticated and already a member, redirect to `/app`
4. If user is authenticated and not a member, show join button that triggers a server action
5. If user is unauthenticated, the "Join" button redirects to WorkOS sign-in with a return URL back to `/invite/[token]`
6. On return from auth, the callback or the invite page auto-joins the user

### Pattern 4: Email Invitations via WorkOS
**What:** Send invitations using WorkOS Invitations API
**When to use:** When team member enters email addresses in the Invite tab

```typescript
const workos = getWorkOS();
const invitation = await workos.userManagement.sendInvitation({
  email: recipientEmail,
  organizationId: workosOrgId,  // Auto-joins user to org on acceptance
  inviterUserId: currentUser.id,
  expiresInDays: 7,
});
```

**Key behavior:** WorkOS handles the email delivery. When the invitee signs up/signs in, WorkOS auto-creates an organization membership. Our auth callback needs to detect this and create the local membership record.

### Pattern 5: Auth Callback Enhancement for Invite Joins
**What:** After WorkOS auth, check if user has new org memberships and sync locally
**When to use:** Auth callback (`/api/auth/callback`)

The existing `handleAuth` `onSuccess` callback needs to:
1. Check if there's a pending invite token in a cookie/query param
2. If so, look up the invite, create local membership, increment use_count
3. If the user was added to a WorkOS org via email invitation, sync that membership locally

### Anti-Patterns to Avoid
- **Do NOT use the OrganizationSwitcher widget** -- it requires admin role and widget token scopes; the custom dropdown is simpler and matches the app's design
- **Do NOT store invite tokens in the URL query string for the auth callback** -- use a secure httpOnly cookie set before redirecting to WorkOS sign-in
- **Do NOT create the WorkOS Organization Membership before the local DB transaction** -- if the local write fails, you'd have an orphaned WorkOS membership
- **Do NOT skip `switchToOrganization`** for team switching -- just setting the cookie is insufficient because `withAuth()` returns the organizationId from the WorkOS session, and Pipes calls depend on it

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery for invitations | Custom email sending (SendGrid, etc.) | `workos.userManagement.sendInvitation()` | WorkOS handles delivery, tracking, expiry |
| Organization membership management | Custom org membership tracking only | `workos.userManagement.createOrganizationMembership()` + local DB | WorkOS session needs org membership for `organizationId` in `withAuth()` |
| Session org switching | Manual cookie + token refresh | `switchToOrganization()` from authkit-nextjs | Handles refresh token exchange, error cases, SSO requirements |
| Slug generation from name | Custom regex/transliteration | Simple `toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` | Good enough for v1; no need for a slugify library |

## Common Pitfalls

### Pitfall 1: Missing workos_organization_id on Teams Table
**What goes wrong:** Team creation provisions a WorkOS Organization but there's nowhere to store its ID locally
**Why it happens:** Phase 2 schema didn't include this column (personal teams don't need WorkOS orgs)
**How to avoid:** Add migration `006_add_workos_org_id.ts` adding nullable `workos_organization_id TEXT` to teams table. Personal teams have `NULL`, real teams have the WorkOS org ID.
**Warning signs:** `organizationId` from `withAuth()` is always undefined even after team switch

### Pitfall 2: WorkOS Organization Membership Not Created
**What goes wrong:** User creates team and local membership exists, but `withAuth()` doesn't return the `organizationId`, so Pipes calls fail with `not_installed`
**Why it happens:** Forgot to call `workos.userManagement.createOrganizationMembership()` alongside the local DB insert
**How to avoid:** Always create both: WorkOS org membership + local DB membership. The WorkOS membership is what makes the session aware of the organization.
**Warning signs:** `organizationId` is null after switching to a team the user owns

### Pitfall 3: Personal Workspace Has No WorkOS Organization
**What goes wrong:** Trying to call `switchToOrganization` with null org ID for personal workspace
**Why it happens:** Personal teams don't have a WorkOS Organization
**How to avoid:** When switching to personal workspace, skip `switchToOrganization` (or pass null/undefined to clear it). The existing code already handles `organizationId ? { organizationId } : {}` pattern in Pipes calls.
**Warning signs:** Error on switching to "My Workspace"

### Pitfall 4: Invite Token Stored in Query Params Gets Lost During Auth Redirect
**What goes wrong:** User clicks "Join" on invite page, redirects to WorkOS auth, but the invite token is lost after the OAuth redirect chain
**Why it happens:** WorkOS auth redirect doesn't preserve arbitrary query parameters
**How to avoid:** Before redirecting to auth, set a `pending_invite_token` httpOnly cookie. After auth callback completes, check for this cookie, process the join, then delete it.
**Warning signs:** User completes sign-in but doesn't join the team

### Pitfall 5: Middleware Running on Invite Routes
**What goes wrong:** Unauthenticated user visits `/invite/[token]` but middleware redirects them to sign-in before they can see the landing page
**Why it happens:** Middleware config matcher includes broad `/app/:path*` but invite route is outside `/app/`
**How to avoid:** Place invite route at `/invite/[token]` (already outside `/app/` path, so current middleware matcher won't intercept). Add `/invite/:path*` to `unauthenticatedPaths` if the matcher is updated.
**Warning signs:** Unauthenticated users can never see the invite landing page

### Pitfall 6: Race Condition on Slug Uniqueness
**What goes wrong:** Two users create teams with the same slug simultaneously, one fails with DB constraint violation
**Why it happens:** Check-then-insert is not atomic
**How to avoid:** Use `INSERT ... ON CONFLICT` or catch the unique constraint error and return a user-friendly message. The `slug` column already has a UNIQUE constraint in the migration.
**Warning signs:** Uncaught SQLite UNIQUE constraint error

### Pitfall 7: switchToOrganization Redirect Behavior
**What goes wrong:** `switchToOrganization` may throw a redirect (Next.js redirect throws), breaking the expected flow
**Why it happens:** If the org requires SSO or MFA, `switchToOrganization` redirects to an authorization URL
**How to avoid:** Call `switchToOrganization` from a server action and let Next.js handle the redirect naturally. Don't wrap it in try/catch that swallows the redirect error.
**Warning signs:** Team switch silently fails or shows an error page

## Code Examples

### Migration: Add workos_organization_id to Teams
```typescript
// migrations/006_add_workos_org_id.ts
import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("teams")
    .addColumn("workos_organization_id", "text")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("teams")
    .dropColumn("workos_organization_id")
    .execute();
}
```

### Updated Schema Interface
```typescript
export interface TeamsTable {
  id: string;
  name: string;
  slug: string;
  is_personal: number;
  workos_organization_id: string | null;  // null for personal teams
  created_at: Generated<string>;
  updated_at: Generated<string>;
}
```

### Team List Query (for Switcher)
```typescript
// Server-side in page.tsx
const fullDb = getFullDb();
const userTeams = await fullDb
  .selectFrom('teams')
  .innerJoin('memberships', 'memberships.team_id', 'teams.id')
  .where('memberships.user_id', '=', user.id)
  .select(['teams.id', 'teams.name', 'teams.slug', 'teams.is_personal', 'teams.workos_organization_id'])
  .orderBy('teams.is_personal', 'desc')  // Personal first
  .orderBy('teams.name', 'asc')
  .execute();
```

### Sending Batch Email Invitations
```typescript
const workos = getWorkOS();
const emails = input.split(',').map(e => e.trim()).filter(Boolean);

const results = await Promise.allSettled(
  emails.map(email =>
    workos.userManagement.sendInvitation({
      email,
      organizationId: team.workos_organization_id!,
      inviterUserId: currentUser.id,
      expiresInDays: 7,
    })
  )
);
```

### Invite Link Validation
```typescript
// In /invite/[token]/page.tsx (server component)
const fullDb = getFullDb();
const invite = await fullDb
  .selectFrom('invite_links')
  .where('token', '=', params.token)
  .where('revoked_at', 'is', null)
  .select(['id', 'team_id', 'max_uses', 'use_count', 'expires_at'])
  .executeTakeFirst();

if (!invite) return <InviteError reason="not_found" />;
if (invite.expires_at && new Date(invite.expires_at) < new Date()) return <InviteError reason="expired" />;
if (invite.max_uses && invite.use_count >= invite.max_uses) return <InviteError reason="max_uses" />;
```

### Team Member List Query
```typescript
const fullDb = getFullDb();
const members = await fullDb
  .selectFrom('memberships')
  .innerJoin('users', 'users.id', 'memberships.user_id')
  .where('memberships.team_id', '=', teamId)
  .select([
    'users.id', 'users.name', 'users.email',
    'users.avatar_url', 'memberships.role',
  ])
  .orderBy('memberships.role', 'asc')  // owners first
  .orderBy('users.name', 'asc')
  .execute();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cookie-only team switching | `switchToOrganization()` + cookie | authkit-nextjs 2.x | Session org context is correct for Pipes |
| Manual email sending for invites | WorkOS Invitations API | WorkOS UserManagement | Zero email infra needed |
| Custom org membership tracking | WorkOS Organization Memberships + local DB | WorkOS Organizations | Session awareness of org membership |

## Open Questions

1. **switchToOrganization behavior for clearing org context**
   - What we know: `switchToOrganization(orgId)` switches to an org
   - What's unclear: How to "clear" the org context when switching to personal workspace (no org). May need to pass empty string or use a different method.
   - Recommendation: Test with `switchToOrganization('')` or skip the call entirely for personal workspace. The existing code handles missing `organizationId` gracefully.

2. **WorkOS email invitation acceptance flow**
   - What we know: WorkOS sends email with a link. When invitee signs up, they get auto-added to the org.
   - What's unclear: Does the acceptance redirect go through our `/api/auth/callback`? If so, we need to detect the new org membership and create local DB records.
   - Recommendation: In the auth callback `onSuccess`, list user's WorkOS org memberships and sync any missing local memberships.

3. **Connection scoping across teams**
   - What we know: Pipes `getAccessToken` uses `organizationId` to scope connections
   - What's unclear: If a user connects GitHub in Team A, does it work in Team B (different org)?
   - Recommendation: This is Claude's discretion. For Phase 4, don't make assumptions -- just ensure the team switcher correctly sets the org context. Phase 6 (AI cross-team) will address this.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (manual testing per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run build` (type-check + build verification) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-01 | Create team provisions WorkOS org + local records | manual | Manual: create team in UI, verify in DB + WorkOS dashboard | N/A |
| TEAM-02 | Email invitation sent via WorkOS | manual | Manual: enter email, verify delivery | N/A |
| TEAM-03 | Shareable invite link generated and works | manual | Manual: copy link, open in incognito | N/A |
| TEAM-04 | Invited user can join team | manual | Manual: accept invite, verify membership | N/A |
| TEAM-05 | Member list shows all team members | manual | Manual: open Members tab, verify list | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors, import issues)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full manual UAT of all 5 requirements

### Wave 0 Gaps
- [ ] Migration `006_add_workos_org_id.ts` -- must run before any team creation code
- [ ] Schema update for `TeamsTable` to include `workos_organization_id`
- [ ] Middleware update to allow `/invite/:path*` as unauthenticated path (if matcher changes)

## Sources

### Primary (HIGH confidence)
- WorkOS API Reference: Organization Create -- https://workos.com/docs/reference/organization/create
- WorkOS API Reference: Organization Membership -- https://workos.com/docs/reference/authkit/organization-membership
- WorkOS Invitations docs -- https://workos.com/docs/authkit/invitations
- WorkOS Organization Switcher blog -- https://workos.com/blog/how-to-implement-an-organization-switcher-with-workos-and-react
- authkit-nextjs source (switchToOrganization) -- https://github.com/workos/authkit-nextjs/blob/main/src/auth.ts
- Existing codebase: `src/lib/schema.ts`, `src/lib/db.ts`, `src/middleware.ts`, `src/app/api/auth/callback/route.ts`

### Secondary (MEDIUM confidence)
- WorkOS Node SDK blog (sendInvitation, createOrganizationMembership examples) -- https://workos.com/blog/user-management-dashboard-with-node
- WorkOS Users and Organizations docs -- https://workos.com/docs/authkit/users-organizations

### Tertiary (LOW confidence)
- Exact behavior of `switchToOrganization` with null/empty org ID -- needs runtime testing
- Whether WorkOS email invitation acceptance triggers our auth callback -- needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed, APIs verified against official docs
- Architecture: HIGH - patterns follow existing codebase conventions (server actions, portal modals, cookie-based team context)
- Pitfalls: HIGH - identified from actual codebase analysis (missing schema column, Pipes organizationId dependency documented in Phase 3 decision log)
- WorkOS API specifics: MEDIUM - API shapes verified via docs but exact SDK behavior (especially switchToOrganization edge cases) needs runtime testing

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- WorkOS SDK and Next.js patterns well-established)
