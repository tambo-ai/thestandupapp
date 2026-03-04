/**
 * Verification test: teamDb(teamId) scopes SELECT, UPDATE, DELETE by team_id.
 *
 * Proves DATA-02: All multi-tenant queries are scoped by team ID.
 * Runs against the Turso database, cleans up after itself.
 */

import { db, teamDb, getFullDb } from '../src/lib/db';

const TEST_PREFIX = '__test_scope_';

// Deterministic IDs for cleanup
const USER_A_ID = `${TEST_PREFIX}user_a`;
const USER_B_ID = `${TEST_PREFIX}user_b`;
const TEAM_X_ID = `${TEST_PREFIX}team_x`;
const TEAM_Y_ID = `${TEST_PREFIX}team_y`;
const MEMBERSHIP_AX_ID = `${TEST_PREFIX}mem_ax`;
const MEMBERSHIP_BY_ID = `${TEST_PREFIX}mem_by`;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

async function cleanup() {
  const fullDb = getFullDb();
  // Delete in FK order: memberships first, then teams, then users
  await fullDb
    .deleteFrom('memberships')
    .where('id', 'in', [MEMBERSHIP_AX_ID, MEMBERSHIP_BY_ID])
    .execute();
  await db
    .deleteFrom('teams')
    .where('id', 'in', [TEAM_X_ID, TEAM_Y_ID])
    .execute();
  await db
    .deleteFrom('users')
    .where('id', 'in', [USER_A_ID, USER_B_ID])
    .execute();
}

async function main() {
  console.log('Running team scope verification test...\n');

  // Clean up any leftover test data from a previous run
  await cleanup();

  // 1. Insert test data
  console.log('1. Creating test data...');

  await db
    .insertInto('users')
    .values([
      {
        id: USER_A_ID,
        email: 'test_a@example.com',
        name: 'Test User A',
        avatar_url: null,
        last_synced_at: new Date().toISOString(),
      },
      {
        id: USER_B_ID,
        email: 'test_b@example.com',
        name: 'Test User B',
        avatar_url: null,
        last_synced_at: new Date().toISOString(),
      },
    ])
    .execute();

  await db
    .insertInto('teams')
    .values([
      {
        id: TEAM_X_ID,
        name: 'Team X',
        slug: `${TEST_PREFIX}team-x`,
        is_personal: 0,
      },
      {
        id: TEAM_Y_ID,
        name: 'Team Y',
        slug: `${TEST_PREFIX}team-y`,
        is_personal: 0,
      },
    ])
    .execute();

  const fullDb = getFullDb();
  await fullDb
    .insertInto('memberships')
    .values([
      {
        id: MEMBERSHIP_AX_ID,
        team_id: TEAM_X_ID,
        user_id: USER_A_ID,
        role: 'owner' as const,
      },
      {
        id: MEMBERSHIP_BY_ID,
        team_id: TEAM_Y_ID,
        user_id: USER_B_ID,
        role: 'owner' as const,
      },
    ])
    .execute();

  console.log('  Test data created.\n');

  // 2. Test SELECT scoping
  console.log('2. Testing SELECT scoping...');

  const teamXMembers = await teamDb(TEAM_X_ID)
    .selectFrom('memberships')
    .selectAll()
    .execute();

  assert(
    teamXMembers.length === 1,
    `teamDb(team_X) SELECT returns 1 row (got ${teamXMembers.length})`,
  );
  assert(
    teamXMembers[0].user_id === USER_A_ID,
    `teamDb(team_X) SELECT returns user_A's membership`,
  );

  const teamYMembers = await teamDb(TEAM_Y_ID)
    .selectFrom('memberships')
    .selectAll()
    .execute();

  assert(
    teamYMembers.length === 1,
    `teamDb(team_Y) SELECT returns 1 row (got ${teamYMembers.length})`,
  );
  assert(
    teamYMembers[0].user_id === USER_B_ID,
    `teamDb(team_Y) SELECT returns user_B's membership`,
  );

  console.log('');

  // 3. Test UPDATE scoping
  console.log('3. Testing UPDATE scoping...');

  await teamDb(TEAM_X_ID)
    .updateTable('memberships')
    .set({ role: 'member' })
    .execute();

  // Verify team_X membership was updated
  const updatedAX = await teamDb(TEAM_X_ID)
    .selectFrom('memberships')
    .select('role')
    .executeTakeFirst();
  assert(
    updatedAX?.role === 'member',
    `teamDb(team_X) UPDATE changed team_X membership to member`,
  );

  // Verify team_Y membership was NOT updated
  const unchangedBY = await teamDb(TEAM_Y_ID)
    .selectFrom('memberships')
    .select('role')
    .executeTakeFirst();
  assert(
    unchangedBY?.role === 'owner',
    `teamDb(team_X) UPDATE did NOT affect team_Y membership (still owner)`,
  );

  console.log('');

  // 4. Test DELETE scoping
  console.log('4. Testing DELETE scoping...');

  await teamDb(TEAM_X_ID).deleteFrom('memberships').execute();

  // Verify team_X membership was deleted
  const deletedAX = await teamDb(TEAM_X_ID)
    .selectFrom('memberships')
    .selectAll()
    .execute();
  assert(
    deletedAX.length === 0,
    `teamDb(team_X) DELETE removed team_X membership`,
  );

  // Verify team_Y membership still exists
  const survivedBY = await teamDb(TEAM_Y_ID)
    .selectFrom('memberships')
    .selectAll()
    .execute();
  assert(
    survivedBY.length === 1,
    `teamDb(team_X) DELETE did NOT affect team_Y membership`,
  );
  assert(
    survivedBY[0].user_id === USER_B_ID,
    `team_Y membership still belongs to user_B`,
  );

  console.log('');

  // 5. Cleanup
  console.log('5. Cleaning up test data...');
  await cleanup();
  console.log('  Cleanup complete.\n');

  console.log('TEAM SCOPE TEST PASSED');
}

main().catch((err) => {
  console.error('TEAM SCOPE TEST FAILED:', err);
  // Attempt cleanup on failure
  cleanup().finally(() => process.exit(1));
});
