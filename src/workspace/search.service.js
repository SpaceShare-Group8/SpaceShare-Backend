import pool from "../common/config/db.js";

/**
 * Search Workspaces
 *
 * Supports:
 * - City
 * - Workspace Type
 * - Capacity
 * - Pricing Type
 * - Min / Max Price
 * - Amenity
 * - Availability (date + time)
 * - Radius Search (Haversine Formula)
 * - Pagination
 *
 * NOTE:
 * reliability_score filter intentionally omitted because
 * the current database schema does not yet contain that column.
 */

export async function searchWorkspaces({
  page = 1,
  limit = 10,

  city,
  workspace_type,
  capacity,

  pricing_type,
  min_price,
  max_price,

  amenity,
  amenities,
  sort,

  latitude,
  longitude,
  radius,

  date,
  start_time,
  end_time,
}) {
  page = Math.max(1, Number(page) || 1);
limit = Math.min(50, Math.max(1, Number(limit) || 10));

const offset = (page - 1) * limit;

  const values = [];
  const where = [];

  
  //SELECT

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
    ) AS amenities
`;

 //RADIUS SEARCH
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
radians(w.longitude) -
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

  query += distanceSelect;

 //FROM

  query += `
FROM workspaces w

LEFT JOIN workspace_pricing wp
ON wp.workspace_id = w.id
AND wp.is_active = TRUE

LEFT JOIN workspace_amenities wa
ON wa.workspace_id = w.id

LEFT JOIN availability_calendars ac
ON ac.workspace_id = w.id
`;

 //BASE CONDITIONS
  where.push(`w.status = 'published'`);

    //City

  if (city) {
    values.push(city);
    where.push(`LOWER(w.city)=LOWER($${values.length})`);
  }

 //Workspace Type

  if (workspace_type) {
    values.push(workspace_type);
    where.push(`w.workspace_type=$${values.length}`);
  }

  //Capacity
  if (capacity) {
    values.push(capacity);
    where.push(`w.capacity >= $${values.length}`);
  }

  //Pricing Type

  if (pricing_type) {
    values.push(pricing_type);
    where.push(`wp.pricing_type=$${values.length}`);
  }

  //Minimum price

  if (min_price) {
    values.push(min_price);
    where.push(`wp.amount >= $${values.length}`);
  }

  //Max price

  if (max_price) {
    values.push(max_price);
    where.push(`wp.amount <= $${values.length}`);
  }

// Amenities (supports multiple values)
// Example:
// ?amenities=wifi,parking,generator

const amenityFilters =
  amenities && amenities.length
    ? amenities
    : amenity
      ? [amenity]
      : [];

if (amenityFilters.length > 0) {
  const placeholders = amenityFilters.map((item) => {
    values.push(item.trim());
    return `$${values.length}`;
  });

  where.push(`
wa.amenity_name IN (${placeholders.join(",")})
`);
}

  //Availability

  if (date) {
    values.push(date);
    where.push(`ac.date=$${values.length}`);
    where.push(`ac.is_blocked=FALSE`);
  }

  if (start_time && end_time) {
    values.push(start_time);
    const startIndex = values.length;

    values.push(end_time);
    const endIndex = values.length;

    where.push(`
ac.start_time <= $${startIndex}
AND ac.end_time >= $${endIndex}
`);
  }

  //Exclude Existing Bookings

  if (date && start_time && end_time) {
    values.push(`${date} ${start_time}`);
    const bookingStart = values.length;

    values.push(`${date} ${end_time}`);
    const bookingEnd = values.length;

    where.push(`
NOT EXISTS (
SELECT 1
FROM bookings b
WHERE b.workspace_id=w.id
AND b.status IN ('pending','confirmed')
AND (
b.start_time < $${bookingEnd}
AND b.end_time > $${bookingStart}
)
)
`);
  }

  //WHERE

  if (where.length) {
    query += `
WHERE
${where.join("\nAND\n")}
`;
  }

  //GROUP BY

  query += `
GROUP BY
w.id,
wp.pricing_type,
wp.amount
`;

// Radius Filter

if (latitude && longitude && radius) {
  values.push(radius);

  query += `
HAVING
(
6371 * acos(
cos(radians($1))
*
cos(radians(w.latitude))
*
cos(
radians(w.longitude) - radians($2)
)
+
sin(radians($1))
*
sin(radians(w.latitude))
)
)
<= $${values.length}
`;
}
// Sorting
// TODO:
// Replace created_at with reliability_score DESC
// once the Trust Engine module is merged.

switch (sort) {
  case "distance":
    if (latitude && longitude) {
      query += `
ORDER BY
distance ASC,
w.created_at DESC
`;
    } else {
      query += `
ORDER BY
w.created_at DESC
`;
    }
    break;

  case "price_low":
    query += `
ORDER BY
wp.amount ASC NULLS LAST
`;
    break;

  case "price_high":
    query += `
ORDER BY
wp.amount DESC NULLS LAST
`;
    break;

  case "newest":
    query += `
ORDER BY
w.created_at DESC
`;
    break;

  case "reliability":
    query += `
ORDER BY
w.created_at DESC
`;
    break;

  default:
    if (latitude && longitude) {
      query += `
ORDER BY
distance ASC,
w.created_at DESC
`;
    } else {
      query += `
ORDER BY
w.created_at DESC
`;
    }
}
  //Pagination

  values.push(limit);
  const limitIndex = values.length;

  values.push(offset);
  const offsetIndex = values.length;

  query += `
LIMIT $${limitIndex}
OFFSET $${offsetIndex}
`;

  const result = await pool.query(query, values);

  return result.rows;
}

//Wrapper for Controller

export async function searchWorkspaceListings(filters) {
  return await searchWorkspaces(filters);
}