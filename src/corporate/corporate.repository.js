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
      INSERT INTO "CorporateAccounts" (admin_user_id, company_name, budget_amount, budget_period)
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

    // 2. Add 'corporate_admin' role to the user's roles array if not already present
    const updateRoleQuery = `
      UPDATE "Users"
      SET roles = ARRAY(SELECT DISTINCT unnest(array_append(roles, 'corporate_admin')))
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
    FROM "CorporateAccounts"
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
    FROM "CorporateAccounts"
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
    UPDATE "CorporateAccounts"
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
    FROM "CorporateEmployees"
    WHERE corporate_account_id = $1 AND user_id = (SELECT id FROM "Users" WHERE email = $2);
  `;
  const res = await pool.query(query, [corporateAccountId, email]);
  return res.rows[0] || null;
};

/**
 * Create employee invite record
 */
export const createCorporateEmployeeInvite = async ({ corporateAccountId, userId }) => {
  const query = `
    INSERT INTO "CorporateEmployees" (corporate_account_id, user_id, invited_at, status)
    VALUES ($1, $2, NOW(), 'invited')
    RETURNING id, corporate_account_id, user_id, invited_at, status;
  `;
  const res = await pool.query(query, [corporateAccountId, userId]);
  return res.rows[0];
};

/**
 * Find user by email helper
 */
export const findUserByEmail = async (email) => {
  const query = `SELECT id, email, full_name FROM "Users" WHERE email = $1;`;
  const res = await pool.query(query, [email]);
  return res.rows[0] || null;
};

/**
 * Calculate corporate spending during the active billing period
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