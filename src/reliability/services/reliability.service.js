import pool from '../../common/config/db.js';

const RELIABILITY_FLAG_THRESHOLD = parseFloat(process.env.RELIABILITY_FLAG_THRESHOLD || '50');
const MIN_REVIEWS_FOR_FLAGGING = parseInt(process.env.RELIABILITY_MIN_REVIEWS || '5', 10);

/**
 * Recalculate a workspace's reliability score from Tier 2
 * community-verified reviews (power_stable + internet_as_described)
 * and persist it on the workspace record.
 * PRD Section 10.3
 */
export async function recalculateWorkspaceReliability(workspaceId) {
  const scoreResult = await pool.query(
    `SELECT
       ROUND(AVG(
         CASE
           WHEN r.power_stable = true AND r.internet_as_described = true THEN 100.0
           WHEN r.power_stable = true OR r.internet_as_described = true THEN 50.0
           ELSE 0.0
         END
       ), 2) AS avg_score,
       COUNT(*)::int AS review_count
     FROM reviews r
     JOIN bookings b ON b.id = r.booking_id
     WHERE b.workspace_id = $1
       AND r.power_stable IS NOT NULL
       AND r.internet_as_described IS NOT NULL`,
    [workspaceId]
  );

  const { avg_score, review_count } = scoreResult.rows[0];
  const reliabilityScore = avg_score !== null ? parseFloat(avg_score) : 0;

  await pool.query(
    `UPDATE workspaces
     SET reliability_score = $1, review_count = $2, updated_at = NOW()
     WHERE id = $3`,
    [reliabilityScore, review_count, workspaceId]
  );

  const flagResult = await checkAndFlagWorkspace(workspaceId, reliabilityScore, review_count);

  return {
    workspaceId,
    reliabilityScore,
    reviewCount: review_count,
    ...flagResult,
  };
}

/**
 * Auto-flag (or auto-clear) a workspace for Admin review based on
 * its current reliability score. PRD Section 11.4a / 11.15
 */
export async function checkAndFlagWorkspace(workspaceId, score, reviewCount) {
  const workspaceResult = await pool.query(
    `SELECT flagged_for_review, title FROM workspaces WHERE id = $1`,
    [workspaceId]
  );
  const workspace = workspaceResult.rows[0];
  if (!workspace) return { flagged: false };

  const shouldFlag = reviewCount >= MIN_REVIEWS_FOR_FLAGGING && score < RELIABILITY_FLAG_THRESHOLD;

  // Newly drops below threshold -> flag it
  if (shouldFlag && !workspace.flagged_for_review) {
    const reason = `Reliability score (${score}) dropped below the ${RELIABILITY_FLAG_THRESHOLD} threshold across ${reviewCount} reviews.`;

    await pool.query(
      `UPDATE workspaces
       SET flagged_for_review = TRUE, flagged_at = NOW(), flag_reason = $1
       WHERE id = $2`,
      [reason, workspaceId]
    );

    await notifyAdminsOfFlag(workspaceId, workspace.title, reason);

    return { flagged: true, flagReason: reason };
  }

  // Recovered above threshold -> auto-clear the flag
  if (!shouldFlag && workspace.flagged_for_review) {
    await pool.query(
      `UPDATE workspaces
       SET flagged_for_review = FALSE, flagged_at = NULL, flag_reason = NULL
       WHERE id = $1`,
      [workspaceId]
    );
    return { flagged: false, unflagged: true };
  }

  return { flagged: workspace.flagged_for_review };
}

async function notifyAdminsOfFlag(workspaceId, workspaceTitle, reason) {
  const adminsResult = await pool.query(
    `SELECT id FROM users WHERE role IN ('admin', 'platform_admin')`
  );

  await Promise.all(
    adminsResult.rows.map((admin) =>
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, payload)
         VALUES ($1, $2, $3, 'system', $4)`,
        [
          admin.id,
          'Listing flagged for reliability review',
          `"${workspaceTitle}" was auto-flagged: ${reason}`,
          JSON.stringify({ workspaceId, reason }),
        ]
      )
    )
  );
}