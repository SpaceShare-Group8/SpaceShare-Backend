import { verifyAccessToken } from "../utils/jwt.js";
import { findUserById,findHostProfileByUserId } from "../../auth/auth.repository.js";

/**
 * Protect routes.
 * Verifies the JWT Access Token and attaches the authenticated user
 * to the request object.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify JWT
    const decoded = verifyAccessToken(token);

    // Fetch user from database
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // Fetch host profile if the user is a host
    let hostProfile = null;

    if (user.role === "host") {
      hostProfile = await findHostProfileByUserId(user.id);
    }

    // Attach authenticated user to request
    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_verified: user.is_verified,
      verification_status:
        hostProfile?.verification_status ?? null,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};

/**
 * Role-Based Access Control (RBAC)
 *
 * Usage:
 * authorize("host")
 * authorize("admin")
 * authorize("host", "admin")
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to perform this action.",
      });
    }
    
    next();
  };
};

// Require a verified host account

export const requireVerifiedHost = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (req.user.role !== "host") {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Only hosts can access this resource.",
    });
  }

  if (req.user.verification_status !== "verified") {
    return res.status(403).json({
      success: false,
      message: "Your host account is not yet verified.",
    });
  }

  next();
};