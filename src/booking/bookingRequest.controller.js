/**
 * @file src/bookings/bookingRequest.controller.js
 * @description Express controller handling Host-side Request-to-Book lifecycle actions
 * (accepting/declining pending requests) and cancellation flows for SpaceShare.
 * 
 * Aligns with SpaceShare PRD Sections 11.7, 16.4, and 17.3.
 */

const bookingRequestService = require('./bookingRequest.service');

/**
 * Accept a pending booking request.
 * 
 * @route   PATCH /api/bookings/:id/accept
 * @access  Private (Host only)
 */
const acceptBookingRequest = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required in request parameters.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User context is missing.',
      });
    }

    const hostUserId = req.user.id;

    const updatedBooking = await bookingRequestService.acceptBookingRequest({
      bookingId,
      hostUserId,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking request accepted successfully.',
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Decline a pending booking request.
 * 
 * @route   PATCH /api/bookings/:id/decline
 * @access  Private (Host only)
 */
const declineBookingRequest = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required in request parameters.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User context is missing.',
      });
    }

    const hostUserId = req.user.id;
    const { reason } = req.body || {};

    const updatedBooking = await bookingRequestService.declineBookingRequest({
      bookingId,
      hostUserId,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking request declined successfully.',
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a pending or confirmed booking (Seeker or Host).
 * 
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private (Seeker or Host)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required in request parameters.',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. User context is missing.',
      });
    }

    const userId = req.user.id;
    const { reason } = req.body || {};

    const cancelledBooking = await bookingRequestService.cancelBooking({
      bookingId,
      userId,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: cancelledBooking,
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  acceptBookingRequest,
  declineBookingRequest,
  cancelBooking,
};