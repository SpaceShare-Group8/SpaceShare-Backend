import pool from '../common/config/db.js';
import { recalculateWorkspaceReliability } from '../reliability/services/reliability.service.js';

/**
 * Seeker submits a post-booking review, including the two
 * structured Trust Engine questions. PRD Section 9.8, 10.3, 11.12
 */
export async function submitBookingReview(bookingId, reviewerId, payload) {
  const bookingResult = await pool.query(
    `SELECT b.*, hp.user_id AS host_user_id
     FROM bookings b
     JOIN workspaces w ON w.id = b.workspace_id
     JOIN host_profiles hp ON hp.id = w.host_id
     WHERE b.id = $1`,
    [bookingId]
  );
  const booking = bookingResult.rows[0];

  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  if (booking.seeker_id !== reviewerId) {
    const err = new Error('Unauthorized: only the seeker who made this booking can leave a review');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status !== 'completed') {
    const err = new Error('Booking must be completed before it can be reviewed');
    err.statusCode = 400;
    throw err;
  }

  const {
    overallRating,
    powerReliabilityRating,
    internetReliabilityRating,
    powerStable,
    internetAsDescribed,
    comment = null,
  } = payload;

  let review;
  try {
    const result = await pool.query(
      `INSERT INTO reviews (
         booking_id, reviewer_id, reviewee_id,
         overall_rating, power_reliability_rating, internet_reliability_rating,
         power_stable, internet_as_described, comment
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        bookingId,
        reviewerId,
        booking.host_user_id,
        overallRating,
        powerReliabilityRating,
        internetReliabilityRating,
        powerStable,
        internetAsDescribed,
        comment,
      ]
    );
    review = result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const dupErr = new Error('You have already submitted a review for this booking');
      dupErr.statusCode = 409;
      throw dupErr;
    }
    throw err;
  }

  const reliability = await recalculateWorkspaceReliability(booking.workspace_id);

  return { review, reliability };
}