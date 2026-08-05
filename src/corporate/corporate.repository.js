import pool from "../common/config/db.js";

/**
 * Create a new Corporate Account and assign corporate_admin role to user
 */
export const createCorporateAccount = async ({ adminUserId, companyName, budgetAmount, budgetPeriod }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Insert Corporate Account
    const insertQuery = `
      INSERT INTO corporate_accounts (admin_user_id, company_name, budget_amount, budget_period)
      VALUES ($1, $2, $3, $4)
      RETURNING id, admin_user_id, company_name, budget_amount, budget_period;
    `;
    const res = await client.query(insertQuery, [
      adminUserId,
      companyName,
      budgetAmount || 0,
      budgetPeriod || "monthly",
    ]);
    const corporateAccount = res.rows[0];

    // 2. Set the user's role to 'corporate_admin'.
    // NOTE: `role` is a single column (not an array) on this schema — see
    // migrations/001_create_users.sql. The original query here referenced
    // a `roles` array column and a quoted "Users" table, neither of which
    // exist; both bugs are fixed here.
    const updateRoleQuery = `
      UPDATE users
      SET role = 'corporate_admin'
      WHERE id = $1;
    `;
    await client.query(updateRoleQuery, [adminUserId]);

    await client.query("COMMIT");
    return corporateAccount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Find corporate account by ID
 */
export const findCorporateAccountById = async (accountId) => {
  const query = `
    SELECT id, admin_user_id, company_name, budget_amount, budget_period
    FROM corporate_accounts
    WHERE id = $1;
  `;
  const res = await pool.query(query, [accountId]);
  return res.rows[0] || null;
};

/**
 * Find corporate account by Admin User ID
 */
export const findCorporateAccountByAdminId = async (adminUserId) => {
  const query = `
    SELECT id, admin_user_id, company_name, budget_amount, budget_period
    FROM corporate_accounts
    WHERE admin_user_id = $1;
  `;
  const res = await pool.query(query, [adminUserId]);
  return res.rows[0] || null;
};

/**
 * Update Corporate Account Budget
 */
export const updateCorporateBudget = async (accountId, { budgetAmount, budgetPeriod }) => {
  const query = `
    UPDATE corporate_accounts
    SET budget_amount = COALESCE($1, budget_amount),
        budget_period = COALESCE($2, budget_period)
    WHERE id = $3
    RETURNING id, admin_user_id, company_name, budget_amount, budget_period;
  `;
  const res = await pool.query(query, [budgetAmount, budgetPeriod, accountId]);
  return res.rows[0];
};

/**
 * Find corporate employee record by email and corporate account
 */
export const findCorporateEmployeeByEmail = async (corporateAccountId, email) => {
  const query = `
    SELECT id, corporate_account_id, user_id, invited_at, status
    FROM corporate_employees
    WHERE corporate_account_id = $1 AND user_id = (SELECT id FROM users WHERE email = $2);
  `;
  const res = await pool.query(query, [corporateAccountId, email]);
  return res.rows[0] || null;
};

/**
 * Create employee invite record
 */
export const createCorporateEmployeeInvite = async ({ corporateAccountId, userId }) => {
  const query = `
    INSERT INTO corporate_employees (corporate_account_id, user_id, invited_at, status)
    VALUES ($1, $2, NOW(), 'invited')
    RETURNING id, corporate_account_id, user_id, invited_at, status;
  `;
  const res = await pool.query(query, [corporateAccountId, userId]);
  return res.rows[0];
};

/**
 * Find corporate employee record by corporate account + user ID.
 * Used at accept-invite time — unlike findCorporateEmployeeByEmail, this
 * looks up by user_id directly since by this point we've already
 * resolved the invite token's email to a user record.
 */
export const findCorporateEmployeeRecord = async (corporateAccountId, userId) => {
  const query = `
    SELECT id, corporate_account_id, user_id, invited_at, status, accepted_at
    FROM corporate_employees
    WHERE corporate_account_id = $1 AND user_id = $2;
  `;
  const res = await pool.query(query, [corporateAccountId, userId]);
  return res.rows[0] || null;
};

/**
 * Mark a corporate employee record as accepted — status 'active' and
 * accepted_at set to now. If no invite row exists yet (e.g. the invite
 * was dispatched to an email that wasn't registered at the time), this
 * creates one directly in the 'active' state rather than requiring a
 * separate 'invited' row first.
 */
export const activateCorporateEmployee = async (corporateAccountId, userId) => {
  const query = `
    INSERT INTO corporate_employees (corporate_account_id, user_id, invited_at, status, accepted_at)
    VALUES ($1, $2, NOW(), 'active', NOW())
    ON CONFLICT (corporate_account_id, user_id)
    DO UPDATE SET status = 'active', accepted_at = NOW()
    RETURNING id, corporate_account_id, user_id, invited_at, status, accepted_at;
  `;
  const res = await pool.query(query, [corporateAccountId, userId]);
  return res.rows[0];
};

/**
 * Sets a user's role to 'corporate_employee', but only if their current
 * role is still the default 'seeker'. This deliberately avoids
 * downgrading someone who is already a host, corporate_admin, or admin —
 * this schema stores a single `role` per user, so overwriting it would
 * silently strip an existing, more specific role.
 * Returns the updated row, or null if no update happened (role was
 * something other than 'seeker').
 */
export const setUserRoleToCorporateEmployeeIfSeeker = async (userId) => {
  const query = `
    UPDATE users
    SET role = 'corporate_employee', updated_at = NOW()
    WHERE id = $1 AND role = 'seeker'
    RETURNING id, email, role;
  `;
  const res = await pool.query(query, [userId]);
  return res.rows[0] || null;
};

/**
 * Find user by email helper
 */
export const findUserByEmail = async (email) => {
  const query = `SELECT id, email, full_name, role FROM users WHERE email = $1;`;
  const res = await pool.query(query, [email]);
  return res.rows[0] || null;
};

/**
 * Calculate corporate spending during the active billing period
 *
 * ⚠️ KNOWN BUG (not fixed here — needs someone to verify the real
 * bookings/transactions column names before fixing):
 * This query and getCorporateUsageReport() below reference quoted
 * PascalCase tables ("Bookings", "Transactions", "Workspaces", "Users")
 * that don't exist — the actual tables are lowercase (bookings,
 * transactions, workspaces, users), same issue that was just fixed
 * above for corporate_accounts/corporate_employees.
 */
export const getCorporateSpendInPeriod = async (corporateAccountId, startDate) => {
  const query = `
    SELECT COALESCE(SUM(t.amount), 0) AS "totalSpend"
    FROM "Bookings" b
    JOIN "Transactions" t ON b.id = t.booking_id
    WHERE b.corporate_account_id = $1
      AND b.status IN ('confirmed', 'in_progress', 'completed')
      AND t.type = 'payment'
      AND t.status = 'successful'
      AND t.created_at >= $2;
  `;
  const res = await pool.query(query, [corporateAccountId, startDate]);
  return parseFloat(res.rows[0].totalSpend);
};

/**
 * Retrieve Usage Report with summary, employee breakdown, and workspace breakdown
 */
export const getCorporateUsageReport = async (corporateAccountId, { startDate, endDate }) => {
  const overallQuery = `
    SELECT 
      COUNT(b.id) AS "totalBookings",
      COALESCE(SUM(t.amount), 0) AS "totalSpend"
    FROM "Bookings" b
    LEFT JOIN "Transactions" t ON b.id = t.booking_id AND t.type = 'payment' AND t.status = 'successful'
    WHERE b.corporate_account_id = $1
      AND b.created_at >= $2 AND b.created_at <= $3;
  `;

  const employeeBreakdownQuery = `
    SELECT 
      u.id AS "userId",
      u.email AS "employeeEmail",
      COUNT(b.id) AS "bookingCount",
      COALESCE(SUM(t.amount), 0) AS "totalSpend"
    FROM "Bookings" b
    JOIN "Users" u ON b.seeker_id = u.id
    LEFT JOIN "Transactions" t ON b.id = t.booking_id AND t.type = 'payment' AND t.status = 'successful'
    WHERE b.corporate_account_id = $1
      AND b.created_at >= $2 AND b.created_at <= $3
    GROUP BY u.id, u.email;
  `;

  const locationBreakdownQuery = `
    SELECT 
      w.id AS "workspaceId",
      w.title AS "workspaceTitle",
      COUNT(b.id) AS "bookingCount",
      COALESCE(SUM(t.amount), 0) AS "totalSpend"
    FROM "Bookings" b
    JOIN "Workspaces" w ON b.workspace_id = w.id
    LEFT JOIN "Transactions" t ON b.id = t.booking_id AND t.type = 'payment' AND t.status = 'successful'
    WHERE b.corporate_account_id = $1
      AND b.created_at >= $2 AND b.created_at <= $3
    GROUP BY w.id, w.title;
  `;

  const params = [corporateAccountId, startDate, endDate];

  const [overall, employees, locations] = await Promise.all([
    pool.query(overallQuery, params),
    pool.query(employeeBreakdownQuery, params),
    pool.query(locationBreakdownQuery, params),
  ]);

  return {
    summary: {
      totalBookings: parseInt(overall.rows[0]?.totalBookings || 0, 10),
      totalSpend: parseFloat(overall.rows[0]?.totalSpend || 0),
    },
    byEmployee: employees.rows.map((row) => ({
      ...row,
      bookingCount: parseInt(row.bookingCount, 10),
      totalSpend: parseFloat(row.totalSpend),
    })),
    byLocation: locations.rows.map((row) => ({
      ...row,
      bookingCount: parseInt(row.bookingCount, 10),
      totalSpend: parseFloat(row.totalSpend),
    })),
  };
};