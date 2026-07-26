/* Service imports */
import {
  provisionCorporateAccount,
  dispatchEmployeeInvite,
  updateBudget,
  fetchUsageReport,
} from "./corporate.service.js";

/*
 * POST /api/corporate/accounts
 * Provision a new Corporate Workspace Account
 */
export const createAccount = async (req, res) => {
  try {
    const { company_name, budget_amount, budget_period } = req.body;

    if (!company_name) {
      return res.status(400).json({
        success: false,
        message: "company_name is required.",
      });
    }

    const corporateAccount = await provisionCorporateAccount(req.user.id, {
      company_name,
      budget_amount,
      budget_period,
    });

    return res.status(201).json({
      success: true,
      message: "Corporate workspace account provisioned successfully.",
      data: corporateAccount,
    });
  } catch (error) {
    console.error("Error in createAccount controller:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to provision corporate account.",
    });
  }
};

/*
 * PATCH /api/corporate/budget
 * Update Corporate Spending Budget Limits and Period
 */
export const updateCorporateBudget = async (req, res) => {
  try {
    const { budget_amount, budget_period } = req.body;

    if (budget_amount === undefined && !budget_period) {
      return res.status(400).json({
        success: false,
        message: "At least one field (budget_amount or budget_period) is required for update.",
      });
    }

    const updatedAccount = await updateBudget(req.user.id, {
      budget_amount,
      budget_period,
    });

    return res.status(200).json({
      success: true,
      message: "Corporate account budget updated successfully.",
      data: updatedAccount,
    });
  } catch (error) {
    console.error("Error in updateCorporateBudget controller:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update corporate budget.",
    });
  }
};

/*
 * POST /api/corporate/employees
 * Dispatch an Employee Invitation Token Link
 */
export const inviteEmployee = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Employee email is required.",
      });
    }

    const host = req.get("host");
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const dispatchResult = await dispatchEmployeeInvite(req.user.id, email, baseUrl);

    return res.status(200).json({
      success: true,
      message: "Employee invitation link generated and dispatched successfully.",
      data: dispatchResult,
    });
  } catch (error) {
    console.error("Error in inviteEmployee controller:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to dispatch employee invitation.",
    });
  }
};

/*
 * GET /api/corporate/reports
 * Fetch Corporate Workspace Spending and Usage Analytics
 */
export const getUsageReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const reportData = await fetchUsageReport(req.user.id, {
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Corporate usage report generated successfully.",
      data: reportData,
    });
  } catch (error) {
    console.error("Error in getUsageReport controller:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to generate corporate usage report.",
    });
  }
};