/**
 * Concurrency test for session extension.
 * Fires two simultaneous PATCH /api/bookings/:id/extend requests on the
 * SAME in-progress booking, both trying to extend into the same following
 * time slot, using Promise.all so neither waits for the other.
 *
 * Expected result: exactly ONE request succeeds (200), the other fails
 * with a clean 409 (not a crash, not two conflicting extensions).
 *
 * Usage:
 *   node scripts/concurrency-test-extend.js
 */

import 'dotenv/config';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const SEEKER_ACCESS_TOKEN = process.env.SEEKER_ACCESS_TOKEN;
const BOOKING_ID = process.env.BOOKING_ID;
const NEW_END_TIME = process.env.NEW_END_TIME;

if (!SEEKER_ACCESS_TOKEN || !BOOKING_ID || !NEW_END_TIME) {
  throw new Error('Set SEEKER_ACCESS_TOKEN, BOOKING_ID, and NEW_END_TIME env vars before running this script.');
}

async function attemptExtend(label) {
  const res = await fetch(`${BASE_URL}/api/bookings/${BOOKING_ID}/extend`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SEEKER_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ newEndTime: NEW_END_TIME }),
  });

  const body = await res.json();
  return { label, status: res.status, body };
}

async function run() {
  console.log('Firing two simultaneous extend requests for the same booking...\n');

  const [resultA, resultB] = await Promise.all([
    attemptExtend('Request A'),
    attemptExtend('Request B'),
  ]);

  for (const result of [resultA, resultB]) {
    console.log(`--- ${result.label} ---`);
    console.log(`HTTP status: ${result.status}`);
    console.log(JSON.stringify(result.body, null, 2));
    console.log();
  }

  const succeeded = [resultA, resultB].filter((r) => r.status === 200);
  const failed = [resultA, resultB].filter((r) => r.status !== 200);

  console.log('=== RESULT ===');
  if (succeeded.length === 1 && failed.length === 1) {
    console.log('PASS: exactly one extend request succeeded, the other was cleanly rejected.');
  } else if (succeeded.length === 2) {
    console.log('FAIL: both requests succeeded — double-extension occurred, the lock did not work.');
  } else if (succeeded.length === 0) {
    console.log('FAIL: neither request succeeded — check the error bodies above.');
  }
}

run().catch((err) => {
  console.error('Script error:', err);
});