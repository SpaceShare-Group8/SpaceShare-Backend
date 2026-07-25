import { verifyAccessToken } from "../utils/jwt.js";
import { findUserById, findHostProfileByUserId } from "../../auth/auth.repository.js";

/**
 * Protect routes - verifies JWT and attaches current user context
 * PRD Section 11.1 & 11.2
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Token missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    // 1. Verify JWT Token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // 2. Retrieve user from database
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    // 3. Normalize roles into a guaranteed Array (Supports single string or array)
    const normalizedRoles = Array.isArray(user.roles)
      ? user.roles
      : user.role
      ? [user.role]
      : ["seeker"];

    // 4. Fetch Host verification status if user holds 'host' role
    let hostVerificationStatus = null;
    if (normalizedRoles.includes("host")) {
      const hostProfile = await findHostProfileByUserId(user.id);
      hostVerificationStatus = hostProfile?.verification_status ?? "pending";
    }

    // 5. Attach structured user payload to request object
    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      roles: normalizedRoles,
      verification_status: hostVerificationStatus,
    };

    next();
  } catch (error) {
    // Catch unexpected database or server errors
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
      error: error.message,
    });
  }
};

/**
 * Authorize roles
 * PRD Section 9: Supports single or multi-role checking
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in first.",
      });
    }

    const userRoles = req.user.roles || [];
    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Insufficient role permissions.",
      });
    }

    next();
  };
};

/**
 * Require a verified host account
 * PRD Section 10.2, 11.5 & Section 14 Schema
 */
export const requireVerifiedHost = (req, res, next) => {
  if (!req.user || !req.user.roles.includes("host")) {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Requires host role.",
    });
  }

  // PRD Statuses: 'approved' or 'verified'
  const isApproved =
    req.user.verification_status === "approved" ||
    req.user.verification_status === "verified";

  if (!isApproved) {
    return res.status(403).json({
      success: false,
      message: "Host account is pending verification by Platform Admin.",
      verification_status: req.user.verification_status,
    });
  }

  next();
};
