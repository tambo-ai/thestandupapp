'use server';

import { cookies } from 'next/headers';
import { getFullDb } from '@/lib/db';
import {
  getWorkOS,
  withAuth,
  switchToOrganization,
} from '@workos-inc/authkit-nextjs';

/**
 * Sets the active team cookie after verifying the user is a member.
 * Throws if the user is not a member of the specified team.
 */
export async function setActiveTeam(
  teamId: string,
  userId: string,
): Promise<void> {
  // Verify user is a member of the team before setting cookie
  const fullDb = getFullDb();
  const membership = await fullDb
    .selectFrom('memberships')
    .where('memberships.user_id', '=', userId)
    .where('memberships.team_id', '=', teamId)
    .select('memberships.id')
    .executeTakeFirst();

  if (!membership) {
    throw new Error('User is not a member of this team');
  }

  const cookieStore = await cookies();
  cookieStore.set('active_team_id', teamId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Gets the active team ID from the cookie, or null if not set.
 */
export async function getActiveTeamId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('active_team_id')?.value ?? null;
}

/**
 * Switches the user's active team. Sets the active_team_id cookie and,
 * for non-personal teams, calls switchToOrganization to update the WorkOS session.
 *
 * NOTE: switchToOrganization may throw a Next.js redirect; let it propagate naturally.
 */
export async function switchTeam(
  teamId: string,
  workosOrgId: string | null,
): Promise<void> {
  const { user } = await withAuth({ ensureSignedIn: true });

  // Verify membership
  const fullDb = getFullDb();
  const membership = await fullDb
    .selectFrom('memberships')
    .where('memberships.user_id', '=', user.id)
    .where('memberships.team_id', '=', teamId)
    .select('memberships.id')
    .executeTakeFirst();

  if (!membership) {
    throw new Error('User is not a member of this team');
  }

  // Set active team cookie
  const cookieStore = await cookies();
  cookieStore.set('active_team_id', teamId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // For real teams, switch the WorkOS organization context
  // For personal workspace (null orgId), skip -- just the cookie is enough
  if (workosOrgId) {
    await switchToOrganization(workosOrgId);
  }
}

/**
 * Joins a team via invite token. Validates the token, creates a membership,
 * increments the invite use count, and creates a WorkOS org membership.
 *
 * Returns { teamId, teamName } on success, or { alreadyMember: true } if already joined.
 */
export async function joinTeam(
  token: string,
): Promise<
  { teamId: string; teamName: string; alreadyMember?: never } | { alreadyMember: true; teamId?: never; teamName?: never }
> {
  const { user } = await withAuth({ ensureSignedIn: true });
  const fullDb = getFullDb();

  // Validate invite token
  const invite = await fullDb
    .selectFrom('invite_links')
    .where('invite_links.token', '=', token)
    .where('invite_links.revoked_at', 'is', null)
    .selectAll()
    .executeTakeFirst();

  if (!invite) {
    throw new Error('Invalid or revoked invite link');
  }

  // Check expiry
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    throw new Error('Invite link has expired');
  }

  // Check max uses
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    throw new Error('Invite link has reached maximum uses');
  }

  // Check if already a member
  const existingMembership = await fullDb
    .selectFrom('memberships')
    .where('memberships.user_id', '=', user.id)
    .where('memberships.team_id', '=', invite.team_id)
    .select('memberships.id')
    .executeTakeFirst();

  if (existingMembership) {
    return { alreadyMember: true };
  }

  // Look up team for workos_organization_id and name
  const team = await fullDb
    .selectFrom('teams')
    .where('teams.id', '=', invite.team_id)
    .select(['teams.workos_organization_id', 'teams.name'])
    .executeTakeFirst();

  if (!team) {
    throw new Error('Team not found');
  }

  // Create membership and increment use count in a transaction
  await fullDb.transaction().execute(async (trx) => {
    await trx
      .insertInto('memberships')
      .values({
        id: crypto.randomUUID(),
        team_id: invite.team_id,
        user_id: user.id,
        role: 'member',
      })
      .execute();

    await trx
      .updateTable('invite_links')
      .set({ use_count: invite.use_count + 1 })
      .where('invite_links.id', '=', invite.id)
      .execute();
  });

  // Create WorkOS org membership if team has a WorkOS organization
  if (team.workos_organization_id) {
    const workos = getWorkOS();
    await workos.userManagement.createOrganizationMembership({
      organizationId: team.workos_organization_id,
      userId: user.id,
    });
  }

  return { teamId: invite.team_id, teamName: team.name };
}

/**
 * Sets a pending invite token cookie for unauthenticated users.
 * Called before redirecting to sign-in so the auth callback can auto-join after login.
 */
export async function setPendingInvite(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('pending_invite_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes -- short-lived, only needs to survive auth redirect
  });
}
