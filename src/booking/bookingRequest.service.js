/**
 * @file src/bookings/bookingRequest.service.js
 * @description Business logic for Host-side Request-to-Book lifecycle actions
 * (Accepting/Declining pending requests) and Seeker/Host cancellations adhering to the SpaceShare PRD.
 */

const pool = require('../common/config/db');

/**
 * Generates a unique 6-digit numeric check-in code.
 */
const generateUniqueCheckinCode = async (client) => {
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const checkQuery = `
      SELECT id FROM "Bookings" 
      WHERE checkin_code = $1 AND status IN ('confirmed', 'in_progress') 
      LIMIT 1;
    `;
    const res = await client.query(checkQuery, [code]);
    if (res.rows.length === 0) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * Host accepts a pending Request-to-Book.
 */
const acceptBookingRequest = async ({ bookingId, hostUserId }) => {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const queryBooking = `
      SELECT 
        b.id, 
        b.status, 
        b.seeker_id, 
        b.workspace_id, 
        b.start_time,
        b.end_time,
        w.host_id
      FROM "Bookings" b
      JOIN "Workspaces" w ON b.workspace_id = w.id
      WHERE b.id = $1
      FOR UPDATE OF b;
    `;
    
    const result = await client.query(queryBooking, [bookingId]);

    if (result.rows.length === 0) {
      const error = new Error('Booking request not found.');
      error.statusCode = 404;
      throw error;
    }

    const booking = result.rows[0];

    if (booking.host_id !== hostUserId) {
      const error = new Error('Forbidden: You do not have permission to manage bookings for this workspace.');
      error.statusCode = 403;
      throw error;
    }

    const pendingStatuses = ['pending', 'pending_approval'];
    if (!pendingStatuses.includes(booking.status)) {
      const error = new Error(`Cannot accept booking request with current status: '${booking.status}'.`);
      error.statusCode = 400;
      throw error;
    }

    const checkOverlapQuery = `
      SELECT id FROM "Bookings"
      WHERE workspace_id = $1
        AND status IN ('confirmed', 'in_progress')
        AND id != $2
        AND (start_time, end_time) OVERLAPS ($3, $4)
      LIMIT 1;
    `;

    const overlapResult = await client.query(checkOverlapQuery, [
      booking.workspace_id,
      bookingId,
      booking.start_time,
      booking.end_time
    ]);

    if (overlapResult.rows.length > 0) {
      const error = new Error('Cannot accept request: This workspace already has a confirmed booking for an overlapping time slot.');
      error.statusCode = 409;
      throw error;
    }

    const checkinCode = await generateUniqueCheckinCode(client);

    const updateQuery = `
      UPDATE "Bookings"
      SET status = 'confirmed',
          checkin_code = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    
    const updatedResult = await client.query(updateQuery, [checkinCode, bookingId]);
    const updatedBooking = updatedResult.rows[0];

    const autoDeclineQuery = `
      UPDATE "Bookings"
      SET status = 'declined',
          cancellation_reason = 'Workspace was booked for an overlapping time slot by another accepted request.',
          updated_at = NOW()
      WHERE workspace_id = $1
        AND status IN ('pending', 'pending_approval')
        AND id != $2
        AND (start_time, end_time) OVERLAPS ($3, $4)
      RETURNING id, seeker_id, payment_intent_id;
    `;

    const autoDeclinedResult = await client.query(autoDeclineQuery, [
      booking.workspace_id,
      bookingId,
      booking.start_time,
      booking.end_time
    ]);

    await client.query('COMMIT');

    if (autoDeclinedResult.rows.length > 0) {
      console.log(
        `[CASCADING AUTO-DECLINE] Auto-declined ${autoDeclinedResult.rows.length} overlapping pending booking(s) ` +
        `for Workspace ${booking.workspace_id}.`
      );
    }

    console.log(
      `[NOTIFICATION STUB] Booking ${bookingId} accepted by Host ${hostUserId}. ` +
      `Notified Seeker ${booking.seeker_id} | Check-in Code: ${checkinCode}`
    );

    return updatedBooking;

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Host declines a pending Request-to-Book.
 */
const declineBookingRequest = async ({ bookingId, hostUserId, reason = null }) => {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const queryBooking = `
      SELECT 
        b.id, 
        b.status, 
        b.seeker_id, 
        b.workspace_id, 
        b.payment_intent_id,
        w.host_id
      FROM "Bookings" b
      JOIN "Workspaces" w ON b.workspace_id = w.id
      WHERE b.id = $1
      FOR UPDATE OF b;
    `;

    const result = await client.query(queryBooking, [bookingId]);

    if (result.rows.length === 0) {
      const error = new Error('Booking request not found.');
      error.statusCode = 404;
      throw error;
    }

    const booking = result.rows[0];

    if (booking.host_id !== hostUserId) {
      const error = new Error('Forbidden: You do not have permission to manage bookings for this workspace.');
      error.statusCode = 403;
      throw error;
    }

    const pendingStatuses = ['pending', 'pending_approval'];
    if (!pendingStatuses.includes(booking.status)) {
      const error = new Error(`Cannot decline booking request with current status: '${booking.status}'.`);
      error.statusCode = 400;
      throw error;
    }

    const updateQuery = `
      UPDATE "Bookings"
      SET status = 'declined',
          cancellation_reason = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const updatedResult = await client.query(updateQuery, [reason, bookingId]);
    const updatedBooking = updatedResult.rows[0];

    await client.query('COMMIT');

    if (booking.payment_intent_id) {
      console.log(
        `[PAYMENT / HOLD RELEASE STUB] Released payment hold/refund for PaymentIntent: ${booking.payment_intent_id} ` +
        `due to host decline on Booking ${bookingId}.`
      );
    } else {
      console.log(`[HOLD RELEASE STUB] Released temporary slot hold for Booking ${bookingId}.`);
    }

    console.log(
      `[NOTIFICATION STUB] Booking ${bookingId} declined by Host ${hostUserId}. ` +
      `Notified Seeker ${booking.seeker_id}. Reason: ${reason || 'No reason provided.'}`
    );

    return updatedBooking;

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Seeker or Host cancels a pending or confirmed booking.
 */
const cancelBooking = async ({ bookingId, userId, reason = null }) => {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const queryBooking = `
      SELECT 
        b.id, 
        b.status, 
        b.seeker_id, 
        b.workspace_id, 
        b.payment_intent_id,
        w.host_id
      FROM "Bookings" b
      JOIN "Workspaces" w ON b.workspace_id = w.id
      WHERE b.id = $1
      FOR UPDATE OF b;
    `;

    const result = await client.query(queryBooking, [bookingId]);

    if (result.rows.length === 0) {
      const error = new Error('Booking not found.');
      error.statusCode = 404;
      throw error;
    }

    const booking = result.rows[0];

    const isSeeker = booking.seeker_id === userId;
    const isHost = booking.host_id === userId;

    if (!isSeeker && !isHost) {
      const error = new Error('Forbidden: You do not have permission to cancel this booking.');
      error.statusCode = 403;
      throw error;
    }

    const nonCancellableStatuses = ['cancelled', 'completed', 'declined'];
    if (nonCancellableStatuses.includes(booking.status)) {
      const error = new Error(`Cannot cancel booking with current status: '${booking.status}'.`);
      error.statusCode = 400;
      throw error;
    }

    const updateQuery = `
      UPDATE "Bookings"
      SET status = 'cancelled',
          cancellation_reason = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const updatedResult = await client.query(updateQuery, [reason, bookingId]);
    const updatedBooking = updatedResult.rows[0];

    await client.query('COMMIT');

    const cancelledByRole = isHost ? 'Host' : 'Seeker';
    const counterpartyId = isHost ? booking.seeker_id : booking.host_id;

    console.log(
      `[REFUND STUB] Processed refund logic for PaymentIntent: ${booking.payment_intent_id || 'N/A'} ` +
      `triggered by ${cancelledByRole} cancellation on Booking ${bookingId}.`
    );

    console.log(
      `[NOTIFICATION STUB] Booking ${bookingId} cancelled by ${cancelledByRole} ${userId}. ` +
      `Notified counterparty ${counterpartyId}. Reason: ${reason || 'No reason provided.'}`
    );

    return updatedBooking;

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  acceptBookingRequest,
  declineBookingRequest,
  cancelBooking,
};