import pool from '../common/config/db.js';

export async function createWorkspace(data) {
  const {
    host_id,
    title,
    description,
    workspace_type,
    capacity,
    address,
    city,
    state,
    latitude,
    longitude,
  } = data;

  const result = await pool.query(
    `INSERT INTO workspaces
      (host_id, title, description, workspace_type, capacity, address, city, state, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [host_id, title, description, workspace_type, capacity, address, city, state, latitude, longitude]
  );

  return result.rows[0];
}