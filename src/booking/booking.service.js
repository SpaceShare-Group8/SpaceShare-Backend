/**
 * SpaceShare - Booking Service Implementation
 * Handles business logic for checking overlaps with row-level locks (PostgreSQL),
 * generating secure 6-digit check-in codes, host authorization checks, 
 * booking requests, and code verification check-ins.
 * 
 * Aligns strictly with SpaceShare Master PRD (Group 8, Cohort 7 Capstone Project)
 */

import crypto from 'crypto';
import db from '../common/config/db.js'; // Database pool connection

/**
 * Generate a secure 6-digit numeric check-in code
 * @returns {string} 6-digit string
 */
export const generateCheckinCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Creates a new booking with strict transactional double-booking prevention.
 * PRD 11.7: Double-booking prevented at DB level via transactional locks.
 * PRD 10.10: Blocks corporate bookings if budget is exceeded.
 */
export const createBooking = async ({ seekerId, workspaceId, startTime, endTime, corporateAccountId = null, totalAmount }) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock workspace row to prevent concurrent race conditions
    const workspaceRes = await client.query(
      `SELECT id, host_id, status FROM "Workspaces" WHERE id = $1 FOR UPDATE`,
      [workspaceId]
    );

    if (workspaceRes.rows.length === 0) {
      throw new Error('Workspace not found.');
    }

    const workspace = workspaceRes.rows[0];

    if (workspace.status !== 'approved' && workspace.status !== 'live') {
      throw new Error('Workspace is not currently active or available for booking.');
    }

    // 2. Prevent Host from booking their own workspace
    if (workspace.host_id === seekerId) {
      throw new Error('Hosts cannot book their own workspace.');
    }

    // 3. Corporate Budget Enforcement (PRD Section 10.10 & 11.14)
    if (corporateAccountId) {
      const corporateRes = await client.query(
        `SELECT budget_amount FROM "CorporateAccounts" WHERE id = $1`,
        [corporateAccountId]
      );

      if (corporateRes.rows.length > 0) {
        const budgetAmount = parseFloat(corporateRes.rows[0].budget_amount);

        const spendRes = await client.query(
          `SELECT COALESCE(SUM(total_amount), 0) AS total_spent 
           FROM "Bookings" 
           WHERE corporate_account_id = $1 AND status IN ('confirmed', 'in_progress', 'completed')`,
          [corporateAccountId]
        );

        const currentSpend = parseFloat(spendRes.rows[0].total_spent);

        if (currentSpend + totalAmount > budgetAmount) {
          throw new Error('Corporate budget limit exceeded. Booking cannot be processed.');
        }
      }
    }

    // 4. Overlap Check using PostgreSQL Range Overlap Operators
    const overlapQuery = `
      SELECT id FROM "Bookings"
      WHERE workspace_id = $1
        AND status IN ('confirmed', 'in_progress', 'pending')
        AND (start_time, end_time) OVERLAPS ($2::timestamp, $3::timestamp)
      FOR UPDATE;
    `;
    const overlapRes = await client.query(overlapQuery, [workspaceId, startTime, endTime]);

    if (overlapRes.rows.length > 0) {
      throw new Error('Selected time slot is no longer available.');
    }

    // 5. Determine booking mode/status and Check-in Code Generation
    const bookingMode = 'instant'; 
    const initialStatus = bookingMode === 'instant' ? 'confirmed' : 'pending';
    
    // PRD 10.5 & 11.11: 6-digit code for instant/approved bookings
    const checkinCode = initialStatus === 'confirmed' ? generateCheckinCode() : null;

    // 6. Insert Booking Record
    const insertQuery = `
      INSERT INTO "Bookings" (
        workspace_id, seeker_id, corporate_account_id, start_time, end_time, 
        mode, status, checkin_code, total_amount, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;
    const insertValues = [
      workspaceId,
      seekerId,
      corporateAccountId,
      startTime,
      endTime,
      bookingMode,
      initialStatus,
      checkinCode,
      totalAmount
    ];

    const newBookingRes = await client.query(insertQuery, insertValues);

    await client.query('COMMIT');
    return newBookingRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Host accepts a Request-to-Book request.
 * Generates a check-in code upon host confirmation. (PRD 10.5 & 11.7)
 */
export const acceptBookingRequest = async (bookingId, hostId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Check Host Authorization
    const bookingQuery = `
      SELECT b.id, b.status, w.host_id 
      FROM "Bookings" b
      JOIN "Workspaces" w ON b.workspace_id = w.id
      WHERE b.id = $1 FOR UPDATE;
    `;
    const bookingRes = await client.query(bookingQuery, [bookingId]);

    if (bookingRes.rows.length === 0) {
      throw new Error('Booking not found.');
    }

    const booking = bookingRes.rows[0];

    // PRD 9 & 11.2: Host Authorization Check
    if (booking.host_id !== hostId) {
      throw new Error('Unauthorized: You are not the host of this workspace.');
    }

    if (booking.status !== 'pending') {
      throw new Error(`Booking cannot be accepted because it is currently in '${booking.status}' status.`);
    }

    const checkinCode = generateCheckinCode();

    const updateQuery = `
      UPDATE "Bookings"
      SET status = 'confirmed', checkin_code = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const updatedRes = await client.query(updateQuery, [checkinCode, bookingId]);

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Host declines a Request-to-Book request.
 */
export const declineBookingRequest = async (bookingId, hostId) => {
  const bookingQuery = `
    SELECT b.id, b.status, w.host_id 
    FROM "Bookings" b
    JOIN "Workspaces" w ON b.workspace_id = w.id
    WHERE b.id = $1;
  `;
  const bookingRes = await db.query(bookingQuery, [bookingId]);

  if (bookingRes.rows.length === 0) {
    throw new Error('Booking not found.');
  }

  const booking = bookingRes.rows[0];

  if (booking.host_id !== hostId) {
    throw new Error('Unauthorized: You are not the host of this workspace.');
  }

  if (booking.status !== 'pending') {
    throw new Error(`Booking cannot be declined because it is in '${booking.status}' status.`);
  }

  const updateQuery = `
    UPDATE "Bookings"
    SET status = 'declined', updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const result = await db.query(updateQuery, [bookingId]);
  return result.rows[0];
};

/**
 * Verifies the 6-digit Check-In code submitted by the Host and starts the session.
 * Includes rate limiting protection (PRD 10.7 & 11.11).
 */
export const processCheckIn = async (bookingId, checkinCode, hostId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const bookingQuery = `
      SELECT b.id, b.status, b.checkin_code, b.failed_checkin_attempts, w.host_id 
      FROM "Bookings" b
      JOIN "Workspaces" w ON b.workspace_id = w.id
      WHERE b.id = $1 FOR UPDATE;
    `;
    const bookingRes = await client.query(bookingQuery, [bookingId]);

    if (bookingRes.rows.length === 0) {
      throw new Error('Booking not found.');
    }

    const booking = bookingRes.rows[0];

    // 1. Authorization Verification
    if (booking.host_id !== hostId) {
      throw new Error('Unauthorized: You are not authorized to check in guests for this listing.');
    }

    // 2. Lockout Check (PRD 11.11 - Locked after 3 incorrect tries)
    if (booking.failed_checkin_attempts >= 3) {
      throw new Error('Check-in locked due to 3 failed attempts. Please contact Support.');
    }

    // 3. Status Verification
    if (booking.status !== 'confirmed') {
      throw new Error(`Invalid session state: Booking status is '${booking.status}'. Must be 'confirmed'.`);
    }

    // 4. Code Verification Check
    if (booking.checkin_code !== checkinCode.toString().trim()) {
      const newAttempts = (booking.failed_checkin_attempts || 0) + 1;
      await client.query(
        `UPDATE "Bookings" SET failed_checkin_attempts = $1 WHERE id = $2`,
        [newAttempts, bookingId]
      );

      await client.query('COMMIT');

      if (newAttempts >= 3) {
        throw new Error('Check-in locked due to 3 failed attempts. Please contact Support.');
      }

      throw new Error(`Invalid 6-digit check-in code. ${3 - newAttempts} attempt(s) remaining.`);
    }

    // 5. Successful Check-in Transition (Confirmed -> In Progress)
    const updateBooking = `
      UPDATE "Bookings"
      SET status = 'in_progress', updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const updatedRes = await client.query(updateBooking, [bookingId]);

    // Record check-in audit event (PRD 14: BookingCheckIns table)
    const auditQuery = `
      INSERT INTO "BookingCheckIns" (booking_id, checked_in_at, method)
      VALUES ($1, NOW(), '6-digit-code');
    `;
    await client.query(auditQuery, [bookingId]);

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Alias for processCheckIn to map with controller naming
 */
export const verifyAndCheckIn = processCheckIn;

/**
 * Fetch booking details by ID
 */
export const getBookingById = async (bookingId, userId, role) => {
  const query = `
    SELECT b.*, w.title AS workspace_title, w.host_id
    FROM "Bookings" b
    JOIN "Workspaces" w ON b.workspace_id = w.id
    WHERE b.id = $1;
  `;
  const result = await db.query(query, [bookingId]);
  if (result.rows.length === 0) return null;

  const booking = result.rows[0];
  if (role !== 'admin' && booking.seeker_id !== userId && booking.host_id !== userId) {
    throw new Error('Unauthorized: Access denied to this booking details.');
  }

  return booking;
};

/**
 * Fetches Seeker or Host Booking History (PRD Section 11.7a)
 */
export const getUserBookings = async ({ userId, role = 'seeker', status, page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  let baseQuery = '';
  const queryParams = [userId];

  if (role === 'host') {
    baseQuery = `
      FROM "Bookings" b
      JOIN "Workspaces" w ON b.workspace_id = w.id
      JOIN "Users" u ON b.seeker_id = u.id
      WHERE w.host_id = $1
    `;
  } else {
    baseQuery = `
      FROM "Bookings" b
      JOIN "Workspaces" w ON b.workspace_id = w.id
      WHERE b.seeker_id = $1
    `;
  }

  if (status) {
    queryParams.push(status);
    baseQuery += ` AND b.status = $${queryParams.length}`;
  }

  const countQuery = `SELECT COUNT(*) ${baseQuery}`;
  const countRes = await db.query(countQuery, queryParams);
  const totalItems = parseInt(countRes.rows[0].count, 10);

  queryParams.push(limit, offset);
  const dataQuery = `
    SELECT b.*, w.title AS workspace_title
    ${baseQuery}
    ORDER BY b.created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const dataRes = await db.query(dataQuery, queryParams);

  return {
    bookings: dataRes.rows,
    meta: {
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      limit,
    },
  };
};

/**
 * Cancel a confirmed booking
 */
export const cancelBooking = async (bookingId, userId, reason) => {
  const bookingQuery = `
    SELECT b.id, b.status, b.seeker_id, w.host_id 
    FROM "Bookings" b
    JOIN "Workspaces" w ON b.workspace_id = w.id
    WHERE b.id = $1;
  `;
  const bookingRes = await db.query(bookingQuery, [bookingId]);

  if (bookingRes.rows.length === 0) {
    throw new Error('Booking not found.');
  }

  const booking = bookingRes.rows[0];

  if (booking.seeker_id !== userId && booking.host_id !== userId) {
    throw new Error('Unauthorized to cancel this booking.');
  }

  if (['completed', 'cancelled'].includes(booking.status)) {
    throw new Error(`Booking cannot be cancelled because it is already '${booking.status}'.`);
  }

  const updateQuery = `
    UPDATE "Bookings"
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const result = await db.query(updateQuery, [bookingId]);
  return { booking: result.rows[0], cancellationReason: reason };
};