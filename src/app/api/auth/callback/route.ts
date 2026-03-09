import { getWorkOS, handleAuth, switchToOrganization } from '@workos-inc/authkit-nextjs';
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
    const workos = getWorkOS();
    const fullDb = getFullDb();
    const personalTeam = await fullDb
      .selectFrom('teams')
      .innerJoin('memberships', 'memberships.team_id', 'teams.id')
      .where('memberships.user_id', '=', user.id)
      .where('teams.is_personal', '=', 1)
      .select(['teams.id', 'teams.workos_organization_id'])
      .executeTakeFirst();

    let personalTeamId = personalTeam?.id;

    // 3. If no personal team, create one with a WorkOS org
    if (!personalTeamId) {
      const teamId = crypto.randomUUID();
      const userName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

      // Create WorkOS org first so Pipes works for personal workspaces
      const org = await workos.organizations.createOrganization({
        name: `${userName}'s Workspace`,
      });

      await workos.userManagement.createOrganizationMembership({
        organizationId: org.id,
        userId: user.id,
        roleSlug: 'admin',
      });

      await fullDb.transaction().execute(async (trx) => {
        await trx
          .insertInto('teams')
          .values({
            id: teamId,
            name: `${userName}'s Workspace`,
            slug: `personal-${user.id}`,
            is_personal: 1,
            workos_organization_id: org.id,
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
    } else if (personalTeam && !personalTeam.workos_organization_id) {
      // Backfill: existing personal team without a WorkOS org
      const teamRow = await fullDb
        .selectFrom('teams')
        .where('id', '=', personalTeamId)
        .select('name')
        .executeTakeFirst();

      const org = await workos.organizations.createOrganization({
        name: teamRow?.name ?? `${user.email}'s Workspace`,
      });

      await workos.userManagement.createOrganizationMembership({
        organizationId: org.id,
        userId: user.id,
        roleSlug: 'admin',
      });

      await fullDb
        .updateTable('teams')
        .set({ workos_organization_id: org.id })
        .where('id', '=', personalTeamId)
        .execute();
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

    // 5. Sync WorkOS organization memberships to local DB
    // Handles users invited via WorkOS email invitation who auto-joined the org during sign-up
    try {
      const orgMemberships = await workos.userManagement.listOrganizationMemberships({
        userId: user.id,
      });

      for (const membership of orgMemberships.data) {
        // Find local team by workos_organization_id
        const team = await fullDb
          .selectFrom('teams')
          .where('workos_organization_id', '=', membership.organizationId)
          .select(['id'])
          .executeTakeFirst();

        if (!team) continue; // Org exists in WorkOS but no local team -- skip

        // Check if local membership already exists
        const existing = await fullDb
          .selectFrom('memberships')
          .where('team_id', '=', team.id)
          .where('user_id', '=', user.id)
          .select('id')
          .executeTakeFirst();

        if (!existing) {
          await fullDb
            .insertInto('memberships')
            .values({
              id: crypto.randomUUID(),
              team_id: team.id,
              user_id: user.id,
              role: 'member',
            })
            .execute();
        }
      }
    } catch (error) {
      // Don't block auth flow if membership sync fails
      console.error('[auth callback] Org membership sync error:', error);
    }

    // 6. Check for pending invite (set by setPendingInvite when unauth user clicked Join)
    const pendingInvite = cookieStore.get('pending_invite_token')?.value;
    if (pendingInvite) {
      try {
        const invite = await fullDb
          .selectFrom('invite_links')
          .innerJoin('teams', 'teams.id', 'invite_links.team_id')
          .where('invite_links.token', '=', pendingInvite)
          .where('invite_links.revoked_at', 'is', null)
          .select([
            'invite_links.id',
            'invite_links.team_id',
            'teams.workos_organization_id',
            'teams.name',
          ])
          .executeTakeFirst();

        if (invite) {
          // Check not already a member (may have been synced in Step 5 above)
          const existingMembership = await fullDb
            .selectFrom('memberships')
            .where('team_id', '=', invite.team_id)
            .where('user_id', '=', user.id)
            .select('id')
            .executeTakeFirst();

          if (!existingMembership) {
            // Create WorkOS org membership first — if this fails, nothing
            // is written locally so there's no stale state to clean up.
            // If it succeeds but the local writes below fail, Step 5's
            // WorkOS → local sync will reconcile on next login.
            if (invite.workos_organization_id) {
              await workos.userManagement.createOrganizationMembership({
                organizationId: invite.workos_organization_id,
                userId: user.id,
              });
            }

            // Local membership + use_count in a transaction so they
            // either both succeed or neither does.
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
                .set({ use_count: sql`use_count + 1` })
                .where('id', '=', invite.id)
                .execute();
            });
          }

          // Set active team to the newly joined team
          cookieStore.set('active_team_id', invite.team_id, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60,
          });

          // Switch WorkOS session org to match the new team so token
          // lookups (withAuth().organizationId) resolve correctly.
          if (invite.workos_organization_id) {
            try {
              await switchToOrganization(invite.workos_organization_id);
            } catch {
              // switchToOrganization may throw a redirect — swallow it
              // here since handleAuth will redirect to returnPathname.
            }
          }
        }
      } catch (error) {
        console.error('[auth callback] Pending invite join error:', error);
      }

      // Always clear the pending invite cookie
      cookieStore.delete('pending_invite_token');
    }
  },
});
