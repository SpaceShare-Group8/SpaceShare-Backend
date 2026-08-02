import db from "../common/config/db.js";

/**
 * Save a search term
 */
export const saveSearch = async (userId, searchTerm) => {
  const query = `
    INSERT INTO search_history (user_id, search_term)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const { rows } = await db.query(query, [userId, searchTerm]);

  return rows[0];
};

/**
 * Get a user's search history
 */
export const getSearchHistory = async (userId) => {
  const query = `
    SELECT
      id,
      search_term,
      created_at
    FROM search_history
    WHERE user_id = $1
    ORDER BY created_at DESC;
  `;

  const { rows } = await db.query(query, [userId]);

  return rows;
};

/**
 * Clear all search history for a user
 */
export const clearSearchHistory = async (userId) => {
  const query = `
    DELETE FROM search_history
    WHERE user_id = $1;
  `;

  await db.query(query, [userId]);

  return {
    success: true,
    message: "Search history cleared successfully.",
  };
};
