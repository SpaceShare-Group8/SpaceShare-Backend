import db from "../common/config/db.js";

/**
 * Add workspace to favorites.
 * ON CONFLICT DO NOTHING makes re-favoriting the same workspace a no-op
 * instead of throwing a raw unique-constraint violation (the favorites
 * table has a UNIQUE(user_id, workspace_id) constraint).
 */
export const addFavorite = async (userId, workspaceId) => {
  const query = `
    INSERT INTO favorites (user_id, workspace_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, workspace_id) DO NOTHING
    RETURNING *;
  `;

  const { rows } = await db.query(query, [userId, workspaceId]);

  return rows[0] || null;
};

/**
 * Remove workspace from favorites
 */
export const removeFavorite = async (userId, workspaceId) => {
  const query = `
    DELETE FROM favorites
    WHERE user_id = $1
      AND workspace_id = $2
    RETURNING *;
  `;

  const { rows } = await db.query(query, [userId, workspaceId]);

  return rows[0];
};

/**
 * Get all favorites for a user.
 *
 * The workspaces table has no `location`, `price_per_hour`, or
 * `cover_image` columns — those don't exist on this schema. Price lives
 * in a separate workspace_pricing table (one row per pricing type:
 * hourly/daily/weekly), and photos live in workspace_photos, marked
 * with is_cover for the primary image. This pulls the hourly rate (if
 * set) and the cover photo via scalar subqueries, so each favorite
 * still returns one row.
 */
export const getUserFavorites = async (userId) => {
  const query = `
    SELECT
      f.id,
      f.created_at,
      w.id AS workspace_id,
      w.title,
      w.city,
      w.state,
      w.address,
      (
        SELECT wp.amount FROM workspace_pricing wp
        WHERE wp.workspace_id = w.id AND wp.pricing_type = 'hourly' AND wp.is_active = TRUE
        LIMIT 1
      ) AS price_hourly,
      (
        SELECT wph.photo_url FROM workspace_photos wph
        WHERE wph.workspace_id = w.id AND wph.is_cover = TRUE
        LIMIT 1
      ) AS cover_photo_url
    FROM favorites f
    JOIN workspaces w
      ON f.workspace_id = w.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC;
  `;

  const { rows } = await db.query(query, [userId]);

  return rows;
};
