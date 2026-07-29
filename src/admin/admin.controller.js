import {
  getPendingHostVerifications,
  reviewHostVerification,
  getPendingWorkspaces,
  moderateWorkspace,
  getAllBookingsForAdmin,
  triggerManualRefund,
  getActiveDisputes,
  resolveDispute,
  getPlatformAnalytics,
} from "./admin.service.js";

/**
 * GET /api/admin/hosts/pending
 * Retrieve host profiles pending verification
 */
export const getPendingHosts = async (req, res) => {
  try {
    const pendingHosts = await getPendingHostVerifications();

    return res.status(200).json({
      success: true,
      count: pendingHosts.length,
      data: pendingHosts,
    });
  } catch (error) {
    console.error("Error in getPendingHosts controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending host verification list.",
    });
  }
};

/**
 * PATCH /api/admin/hosts/:userId/verify
 * Approve or reject a host profile
 */
export const verifyHost = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const updatedHost = await reviewHostVerification(userId, status);

    return res.status(200).json({
      success: true,
      message: `Host verification status updated to '${status}'.`,
      data: updatedHost,
    });
  } catch (error) {
    console.error("Error in verifyHost controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update host verification status.",
    });
  }
};

/**
 * GET /api/admin/workspaces/pending
 * Retrieve workspace listings pending moderation
 */
export const getPendingListings = async (req, res) => {
  try {
    const pendingWorkspaces = await getPendingWorkspaces();

    return res.status(200).json({
      success: true,
      count: pendingWorkspaces.length,
      data: pendingWorkspaces,
    });
  } catch (error) {
    console.error("Error in getPendingListings controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending workspace listings.",
    });
  }
};

/**
 * PATCH /api/admin/workspaces/:workspaceId/status
 * Moderate workspace listing (approve, reject, or suspend)
 */
export const moderateListing = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status } = req.body;

    const updatedWorkspace = await moderateWorkspace(workspaceId, status);

    return res.status(200).json({
      success: true,
      message: `Workspace listing status updated to '${status}'.`,
      data: updatedWorkspace,
    });
  } catch (error) {
    console.error("Error in moderateListing controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to moderate workspace listing.",
    });
  }
};

/**
 * GET /api/admin/bookings
 * Monitor platform bookings with optional status filtering
 */
export const getAdminBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const bookings = await getAllBookingsForAdmin(status);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Error in getAdminBookings controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve platform bookings.",
    });
  }
};

/**
 * POST /api/admin/refunds
 * Manually trigger a refund for a booking
 */
export const processManualRefund = async (req, res) => {
  try {
    const { bookingId, refundAmount, commissionAmount } = req.body;

    const refundTransaction = await triggerManualRefund(
      bookingId,
      refundAmount,
      commissionAmount
    );

    return res.status(201).json({
      success: true,
      message: "Manual refund processed successfully.",
      data: refundTransaction,
    });
  } catch (error) {
    console.error("Error in processManualRefund controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to process manual refund.",
    });
  }
};

/**
 * GET /api/admin/disputes
 * Retrieve active support disputes
 */
export const getDisputes = async (req, res) => {
  try {
    const disputes = await getActiveDisputes();

    return res.status(200).json({
      success: true,
      count: disputes.length,
      data: disputes,
    });
  } catch (error) {
    console.error("Error in getDisputes controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve active disputes.",
    });
  }
};

/**
 * PATCH /api/admin/disputes/:disputeId/resolve
 * Resolve an active dispute with admin tracking
 */
export const handleResolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { resolution } = req.body;
    const adminUserId = req.user?.id;

    const resolvedDispute = await resolveDispute(
      disputeId,
      resolution,
      adminUserId
    );

    return res.status(200).json({
      success: true,
      message: "Dispute resolved successfully.",
      data: resolvedDispute,
    });
  } catch (error) {
    console.error("Error in handleResolveDispute controller:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to resolve dispute.",
    });
  }
};

/**
 * GET /api/admin/analytics
 * Retrieve platform-wide KPIs and metrics
 */
export const getAnalytics = async (req, res) => {
  try {
    const analytics = await getPlatformAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error in getAnalytics controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve platform analytics.",
    });
  }
};