import { searchWorkspaceListings } from "./search.service.js";

/**
 * GET /api/workspaces/search
 *
 * Supported Query Parameters
 * --------------------------
 * page
 * limit
 * city
 * workspace_type
 * capacity
 * pricing_type
 * min_price
 * max_price
 * amenity              
 * amenities              
 * latitude
 * longitude
 * radius
 * date
 * start_time
 * end_time
 * sort
 *
 * Sort options:
 * --------------
 * reliability
 * distance
 * newest
 * price_low
 * price_high
 */

export async function handleSearchWorkspaces(req, res) {
  try {
    const {
      page,
      limit,
      city,
      workspace_type,
      capacity,
      pricing_type,
      min_price,
      max_price,

      amenity,
      amenities,

      latitude,
      longitude,
      radius,

      date,
      start_time,
      end_time,

      sort,
    } = req.query;

    const filters = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,

      city,
      workspace_type,

      capacity: capacity ? parseInt(capacity, 10) : undefined,

      pricing_type,

      min_price: min_price ? Number(min_price) : undefined,
      max_price: max_price ? Number(max_price) : undefined,

      // Backward compatibility
      amenity,

      // Preferred Day 6 format
      amenities: amenities
        ? amenities
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined,

      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      radius: radius ? Number(radius) : undefined,

      date,
      start_time,
      end_time,

      // reliability | distance | newest | price_low | price_high
      sort,
    };

    const workspaces = await searchWorkspaceListings(filters);

    return res.status(200).json({
      status: true,
      message: "Workspace search completed successfully.",
      count: workspaces.length,
      data: workspaces,
    });
  } catch (error) {
    console.error("Workspace Search Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to search workspaces.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
}