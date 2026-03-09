import { authkit } from '@workos-inc/authkit-nextjs';
import { type NextRequest, NextResponse } from 'next/server';
import { db, getFullDb } from '@/lib/db';
import { sql } from 'kysely';

const STALE_MINUTES = 5;

const middlewareAuthConfig = {
  enabled: true,
  unauthenticatedPaths: ['/', '/api/auth/callback', '/invite'],
};

export default async function middleware(request: NextRequest) {
  // 1. Run authkit to handle session management (replaces authkitMiddleware)
  const { session, headers } = await authkit(request, {});

  const response = NextResponse.next({ headers });

  // Handle unauthenticated users on protected routes
  const isProtected = !middlewareAuthConfig.unauthenticatedPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(path + '/'),
  );

  if (middlewareAuthConfig.enabled && isProtected && !session.user) {
    // Redirect to login -- the authkit response already handles this via headers
    // But we need to check if there's a redirect in the headers
    const authorizationUrl =
      request.nextUrl.searchParams.get('authorizationUrl');
    // If no user on a protected route, redirect to sign in
    const signInUrl = new URL('/', request.url);
    return NextResponse.redirect(signInUrl, { headers });
  }

  // 2. Only run user sync for protected /app routes
  if (!request.nextUrl.pathname.startsWith('/app') || !session.user) {
    return response;
  }

  const user = session.user;

  try {
    // 3. Staleness check: only sync if last_synced_at is older than 5 minutes
    const existingUser = await db
      .selectFrom('users')
      .where('id', '=', user.id)
      .select(['last_synced_at', 'name', 'avatar_url'])
      .executeTakeFirst();

    const now = Date.now();
    const isStale =
      !existingUser ||
      now - new Date(existingUser.last_synced_at).getTime() >
        STALE_MINUTES * 60 * 1000;

    if (isStale) {
      const userName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

      // 4. Upsert user record
      await db
        .insertInto('users')
        .values({
          id: user.id,
          email: user.email,
          name: userName,
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

      // 5. Auto-sync: if name or avatar changed, update personal team name
      if (
        existingUser &&
        userName &&
        (existingUser.name !== userName ||
          existingUser.avatar_url !== user.profilePictureUrl)
      ) {
        const fullDb = getFullDb();
        const personalTeam = await fullDb
          .selectFrom('teams')
          .innerJoin('memberships', 'memberships.team_id', 'teams.id')
          .where('memberships.user_id', '=', user.id)
          .where('teams.is_personal', '=', 1)
          .select('teams.id')
          .executeTakeFirst();

        if (personalTeam) {
          await db
            .updateTable('teams')
            .set({
              name: `${userName}'s Workspace`,
              updated_at: sql`datetime('now')`,
            })
            .where('id', '=', personalTeam.id)
            .execute();
        }
      }
    }

    // 6. Self-healing: if user exists but personal team is missing, recreate it
    const fullDb = getFullDb();
    const personalTeam = await fullDb
      .selectFrom('teams')
      .innerJoin('memberships', 'memberships.team_id', 'teams.id')
      .where('memberships.user_id', '=', user.id)
      .where('teams.is_personal', '=', 1)
      .select('teams.id')
      .executeTakeFirst();

    if (!personalTeam) {
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
    }

    // 7. Validate active_team_id cookie
    const activeTeamId = request.cookies.get('active_team_id')?.value;
    let hasValidActiveTeam = false;

    if (activeTeamId) {
      // Verify user has membership in this team
      const membership = await fullDb
        .selectFrom('memberships')
        .where('memberships.user_id', '=', user.id)
        .where('memberships.team_id', '=', activeTeamId)
        .select('memberships.id')
        .executeTakeFirst();

      if (membership) {
        hasValidActiveTeam = true;
      } else {
        // Check if the team was non-personal (user was removed from a real team)
        const removedTeam = await fullDb
          .selectFrom('teams')
          .where('teams.id', '=', activeTeamId)
          .select(['teams.name', 'teams.is_personal'])
          .executeTakeFirst();

        if (removedTeam && removedTeam.is_personal === 0) {
          // Set a notification cookie so AppShell can show a toast
          response.cookies.set('removed_from_team', removedTeam.name, {
            httpOnly: false, // Client-side readable
            sameSite: 'lax',
            path: '/',
            maxAge: 60, // 1 minute -- just needs to survive the redirect
          });
        }

        // Clear invalid cookie
        response.cookies.delete('active_team_id');
      }
    }

    // 8. Auto-select single team: if no valid active_team_id cookie
    // Use hasValidActiveTeam (not request.cookies) to detect deletion from step 7
    if (!hasValidActiveTeam) {
      const userTeams = await fullDb
        .selectFrom('memberships')
        .where('memberships.user_id', '=', user.id)
        .select('memberships.team_id')
        .execute();

      if (userTeams.length === 1) {
        response.cookies.set('active_team_id', userTeams[0].team_id, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
      }
    }
  } catch (error) {
    // DB errors should not block the request
    console.error('[middleware] User sync error:', error);
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/app/:path*',
    '/api/:path*',
    '/workos/logout',
    '/invite/:path*',
  ],
};
