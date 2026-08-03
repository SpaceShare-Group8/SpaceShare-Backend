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
      (host_id, title, description, workspace_type, capacity, address, city, state, latitude, longitude, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
        [host_id, title, description, workspace_type, capacity, address, city, state, latitude, longitude, 'draft']
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

export async function listWorkspaces({
  page = 1,
  limit = 10,

  city,
  workspace_type,

  date,
 start_time,
  end_time,

  minPrice,
  maxPrice,

  amenities,

  minCapacity,

  minReliabilityScore,

  latitude,
  longitude,
}) {
  const offset = (page - 1) * limit;

  const values = [];
  const where = [];
  const having = [];

  
  // Distance (Haversine)
  let distanceSelect = "";

  if (latitude && longitude) {
    values.push(latitude);
    const latIndex = values.length;

    values.push(longitude);
    const lngIndex = values.length;

    distanceSelect = `
,
(
6371 * acos(
cos(radians($${latIndex}))
*
cos(radians(w.latitude))
*
cos(
radians(w.longitude)
-
radians($${lngIndex})
)
+
sin(radians($${latIndex}))
*
sin(radians(w.latitude))
)
)
AS distance
`;
  }

  // SELECT
  let query = `
SELECT

w.id,
w.title,
w.description,
w.workspace_type,
w.capacity,
w.address,
w.city,
w.state,
w.latitude,
w.longitude,
w.status,

wp.pricing_type,
wp.amount,

ARRAY_REMOVE(
ARRAY_AGG(DISTINCT wa.amenity_name),
NULL
) AS amenities,

COALESCE(
AVG(
(
r.power_reliability_rating +
r.internet_reliability_rating
) / 2.0
),
0
) AS reliability_score

${distanceSelect}

FROM workspaces w

LEFT JOIN workspace_pricing wp
ON wp.workspace_id = w.id
AND wp.is_active = TRUE

LEFT JOIN workspace_amenities wa
ON wa.workspace_id = w.id

LEFT JOIN availability_calendars ac
ON ac.workspace_id = w.id

LEFT JOIN bookings bk
ON bk.workspace_id = w.id

LEFT JOIN reviews r
ON r.booking_id = bk.id
`;

  
  // Base filters
  where.push(`w.status='published'`);

  if (city) {
    values.push(city);
    where.push(`LOWER(w.city)=LOWER($${values.length})`);
  }

  if (workspace_type) {
    values.push(workspace_type);
    where.push(`w.workspace_type=$${values.length}`);
  }

  if (minCapacity) {
    values.push(minCapacity);
    where.push(`w.capacity >= $${values.length}`);
  }

  
  // Pricing
  if (minPrice) {
    values.push(minPrice);
    where.push(`wp.amount >= $${values.length}`);
  }

  if (maxPrice) {
    values.push(maxPrice);
    where.push(`wp.amount <= $${values.length}`);
  }

  
  // Amenities
  if (amenities) {
    const amenityArray = Array.isArray(amenities)
      ? amenities
      : amenities.split(",");

    values.push(amenityArray);

    where.push(`
wa.amenity_name = ANY($${values.length})
`);
  }

  
  // Availability
  if (date) {
    values.push(date);

    where.push(`
ac.date=$${values.length}
`);

    where.push(`
ac.is_blocked=FALSE
`);
  }

  if (start_time && end_time) {
    values.push(start_time);
    const startIndex = values.length;

    values.push(end_time);
    const endIndex = values.length;

    where.push(`
ac.start_time <= $${startIndex}
AND
ac.end_time >= $${endIndex}
`);
  }

  
  // Prevent booking overlaps
    if (date && start_time && end_time) {
    values.push(`${date} ${start_time}`);
    const bookingStart = values.length;

    values.push(`${date} ${end_time}`);
    const bookingEnd = values.length;

    where.push(`
NOT EXISTS(
SELECT 1
FROM bookings b
WHERE b.workspace_id=w.id
AND b.status IN(
'pending',
'confirmed',
'in_progress'
)
AND(
b.start_time < $${bookingEnd}
AND
b.end_time > $${bookingStart}
)
)
`);
  }

  
  // WHERE
    if (where.length) {
    query += `
WHERE
${where.join("\nAND\n")}
`;
  }

  
  // GROUP BY
  

  query += `
GROUP BY

w.id,
wp.pricing_type,
wp.amount
`;

  
  // Reliability filter
    if (minReliabilityScore) {
    values.push(minReliabilityScore);

    having.push(`
COALESCE(
AVG(
(
r.power_reliability_rating +
r.internet_reliability_rating
)/2.0
),
0
)
>=
$${values.length}
`);
  }

  
  // HAVING
    if (having.length) {
    query += `
HAVING
${having.join("\nAND\n")}
`;
  }

  
  // Sorting
    if (latitude && longitude) {
    query += `
ORDER BY

reliability_score DESC,

distance ASC
`;
  } else {
    query += `
ORDER BY

reliability_score DESC,

w.created_at DESC
`;
  }

  
  // Pagination
    values.push(limit);
  const limitIndex = values.length;

  values.push(offset);
  const offsetIndex = values.length;

  query += `
LIMIT $${limitIndex}
OFFSET $${offsetIndex}
`;

  
  // Execute
    const result = await pool.query(query, values);

  return result.rows;
}

export async function findMePowerNow({
  latitude,
  longitude,
  radius = 10,
}) {
  const query = `
    SELECT
      w.id,
      w.title,
      w.description,
      w.workspace_type,
      w.capacity,
      w.address,
      w.city,
      w.state,
      wp.pricing_type,
      wp.amount,

      ARRAY_REMOVE(
        ARRAY_AGG(DISTINCT wa.amenity_name),
        NULL
      ) AS amenities,

      COALESCE(
        AVG(
          (
            r.power_reliability_rating +
            r.internet_reliability_rating
          ) / 2.0
        ),
        0
      ) AS reliability_score,

      (
        6371 * acos(
          cos(radians($1))
          *
          cos(radians(w.latitude))
          *
          cos(
            radians(w.longitude)
            -
            radians($2)
          )
          +
          sin(radians($1))
          *
          sin(radians(w.latitude))
        )
      ) AS distance

    FROM workspaces w

    LEFT JOIN workspace_pricing wp
      ON wp.workspace_id = w.id
      AND wp.is_active = TRUE

    LEFT JOIN workspace_amenities wa
      ON wa.workspace_id = w.id

    LEFT JOIN bookings b
      ON b.workspace_id = w.id

    LEFT JOIN reviews r
      ON r.booking_id = b.id

    WHERE w.status='published'

    GROUP BY
      w.id,
      wp.pricing_type,
      wp.amount

    HAVING
      (
        6371 * acos(
          cos(radians($1))
          *
          cos(radians(w.latitude))
          *
          cos(
            radians(w.longitude)
            -
            radians($2)
          )
          +
          sin(radians($1))
          *
          sin(radians(w.latitude))
        )
      ) <= $3

    ORDER BY

      reliability_score DESC,

      distance ASC

    LIMIT 1;
  `;

  const result = await pool.query(query, [
    latitude,
    longitude,
    radius,
  ]);

  return result.rows[0] || null;
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

export async function countWorkspacePhotos(workspace_id) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM workspace_photos WHERE workspace_id = $1`,
      [workspace_id]
    );
  
    return result.rows[0].count;
  }
  
export async function updateWorkspaceMediaStatus(workspace_id, media_status) {
    await pool.query(
      `UPDATE workspaces SET media_status = $1, updated_at = NOW() WHERE id = $2`,
      [media_status, workspace_id]
    );
}

export async function updateWorkspaceStatusByAdmin(id, status) {
    const result = await pool.query(
      `UPDATE workspaces SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
  
    return result.rows[0] || null;
}
  
export async function getWorkspaceHostUserId(workspace_id) {
    const result = await pool.query(
      `SELECT hp.user_id
       FROM workspaces w
       JOIN host_profiles hp ON hp.id = w.host_id
       WHERE w.id = $1`,
      [workspace_id]
    );
  
    return result.rows[0]?.user_id || null;
}

export async function notifyHost(user_id, title, message) {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'system')`,
      [user_id, title, message]
    );
}

export async function getWorkspaceAvailability(workspaceId, date) {
const result = await pool.query(
    `SELECT 
      id,
      workspace_id,
      date,
      start_time,
      end_time,
      is_blocked
    FROM availability_calendars 
    WHERE workspace_id = $1 
    AND date = $2
    ORDER BY start_time`,
    [workspaceId, date]
  );

  return result.rows;
}

export async function listWorkspacePhotos(workspace_id) {
  const result = await pool.query(
    `SELECT id, workspace_id, photo_url, cloudinary_public_id, is_cover, display_order, created_at
     FROM workspace_photos
     WHERE workspace_id = $1
     ORDER BY display_order ASC, created_at ASC`,
    [workspace_id]
  );
  return result.rows;
}

export async function getWorkspacePhotoById(photo_id, workspace_id) {
  const result = await pool.query(
    `SELECT * FROM workspace_photos WHERE id = $1 AND workspace_id = $2`,
    [photo_id, workspace_id]
  );
  return result.rows[0] || null;
}

export async function deleteWorkspacePhotoRecord(photo_id, workspace_id) {
  const result = await pool.query(
    `DELETE FROM workspace_photos WHERE id = $1 AND workspace_id = $2 RETURNING id`,
    [photo_id, workspace_id]
  );
  return result.rows.length > 0;
}