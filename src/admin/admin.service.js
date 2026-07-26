/* Repository imports */
import {
  findPendingHostProfiles,
  updateHostVerificationStatus,
  findPendingWorkspaces,
  updateWorkspaceStatus,
  findAllBookingsAdmin,
  executeManualRefund,
  findActiveDisputes,
  resolveDisputeRecord,
  getPlatformAnalyticsMetrics,
} from "./admin.repository.js";

/* Fetch pending host verifications */
export const getPendingHostVerifications = async () => {
  return await findPendingHostProfiles();
};

/* Approve or reject a host profile verification request */
export const reviewHostVerification = async (userId, status) => {
  const validStatuses = ["approved", "rejected"];
  if (!validStatuses.includes(status)) {
    const error = new Error("Invalid verification status. Must be 'approved' or 'rejected'.");
    error.statusCode = 400;
    throw error;
  }

  const updatedHost = await updateHostVerificationStatus(userId, status);
  if (!updatedHost) {
    const error = new Error("Host profile not found or already processed.");
    error.statusCode = 404;
    throw error;
  }

  return updatedHost;
};

/* Fetch workspace listings pending admin moderation */
export const getPendingWorkspaces = async () => {
  return await findPendingWorkspaces();
};

/* Moderate a workspace listing (approve, reject, or suspend) */
export const moderateWorkspace = async (workspaceId, status) => {
  const validStatuses = ["approved", "rejected", "suspended"];
  if (!validStatuses.includes(status)) {
    const error = new Error("Invalid workspace status. Must be 'approved', 'rejected', or 'suspended'.");
    error.statusCode = 400;
    throw error;
  }

  const updatedWorkspace = await updateWorkspaceStatus(workspaceId, status);
  if (!updatedWorkspace) {
    const error = new Error("Workspace listing not found.");
    error.statusCode = 404;
    throw error;
  }

  return updatedWorkspace;
};

/* Fetch all platform bookings for live monitoring */
export const getAllBookingsForAdmin = async (statusFilter) => {
  return await findAllBookingsAdmin(statusFilter);
};

/* Manually trigger a refund for a booking outside standard automated rules */
export const triggerManualRefund = async (bookingId, refundAmount, commissionAmount = 0) => {
  if (!bookingId || refundAmount === undefined || refundAmount <= 0) {
    const error = new Error("Valid bookingId and positive refundAmount are required.");
    error.statusCode = 400;
    throw error;
  }

  return await executeManualRefund(bookingId, refundAmount, commissionAmount);
};

/* Fetch active/unresolved support disputes */
export const getActiveDisputes = async () => {
  return await findActiveDisputes();
};

/* Resolve an active dispute and attach admin accountability tracking */
export const resolveDispute = async (disputeId, resolution, adminUserId) => {
  if (!resolution) {
    const error = new Error("Resolution summary is required.");
    error.statusCode = 400;
    throw error;
  }

  const resolved = await resolveDisputeRecord(disputeId, resolution, adminUserId);
  if (!resolved) {
    const error = new Error("Dispute record not found.");
    error.statusCode = 404;
    throw error;
  }

  return resolved;
};

/* Retrieve platform-wide KPIs and analytics */
export const getPlatformAnalytics = async () => {
  return await getPlatformAnalyticsMetrics();
};