import { verifyAccessToken } from "../utils/jwt.js";
import { findUserById, findHostProfileByUserId } from "../../auth/auth.repository.js";

/**
 * Protect routes - verifies JWT and attaches current user context.
 * Performs a single database lookup for active account validation.
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

    // 1. Verify JWT Token signature and expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    // 2. Retrieve user from database to ensure account still exists
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    // 3. Normalize roles into a guaranteed Array
    const normalizedRoles = Array.isArray(user.roles)
      ? user.roles
      : user.role
      ? [user.role]
      : ["seeker"];

    // 4. Attach structured user payload to request object
    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      roles: normalizedRoles,
    };

    return next();
  } catch (error) {
    console.error("Authentication error in protect middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
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

    return next();
  };
};

/**
 * Require a verified host account
 * Fetches host status on-demand only when a route requires host verification.
 * PRD Section 10.2, 11.5 & Section 14 Schema
 */
export const requireVerifiedHost = async (req, res, next) => {
  try {
    if (!req.user || !req.user.roles.includes("host")) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Requires host role.",
      });
    }

    // On-demand database lookup for host profile
    const hostProfile = await findHostProfileByUserId(req.user.id);
    const verificationStatus = hostProfile?.verification_status ?? "pending";

    // PRD Statuses: 'approved' or 'verified'
    const isApproved =
      verificationStatus === "approved" || verificationStatus === "verified";

    if (!isApproved) {
      return res.status(403).json({
        success: false,
        message: "Host account is pending verification by Platform Admin.",
        verification_status: verificationStatus,
      });
    }

    req.hostProfile = hostProfile;
    return next();
  } catch (error) {
    console.error("Error in requireVerifiedHost middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying host status.",
    });
  }
};
