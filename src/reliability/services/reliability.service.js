import pool from '../../common/config/db.js';

// PRD acceptance criterion: "Given a listing has fewer than 5 completed
// bookings, then it is labelled 'New listing — limited reliability data'
// instead of showing a potentially misleading score." Without this gate,
// a brand-new listing with zero reviews would show a reliability score
// of 0 — indistinguishable from a listing that's been reviewed and
// found unreliable, which is exactly the misleading outcome the PRD
// calls out.
const MIN_COMPLETED_BOOKINGS_FOR_SCORE = 5;

/**
 * Computes a workspace's community-verified reliability score.
 * Score = average of (power_stable, internet_as_described) across all
 * reliability_reviews tied to that workspace's bookings, expressed as a
 * percentage (0-100).
 */
export async function getWorkspaceReliabilityScore(workspaceId) {
    const workspaceCheck = await pool.query('SELECT id FROM workspaces WHERE id = $1', [workspaceId]);
    if (workspaceCheck.rows.length === 0) {
        const error = new Error('Workspace not found');
        error.statusCode = 404;
        throw error;
    }

    const result = await pool.query(
        `WITH stats AS (
            SELECT COUNT(*) FILTER (WHERE b.status = 'completed') AS completed_bookings_count
            FROM bookings b
            WHERE b.workspace_id = $1
        ),
        reviews AS (
            SELECT
                COUNT(*) AS review_count,
                COALESCE(AVG(
                    (CASE WHEN rr.power_stable THEN 1 ELSE 0 END +
                     CASE WHEN rr.internet_as_described THEN 1 ELSE 0 END) / 2.0
                ) * 100, 0) AS reliability_score
            FROM bookings b
            JOIN reliability_reviews rr ON rr.booking_id = b.id
            WHERE b.workspace_id = $1
        )
        SELECT * FROM stats, reviews`,
        [workspaceId]
    );

    const row = result.rows[0];
    const completedBookingsCount = Number(row.completed_bookings_count);
    const reviewCount = Number(row.review_count);

    if (completedBookingsCount < MIN_COMPLETED_BOOKINGS_FOR_SCORE) {
        return {
            workspace_id: workspaceId,
            completed_bookings_count: completedBookingsCount,
            review_count: reviewCount,
            reliability_score: null,
            label: 'New listing — limited reliability data',
        };
    }

    return {
        workspace_id: workspaceId,
        completed_bookings_count: completedBookingsCount,
        review_count: reviewCount,
        reliability_score: Math.round(Number(row.reliability_score) * 10) / 10,
        label: null,
    };
}
