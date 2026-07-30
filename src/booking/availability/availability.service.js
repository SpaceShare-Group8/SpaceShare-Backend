import pool from "../../common/config/db.js";

export async function createAvailability(data) {
  const {
    workspace_id,
    date,
    start_time,
    end_time,
    is_blocked = true,
  } = data;

  const result = await pool.query(
    `
    INSERT INTO availability_calendars
    (workspace_id,date,start_time,end_time,is_blocked)
    VALUES($1,$2,$3,$4,$5)
    RETURNING *;
    `,
    [workspace_id, date, start_time, end_time, is_blocked]
  );

  return result.rows[0];
}

export async function getWorkspaceAvailability(
  workspaceId,
  startDate,
  endDate
) {
  const result = await pool.query(
    `
    SELECT *
    FROM availability_calendars
    WHERE workspace_id=$1
    AND date BETWEEN $2 AND $3
    ORDER BY date,start_time;
    `,
    [workspaceId, startDate, endDate]
  );

  return result.rows;
}

export async function updateAvailability(id, updates) {
  const allowedFields = [
    "date",
    "start_time",
    "end_time",
    "is_blocked",
  ];

  const values = [];
  const sets = [];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      values.push(updates[field]);
      sets.push(`${field}=$${values.length}`);
    }
  }

  if (!sets.length) {
    return { error: "no_fields" };
  }

  values.push(id);

  const result = await pool.query(
    `
    UPDATE availability_calendars
    SET ${sets.join(", ")},updated_at=NOW()
    WHERE id=$${values.length}
    RETURNING *;
    `,
    values
  );

  if (!result.rows.length) {
    return { error: "not_found" };
  }

  return { data: result.rows[0] };
}

export async function deleteAvailability(id) {
  const result = await pool.query(
    `
    DELETE FROM availability_calendars
    WHERE id=$1
    RETURNING id;
    `,
    [id]
  );

  return result.rows.length > 0;
}