/**
 * Verification test: User upsert uses WorkOS user ID as primary key.
 *
 * Proves DATA-03: User record stores WorkOS user ID as primary identifier.
 * Runs against the Turso database, cleans up after itself.
 */

import { sql } from 'kysely';
import { db } from '../src/lib/db';

const TEST_PREFIX = '__test_upsert_';
const TEST_USER_ID = `${TEST_PREFIX}user_01TEST`;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

async function cleanup() {
  await db.deleteFrom('users').where('id', '=', TEST_USER_ID).execute();
}

async function main() {
  console.log('Running user upsert verification test...\n');

  // Clean up any leftover test data
  await cleanup();

  // 1. Test initial insert
  console.log('1. Testing initial user insert...');

  await db
    .insertInto('users')
    .values({
      id: TEST_USER_ID,
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.png',
      last_synced_at: new Date().toISOString(),
    })
    .execute();

  const inserted = await db
    .selectFrom('users')
    .where('id', '=', TEST_USER_ID)
    .selectAll()
    .executeTakeFirst();

  assert(inserted !== undefined, 'User was inserted');
  assert(inserted!.id === TEST_USER_ID, `User ID is WorkOS ID: ${TEST_USER_ID}`);
  assert(inserted!.email === 'test@example.com', 'Email matches');
  assert(inserted!.name === 'Test User', 'Name matches');
  assert(
    inserted!.avatar_url === 'https://example.com/avatar.png',
    'Avatar URL matches',
  );

  const originalCreatedAt = inserted!.created_at;
  console.log('');

  // 2. Test upsert (update on conflict)
  console.log('2. Testing upsert (update on conflict)...');

  await db
    .insertInto('users')
    .values({
      id: TEST_USER_ID,
      email: 'updated@example.com',
      name: 'Updated User',
      avatar_url: 'https://example.com/new-avatar.png',
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

  // Verify only one row exists (not duplicated)
  const allRows = await db
    .selectFrom('users')
    .where('id', '=', TEST_USER_ID)
    .selectAll()
    .execute();

  assert(allRows.length === 1, `Upsert did not duplicate (still 1 row, got ${allRows.length})`);

  const updated = allRows[0];
  assert(updated.email === 'updated@example.com', 'Email was updated');
  assert(updated.name === 'Updated User', 'Name was updated');
  assert(
    updated.avatar_url === 'https://example.com/new-avatar.png',
    'Avatar URL was updated',
  );
  assert(
    updated.created_at === originalCreatedAt,
    `created_at was NOT changed (still ${originalCreatedAt})`,
  );
  console.log('');

  // 3. Test that WorkOS user ID is the primary key
  console.log('3. Testing WorkOS user ID as primary key...');

  const byId = await db
    .selectFrom('users')
    .where('id', '=', TEST_USER_ID)
    .selectAll()
    .executeTakeFirst();

  assert(byId !== undefined, 'Can query user by WorkOS user ID');
  console.log('');

  // 4. Cleanup
  console.log('4. Cleaning up test data...');
  await cleanup();

  // Verify cleanup
  const afterCleanup = await db
    .selectFrom('users')
    .where('id', '=', TEST_USER_ID)
    .selectAll()
    .executeTakeFirst();
  assert(afterCleanup === undefined, 'Test data cleaned up successfully');
  console.log('');

  console.log('USER UPSERT TEST PASSED');
}

main().catch((err) => {
  console.error('USER UPSERT TEST FAILED:', err);
  // Attempt cleanup on failure
  cleanup().finally(() => process.exit(1));
});
