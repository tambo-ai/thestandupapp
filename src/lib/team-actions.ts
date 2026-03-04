'use server';

import { cookies } from 'next/headers';
import { getFullDb } from '@/lib/db';

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
