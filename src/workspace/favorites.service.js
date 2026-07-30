import pool from "../common/config/db.js";

export async function addFavorite(user_id, workspace_id) {
  const result = await pool.query(
    `
    INSERT INTO favorites (user_id, workspace_id)
    VALUES ($1, $2)
    RETURNING *;
    `,
    [user_id, workspace_id],
  );

  return result.rows[0];
}

export async function removeFavorite(user_id, workspace_id) {
  const result = await pool.query(
    `
    DELETE FROM favorites
    WHERE user_id = $1
      AND workspace_id = $2
    RETURNING *;
    `,
    [user_id, workspace_id],
  );

  return result.rows[0];
}

export async function getFavorites(user_id) {
  const result = await pool.query(
    `
    SELECT
      f.id,
      f.created_at,
      w.id AS workspace_id,
      w.title,
      w.description,
      w.workspace_type,
      w.city,
      w.state
    FROM favorites f
    JOIN workspaces w
      ON f.workspace_id = w.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC;
    `,
    [user_id],
  );

  return result.rows;
}
