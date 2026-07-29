import {
  createCorporateAccount,
  findCorporateAccountByAdminId,
  findCorporateAccountById,
  createCorporateEmployeeInvite,
  findUserByEmail,
  findCorporateEmployeeByEmail,
  updateCorporateBudget,
  getCorporateSpendInPeriod,
  getCorporateUsageReport,
} from "./corporate.repository.js";
import { generateEmployeeInviteToken } from "../common/utils/jwt.js";

/**
 * Provision Corporate Account
 */
export const provisionCorporateAccount = async (userId, companyData) => {
  const existingAccount = await findCorporateAccountByAdminId(userId);
  if (existingAccount) {
    const error = new Error("Corporate account already exists for this user.");
    error.statusCode = 409;
    throw error;
  }

  return await createCorporateAccount({
    adminUserId: userId,
    companyName: companyData.company_name,
    budgetAmount: companyData.budget_amount,
    budgetPeriod: companyData.budget_period,
  });
};

/**
 * Update Corporate Budget
 */
export const updateBudget = async (adminUserId, budgetData) => {
  const account = await findCorporateAccountByAdminId(adminUserId);
  if (!account) {
    const error = new Error("Corporate account not found. Please provision an account first.");
    error.statusCode = 404;
    throw error;
  }

  return await updateCorporateBudget(account.id, {
    budgetAmount: budgetData.budget_amount,
    budgetPeriod: budgetData.budget_period,
  });
};

/**
 * Dispatch Employee Invitation
 */
export const dispatchEmployeeInvite = async (adminUserId, employeeEmail, baseUrl) => {
  const corporateAccount = await findCorporateAccountByAdminId(adminUserId);
  if (!corporateAccount) {
    const error = new Error("Corporate account not found. Please provision an account first.");
    error.statusCode = 404;
    throw error;
  }

  // Verify if employee is already invited/registered under this corporate account
  const existingEmployee = await findCorporateEmployeeByEmail(corporateAccount.id, employeeEmail);
  if (existingEmployee) {
    const error = new Error("An invitation has already been dispatched to this employee email.");
    error.statusCode = 409;
    throw error;
  }

  // Lookup target user
  const user = await findUserByEmail(employeeEmail);
  const userId = user ? user.id : null;

  // Generate tokenized invite payload
  const token = generateEmployeeInviteToken({
    email: employeeEmail,
    corporate_account_id: corporateAccount.id,
  });

  const inviteLink = `${baseUrl}/api/corporate/accept-invite?token=${token}`;

  let inviteRecord = null;
  if (userId) {
    inviteRecord = await createCorporateEmployeeInvite({
      corporateAccountId: corporateAccount.id,
      userId: userId,
    });
  }

  console.log(`\n================ EMPLOYEE INVITE DISPATCH ================`);
  console.log(`To: ${employeeEmail}`);
  console.log(`Company: ${corporateAccount.company_name}`);
  console.log(`Invite Link: ${inviteLink}`);
  console.log(`==========================================================\n`);

  return {
    employee_email: employeeEmail,
    corporate_account_id: corporateAccount.id,
    invite_link: inviteLink,
    invite_token: token,
    invite_record: inviteRecord,
  };
};

/**
 * Check if Corporate Account Has Available Budget for Booking
 */
export const checkBudgetAvailability = async (corporateAccountId, bookingAmount) => {
  const account = await findCorporateAccountById(corporateAccountId);
  if (!account || !account.budget_amount || parseFloat(account.budget_amount) === 0) {
    return { allowed: true };
  }

  const now = new Date();
  let startDate;

  if (account.budget_period === "monthly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (account.budget_period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const currentSpend = await getCorporateSpendInPeriod(corporateAccountId, startDate);
  const projectedSpend = currentSpend + parseFloat(bookingAmount);
  const budgetLimit = parseFloat(account.budget_amount);

  if (projectedSpend > budgetLimit) {
    return {
      allowed: false,
      reason: `Booking amount (₦${bookingAmount}) exceeds remaining corporate budget (₦${(
        budgetLimit - currentSpend
      ).toFixed(2)} remaining of ₦${budgetLimit}).`,
    };
  }

  return { allowed: true };
};

/**
 * Get Corporate Usage Report
 */
export const fetchUsageReport = async (adminUserId, { startDate, endDate }) => {
  const account = await findCorporateAccountByAdminId(adminUserId);
  if (!account) {
    const error = new Error("Corporate account not found.");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultEnd = new Date().toISOString();

  return await getCorporateUsageReport(account.id, {
    startDate: startDate || defaultStart,
    endDate: endDate || defaultEnd,
  });
};