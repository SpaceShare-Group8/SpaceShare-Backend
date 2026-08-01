/**
 * SpaceShare - Booking Controller
 * Bridges Express HTTP requests and booking service logic.
 * 
 * Implements PRD Section 10.5, 10.7, 11.7, 11.11, and 16.4 API endpoints.
 */

import * as bookingService from './booking.service.js';

/**
 * Create a new booking (Instant or Request-to-Book)
 * POST /api/bookings
 */
export const createBooking = async (req, res, next) => {
  try {
    const seekerId = req.user.id; // Extracted from JWT auth middleware
    const { workspaceId, startTime, endTime, totalAmount, corporateAccountId } = req.body;

    const bookingData = {
      workspaceId,
      seekerId,
      startTime,
      endTime,
      totalAmount,
      corporateAccountId: corporateAccountId || null,
    };

    const booking = await bookingService.createBooking(bookingData);

    return res.status(201).json({
      status: 'success',
      message: booking.mode === 'instant' 
        ? 'Booking created successfully. Pending payment confirmation.' 
        : 'Booking request submitted. Awaiting host approval.',
      data: { booking },
    });
  } catch (error) {
    if (
      error.message.includes('already booked') ||
      error.message.includes('unavailable') ||
      error.message.includes('no longer available')
    ) {
      return res.status(409).json({
        status: 'error',
        message: error.message,
      });
    }
    if (error.message.includes('budget exceeded') || error.message.includes('not authorized')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Get details of a single booking by ID
 * GET /api/bookings/:id
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const booking = await bookingService.getBookingById(id, userId, userRole);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found',
      });
    }
    return res.status(200).json({
      status: 'success',
      data: { booking },
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * List bookings for the authenticated user (Booking History)
 * GET /api/bookings
 */
export const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { role, status, page = 1, limit = 10 } = req.query;

    const result = await bookingService.getUserBookings({
      userId,
      role: role || req.user.role,
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return res.status(200).json({
      status: 'success',
      data: result.bookings,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Host accepts a Request-to-Book booking
 * PATCH /api/bookings/:id/accept
 */
export const acceptBookingRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hostId = req.user.id;

    const booking = await bookingService.acceptBookingRequest(id, hostId);

    return res.status(200).json({
      status: 'success',
      message: 'Booking request accepted successfully',
      data: { booking },
    });
  } catch (error) {
    if (error.message.includes('expired') || error.message.includes('invalid status')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Host declines a Request-to-Book booking
 * PATCH /api/bookings/:id/decline
 */
export const declineBookingRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hostId = req.user.id;
    const { reason } = req.body;

    const booking = await bookingService.declineBookingRequest(id, hostId, reason);

    return res.status(200).json({
      status: 'success',
      message: 'Booking request declined',
      data: { booking },
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Seeker or Host cancels a confirmed booking
 * PATCH /api/bookings/:id/cancel
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const cancellation = await bookingService.cancelBooking(id, userId, reason);

    return res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: cancellation,
    });
  } catch (error) {
    if (error.message.includes('cannot be cancelled')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Seeker extends an in-progress booking into additional time
 * PATCH /api/bookings/:id/extend
 */
export const extendBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { newEndTime } = req.body;

    const booking = await bookingService.extendBooking(id, userId, newEndTime);

    return res.status(200).json({
      status: 'success',
      message: 'Booking extended successfully',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 6-digit check-in code and mark booking as IN_PROGRESS
 * POST /api/bookings/:id/checkin
 */
export const checkIn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkinCode } = req.body;
    const hostId = req.user.id;

    const result = await bookingService.verifyAndCheckIn(id, checkinCode, hostId);

    return res.status(200).json({
      status: 'success',
      message: 'Check-in verified successfully. Session is now In Progress.',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('locked')) {
      return res.status(429).json({
        status: 'error',
        message: error.message,
      });
    }
    if (error.message.includes('Invalid check-in code')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};