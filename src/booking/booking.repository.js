import pool from '../common/config/db.js';

/**
 * Helper to generate a unique 6-digit numeric checkin code
 */
export function generateCheckinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if a workspace has overlapping active bookings
 * (pending or confirmed) for a given time window
 */
export async function checkOverlappingBookings(workspaceId, startTime, endTime, excludeBookingId = null) {
  const values = [workspaceId, startTime, endTime];
  let excludeClause = '';

  if (excludeBookingId) {
    values.push(excludeBookingId);
    excludeClause = `AND id != $${values.length}`;
  }

  const query = `
    SELECT id 
    FROM bookings
    WHERE workspace_id = $1
      AND status IN ('pending', 'confirmed')
      AND (start_time < $3 AND end_time > $2)
      ${excludeClause}
    LIMIT 1;
  `;

  const result = await pool.query(query, values);
  return result.rows.length > 0;
}

/**
 * Create a new booking entry
 */
export async function createBooking({
  workspace_id,
  seeker_id,
  corporate_account_id = null,
  start_time,
  end_time,
  mode,
  status,
  checkin_code = null,
}) {
  const query = `
    INSERT INTO bookings (
      workspace_id,
      seeker_id,
      corporate_account_id,
      start_time,
      end_time,
      mode,
      status,
      checkin_code
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    workspace_id,
    seeker_id,
    corporate_account_id,
    start_time,
    end_time,
    mode,
    status,
    checkin_code,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get booking by ID with optional workspace details
 */
export async function findBookingById(id) {
  const query = `
    SELECT 
      b.*,
      w.title AS workspace_title,
      w.address AS workspace_address,
      w.host_id AS host_id
    FROM bookings b
    JOIN workspaces w ON b.workspace_id = w.id
    WHERE b.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Find bookings for a seeker with pagination and filter
 */
export async function findBookingsBySeeker(seekerId, { status, limit = 10, offset = 0 }) {
  const conditions = ['b.seeker_id = $1'];
  const values = [seekerId];

  if (status) {
    values.push(status);
    conditions.push(`b.status = $${values.length}`);
  }

  values.push(limit, offset);

  const query = `
    SELECT 
      b.*,
      w.title AS workspace_title,
      w.city AS workspace_city,
      w.address AS workspace_address
    FROM bookings b
    JOIN workspaces w ON b.workspace_id = w.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY b.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length};
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Find bookings for a host (all workspaces owned by host)
 */
export async function findBookingsByHost(hostId, { status, limit = 10, offset = 0 }) {
  const conditions = ['w.host_id = $1'];
  const values = [hostId];

  if (status) {
    values.push(status);
    conditions.push(`b.status = $${values.length}`);
  }

  values.push(limit, offset);

  const query = `
    SELECT 
      b.*,
      w.title AS workspace_title,
      u.full_name AS seeker_name,
      u.email AS seeker_email,
      u.phone AS seeker_phone
    FROM bookings b
    JOIN workspaces w ON b.workspace_id = w.id
    JOIN users u ON b.seeker_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY b.created_at DESC
    LIMIT $${values.length - 1} OFFSET $${values.length};
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Update booking status and checkin_code
 */
export async function updateBookingStatus(id, status, checkinCode = null) {
  const setClauses = ['status = $1', 'updated_at = NOW()'];
  const values = [status, id];

  if (checkinCode !== null) {
    values.push(checkinCode);
    setClauses.push(`checkin_code = $${values.length}`);
  }

  const query = `
    UPDATE bookings
    SET ${setClauses.join(', ')}
    WHERE id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

/**
 * Verify checkin code matching
 */
export async function verifyAndCompleteCheckin(bookingId, checkinCode) {
  const query = `
    UPDATE bookings
    SET status = 'completed', updated_at = NOW()
    WHERE id = $1 AND checkin_code = $2 AND status = 'confirmed'
    RETURNING *;
  `;
  const result = await pool.query(query, [bookingId, checkinCode]);
  return result.rows[0] || null;
}

/* ==========================================================================
   AVAILABILITY CALENDARS (src/common / src/booking)
   ========================================================================== */

/**
 * Set or block availability timeslot
 */
export async function setWorkspaceAvailability({
  workspace_id,
  date,
  start_time,
  end_time,
  is_blocked = false,
}) {
  const query = `
    INSERT INTO availability_calendars (workspace_id, date, start_time, end_time, is_blocked)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (workspace_id, date, start_time) 
    DO UPDATE SET 
      end_time = EXCLUDED.end_time,
      is_blocked = EXCLUDED.is_blocked,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [workspace_id, date, start_time, end_time, is_blocked];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Get workspace availability for a date range
 */
export async function getWorkspaceAvailability(workspaceId, startDate, endDate) {
  const query = `
    SELECT * 
    FROM availability_calendars
    WHERE workspace_id = $1 
      AND date >= $2 
      AND date <= $3
    ORDER BY date ASC, start_time ASC;
  `;

  const result = await pool.query(query, [workspaceId, startDate, endDate]);
  return result.rows;
}

/* ==========================================================================
   FAVORITES
   ========================================================================== */

/**
 * Add workspace to user's favorites
 */
export async function addFavorite(userId, workspaceId) {
  const query = `
    INSERT INTO favorites (user_id, workspace_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, workspace_id) DO NOTHING
    RETURNING *;
  `;
  const result = await pool.query(query, [userId, workspaceId]);
  return result.rows[0] || null;
}

/**
 * Remove workspace from user's favorites
 */
export async function removeFavorite(userId, workspaceId) {
  const query = `
    DELETE FROM favorites
    WHERE user_id = $1 AND workspace_id = $2
    RETURNING id;
  `;
  const result = await pool.query(query, [userId, workspaceId]);
  return result.rows.length > 0;
}

/**
 * List user's favorite workspaces
 */
export async function listUserFavorites(userId, { limit = 10, offset = 0 }) {
  const query = `
    SELECT 
      f.id AS favorite_id,
      f.created_at AS favorited_at,
      w.*
    FROM favorites f
    JOIN workspaces w ON f.workspace_id = w.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
    LIMIT $2 OFFSET $3;
  `;

  const result = await pool.query(query, [userId, limit, offset]);
  return result.rows;
}