import db from "../common/config/db.js";

/**
 * Add workspace to favorites
 */
export const addFavorite = async (userId, workspaceId) => {
  const query = `
    INSERT INTO favorites (user_id, workspace_id)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const { rows } = await db.query(query, [userId, workspaceId]);

  return rows[0];
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
 * Get all favorites for a user
 */
export const getUserFavorites = async (userId) => {
  const query = `
    SELECT
      f.id,
      f.created_at,
      w.id AS workspace_id,
      w.title,
      w.location,
      w.price_per_hour,
      w.cover_image
    FROM favorites f
    JOIN workspaces w
      ON f.workspace_id = w.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC;
  `;

  const { rows } = await db.query(query, [userId]);

  return rows;
};
