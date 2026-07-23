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

export async function getWorkspaceById(id) {
    const result = await pool.query(
      `SELECT * FROM workspaces WHERE id = $1`,
      [id]
    );
  
    return result.rows[0] || null;
  }
  
  export async function listWorkspaces({ page = 1, limit = 10, city, workspace_type }) {
    const offset = (page - 1) * limit;
  
    const conditions = [];
    const values = [];
  
    if (city) {
      values.push(city);
      conditions.push(`city = $${values.length}`);
    }
  
    if (workspace_type) {
      values.push(workspace_type);
      conditions.push(`workspace_type = $${values.length}`);
    }
  
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
    values.push(limit, offset);
  
    const result = await pool.query(
      `SELECT * FROM workspaces
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
  
    return result.rows;
  }