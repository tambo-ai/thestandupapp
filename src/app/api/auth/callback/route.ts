import { handleAuth } from '@workos-inc/authkit-nextjs';
import { cookies } from 'next/headers';
import { sql } from 'kysely';
import { db, getFullDb } from '@/lib/db';

export const GET = handleAuth({
  returnPathname: '/app',
  onSuccess: async ({ user }) => {
    // 1. Upsert user record -- WorkOS user ID as primary key
    await db
      .insertInto('users')
      .values({
        id: user.id,
        email: user.email,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
        avatar_url: user.profilePictureUrl,
        last_synced_at: new Date().toISOString(),
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet((eb) => ({
          email: eb.ref('excluded.email'),
          name: eb.ref('excluded.name'),
          avatar_url: eb.ref('excluded.avatar_url'),
          last_synced_at: eb.ref('excluded.last_synced_at'),
          updated_at: sql`datetime('now')`,
        })),
      )
      .execute();

    // 2. Check if personal team exists using FullDatabase for cross-table join
    const fullDb = getFullDb();
    const personalTeam = await fullDb
      .selectFrom('teams')
      .innerJoin('memberships', 'memberships.team_id', 'teams.id')
      .where('memberships.user_id', '=', user.id)
      .where('teams.is_personal', '=', 1)
      .select('teams.id')
      .executeTakeFirst();

    let personalTeamId = personalTeam?.id;

    // 3. If no personal team, create one in a transaction
    if (!personalTeamId) {
      const teamId = crypto.randomUUID();
      const userName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

      await fullDb.transaction().execute(async (trx) => {
        await trx
          .insertInto('teams')
          .values({
            id: teamId,
            name: `${userName}'s Workspace`,
            slug: `personal-${user.id}`,
            is_personal: 1,
          })
          .execute();

        await trx
          .insertInto('memberships')
          .values({
            id: crypto.randomUUID(),
            team_id: teamId,
            user_id: user.id,
            role: 'owner',
          })
          .execute();
      });

      personalTeamId = teamId;
    }

    // 4. Set active_team_id cookie if none exists
    const cookieStore = await cookies();
    const existingTeamCookie = cookieStore.get('active_team_id');

    if (!existingTeamCookie && personalTeamId) {
      cookieStore.set('active_team_id', personalTeamId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }
  },
});
