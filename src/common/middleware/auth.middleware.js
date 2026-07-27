import { verifyAccessToken } from "../utils/jwt.js";
import {
  findUserById,
  findHostProfileByUserId,
} from "../../auth/auth.repository.js";

/**
 * Protect routes
 * Verifies JWT, validates active user account,
 * and attaches authenticated user to the request.
 *
 * PRD Sections:
 * - 11.1 Authentication
 * - 11.2 Authorization
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

    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
      });
    }

    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roles: [user.role], // Keeps middleware compatible if multiple roles are introduced later
    };

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

/**
 * Role Authorization Middleware
 *
 * Usage:
 * authorize("admin")
 * authorize("host")
 * authorize("host", "admin")
 *
 * PRD Section 9
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in first.",
      });
    }

    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.role];

    const hasPermission = allowedRoles.some((role) =>
      userRoles.includes(role)
    );

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
 * Require Verified Host Middleware
 *
 * Used on endpoints where only verified Hosts
 * are allowed to perform actions.
 *
 * PRD Sections:
 * - 10.2 Host Verification
 * - 11.5 Host Authorization
 * - Section 14 Database Schema
 */
export const requireVerifiedHost = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "host") {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Host account required.",
      });
    }

    const hostProfile = await findHostProfileByUserId(req.user.id);

    if (!hostProfile) {
      return res.status(404).json({
        success: false,
        message: "Host profile not found.",
      });
    }

    const verificationStatus =
      hostProfile.verification_status || "pending";

    const isVerified =
      verificationStatus === "approved" ||
      verificationStatus === "verified";

    if (!isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Host account is pending verification by Platform Admin.",
        verification_status: verificationStatus,
      });
    }

    req.hostProfile = hostProfile;

    next();
  } catch (error) {
    console.error("Verified host middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying host status.",
    });
  }
};