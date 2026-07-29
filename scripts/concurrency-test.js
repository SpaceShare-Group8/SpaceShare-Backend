/**
 * Mandatory Day 5 concurrency test.
 * Fires two POST /api/bookings requests for the SAME workspace and SAME
 * time slot at (as close as possible to) the same instant, using
 * Promise.all so neither request waits for the other to finish first.
 *
 * Expected result: exactly ONE request succeeds (201), the other fails
 * with a clean error (not a crash, not a second confirmed booking).
 *
 * Usage:
 *   node concurrency-test.js
 *
 * 
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const SEEKER_ACCESS_TOKEN = process.env.SEEKER_ACCESS_TOKEN;
const WORKSPACE_ID = process.env.WORKSPACE_ID;

if (!SEEKER_ACCESS_TOKEN || !WORKSPACE_ID) {
  throw new Error('Set SEEKER_ACCESS_TOKEN and WORKSPACE_ID env vars before running this script.');
}
// Use a slot that hasn't been booked yet — change if this one is taken.
const START_TIME = '2026-08-03T14:00:00Z';
const END_TIME = '2026-08-03T16:00:00Z';

async function attemptBooking(label) {
  const res = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SEEKER_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      workspaceId: WORKSPACE_ID,
      startTime: START_TIME,
      endTime: END_TIME,
      totalAmount: 5000,
    }),
  });

  const body = await res.json();
  return { label, status: res.status, body };
}

async function run() {
  console.log('Firing two simultaneous booking requests for the same slot...\n');

  const [resultA, resultB] = await Promise.all([
    attemptBooking('Request A'),
    attemptBooking('Request B'),
  ]);

  for (const result of [resultA, resultB]) {
    console.log(`--- ${result.label} ---`);
    console.log(`HTTP status: ${result.status}`);
    console.log(JSON.stringify(result.body, null, 2));
    console.log();
  }

  const succeeded = [resultA, resultB].filter((r) => r.status === 201);
  const failed = [resultA, resultB].filter((r) => r.status !== 201);

  console.log('=== RESULT ===');
  if (succeeded.length === 1 && failed.length === 1) {
    console.log('PASS: exactly one request succeeded, the other was cleanly rejected.');
  } else if (succeeded.length === 2) {
    console.log('FAIL: both requests succeeded — double-booking occurred, the lock did not work.');
  } else if (succeeded.length === 0) {
    console.log('FAIL: neither request succeeded — check the error bodies above.');
  }
}

run().catch((err) => {
  console.error('Script error:', err);
});