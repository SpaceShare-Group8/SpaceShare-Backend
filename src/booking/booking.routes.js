/**
 * SpaceShare - Booking Express Routes
 * Maps API endpoints to controller handlers with JWT protection,
 * role authorization, and express-validator middlewares.
 * 
 * Aligns strictly with SpaceShare Master PRD (Section 11.2, 11.7, 11.11, & 16.4)
 */

import express from 'express';
import {
  createBooking,
  getBookingById,
  getUserBookings,
  acceptBookingRequest,
  declineBookingRequest,
  cancelBooking,
  extendBooking,
  checkIn,
} from './booking.controller.js';

import {
  validateCreateBooking,
  validateCheckIn,
  validateBookingIdParam,
} from './booking.validation.js';

// Auth middleware import
import { protect, authorize } from '../common/middleware/auth.middleware.js';

const router = express.Router();

/**
 * All booking routes require an authenticated user
 */
router.use(protect);

/**
 * @route   POST /api/bookings
 * @desc    Create a new workspace booking (Instant or Request-to-Book)
 * @access  Private (Workspace Seeker, Corporate Employee)
 */
router.post(
  '/',
  authorize('seeker', 'corporate_admin', 'corporate_employee'),
  validateCreateBooking,
  createBooking
);

/**
 * @route   GET /api/bookings
 * @desc    List bookings for current user (Booking History)
 * @access  Private (Seeker, Host, Admin)
 */
router.get(
  '/',
  getUserBookings
);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get detailed information for a specific booking
 * @access  Private (Seeker who booked, Host of space, or Admin)
 */
router.get(
  '/:id',
  validateBookingIdParam,
  getBookingById
);

/**
 * @route   PATCH /api/bookings/:id/accept
 * @desc    Host accepts a Request-to-Book reservation
 * @access  Private (Host)
 */
router.patch(
  '/:id/accept',
  authorize('host'),
  validateBookingIdParam,
  acceptBookingRequest
);

/**
 * @route   PATCH /api/bookings/:id/decline
 * @desc    Host declines a Request-to-Book reservation
 * @access  Private (Host)
 */
router.patch(
  '/:id/decline',
  authorize('host'),
  validateBookingIdParam,
  declineBookingRequest
);

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @desc    Cancel a confirmed booking
 * @access  Private (Seeker or Host associated with the booking)
 */
router.patch(
  '/:id/cancel',
  validateBookingIdParam,
  cancelBooking
);

/**
 * @route   PATCH /api/bookings/:id/extend
 * @desc    Extend an in-progress booking with additional time
 * @access  Private (Seeker who made the booking)
 */
router.patch(
  '/:id/extend',
  validateBookingIdParam,
  extendBooking
);
/**
 * @route   POST /api/bookings/:id/checkin
 * @desc    Verify 6-digit check-in code and update status to IN_PROGRESS
 * @access  Private (Host)
 */
router.post(
  '/:id/checkin',
  authorize('host'),
  validateCheckIn,
  checkIn
);
export default router;