import pool from "../common/config/db.js";

/**
 * Retrieve host accounts awaiting identity/CAC verification
 */
export const findPendingHostProfiles = async () => {
  const query = `
    SELECT 
      hp.user_id,
      hp.business_name,
      hp.verification_status,
      hp.id_document_url,
      hp.cac_number,
      u.full_name,
      u.email,
      u.phone,
      u.created_at AS user_registered_at
    FROM host_profiles hp
    JOIN users u ON hp.user_id = u.id
    WHERE hp.verification_status = 'pending'
    ORDER BY u.created_at ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

/**
 * Update verification status for a host profile
 */
export const updateHostVerificationStatus = async (userId, status) => {
  const query = `
    UPDATE host_profiles
    SET verification_status = $2
    WHERE user_id = $1
    RETURNING user_id, business_name, verification_status;
  `;
  const res = await pool.query(query, [userId, status]);
  return res.rows[0];
};

/**
 * Retrieve workspace listings pending admin moderation
 */
export const findPendingWorkspaces = async () => {
  const query = `
    SELECT 
      w.id,
      w.host_id,
      w.title,
      w.workspace_type,
      w.capacity,
      w.status,
      w.created_at,
      u.full_name AS host_name,
      u.email AS host_email
    FROM workspaces w
    JOIN host_profiles hp ON w.host_id = hp.id
    JOIN users u ON hp.user_id = u.id
    WHERE w.status = 'published'
    ORDER BY w.created_at ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

/**
 * Moderate a workspace listing status (approved, rejected, suspended)
 */
export const updateWorkspaceStatus = async (workspaceId, status) => {
  const query = `
    UPDATE workspaces
    SET status = $2
    WHERE id = $1
    RETURNING id, title, status;
  `;
  const res = await pool.query(query, [workspaceId, status]);
  return res.rows[0];
};

/**
 * Fetch platform-wide live, upcoming, or flagged bookings for monitoring
 */
export const findAllBookingsAdmin = async (statusFilter) => {
  let query = `
    SELECT 
      b.id AS booking_id,
      b.workspace_id,
      w.title AS workspace_title,
      b.seeker_id,
      u.full_name AS seeker_name,
      b.corporate_account_id,
      b.start_time,
      b.end_time,
      b.mode,
      b.status,
      b.checkin_code,
      b.created_at
    FROM bookings b
    JOIN workspaces w ON b.workspace_id = w.id
    JOIN users u ON b.seeker_id = u.id
  `;

  const values = [];
  if (statusFilter) {
    query += ` WHERE b.status = $1`;
    values.push(statusFilter);
  }

  query += ` ORDER BY b.start_time DESC;`;

  const res = await pool.query(query, values);
  return res.rows;
};

/**
 * Log and execute a manual transaction refund for dispute/admin actions
 */
export const executeManualRefund = async (bookingId, refundAmount, commissionAmount) => {
  const query = `
    INSERT INTO transactions (booking_id, amount, commission_amount, type, status)
    VALUES ($1, $2, $3, 'refund', 'completed')
    RETURNING id, booking_id, amount, type, status, created_at;
  `;
  const res = await pool.query(query, [bookingId, refundAmount, commissionAmount]);
  return res.rows[0];
};

/**
 * Fetch unresolved disputes for admin review
 */
export const findActiveDisputes = async () => {
  const query = `
    SELECT 
      d.id AS dispute_id,
      d.booking_id,
      d.filed_by,
      d.status,
      d.resolution,
      b.workspace_id,
      b.seeker_id,
      b.start_time,
      b.end_time
    FROM disputes d
    JOIN bookings b ON d.booking_id = b.id
    WHERE d.status != 'resolved'
    ORDER BY d.created_at ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
};

/**
 * Resolve an active dispute and log admin ID
 */
export const resolveDisputeRecord = async (disputeId, resolution, adminUserId) => {
  const query = `
    UPDATE disputes
    SET 
      status = 'resolved',
      resolution = $2,
      resolved_by_admin_id = $3
    WHERE id = $1
    RETURNING id, booking_id, status, resolution, resolved_by_admin_id;
  `;
  const res = await pool.query(query, [disputeId, resolution, adminUserId]);
  return res.rows[0];
};

/**
 * Fetch platform-wide KPI metrics and analytics
 */
export const getPlatformAnalyticsMetrics = async () => {
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS total_completed_bookings,
      (SELECT COUNT(*) FROM workspaces WHERE status = 'admin_approved') AS total_active_listings,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'payment' AND status = 'completed') AS gross_revenue,
      (SELECT COALESCE(SUM(commission_amount), 0) FROM transactions WHERE type = 'payment' AND status = 'completed') AS net_platform_commission,
      (
        SELECT ROUND(AVG(
          CASE 
            WHEN power_stable = true AND internet_as_described = true THEN 100.0
            WHEN power_stable = true OR internet_as_described = true THEN 50.0
            ELSE 0.0
          END
        ), 2)
        FROM reviews
      ) AS avg_reliability_score;
  `;
  const res = await pool.query(query);
  return res.rows[0];
};