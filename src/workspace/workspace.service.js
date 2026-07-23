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

export async function updateWorkspace(id, host_id, updates) {
    const allowedFields = [
        'title', 'description', 'workspace_type', 'capacity',
        'address', 'city', 'state', 'latitude', 'longitude',
    ];

    const setClauses = [];
    const values = [];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            values.push(updates[field]);
            setClauses.push(`${field} = $${values.length}`);
        }
    }

    if (setClauses.length === 0) {
        return { error: 'no_fields' };
    }

    values.push(id, host_id);

    const result = await pool.query(
        `UPDATE workspaces
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length - 1} AND host_id = $${values.length}
       RETURNING *`,
        values
    );

    if (result.rows.length === 0) {
        return { error: 'not_found_or_forbidden' };
    }

    return { data: result.rows[0] };
}

export async function deleteWorkspace(id, host_id) {
    const result = await pool.query(
        `DELETE FROM workspaces WHERE id = $1 AND host_id = $2 RETURNING id`,
        [id, host_id]
    );

    return result.rows.length > 0;
}

export async function addWorkspacePhoto(workspace_id, photo_url, cloudinary_public_id) {
    const result = await pool.query(
        `INSERT INTO workspace_photos (workspace_id, photo_url, cloudinary_public_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
        [workspace_id, photo_url, cloudinary_public_id]
    );

    return result.rows[0];
}