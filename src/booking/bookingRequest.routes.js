/**
 * @file src/bookings/bookingRequest.routes.js
 * @description Express router for Host-side Request-to-Book lifecycle management 
 * and cancellation flows for the SpaceShare platform.
 * 
 * Aligns with SpaceShare PRD Sections 11.2, 11.7, and 16.4 API specification.
 */

const express = require('express');
const router = express.Router();

const bookingRequestController = require('./bookingRequest.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

/**
 * @route   PATCH /api/bookings/:id/accept
 * @access  Private (Host)
 */
router.patch(
  '/:id/accept',
  authenticate,
  authorize('host'),
  bookingRequestController.acceptBookingRequest
);

/**
 * @route   PATCH /api/bookings/:id/decline
 * @access  Private (Host)
 */
router.patch(
  '/:id/decline',
  authenticate,
  authorize('host'),
  bookingRequestController.declineBookingRequest
);

/**
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private (Seeker / Host)
 */
router.patch(
  '/:id/cancel',
  authenticate,
  bookingRequestController.cancelBooking
);

module.exports = router;