import { searchWorkspaceListings } from "./search.service.js";

/**
 * GET /api/workspaces/search
 *
 * Query Parameters:
 * page
 * limit
 * city
 * workspace_type
 * capacity
 * pricing_type
 * min_price
 * max_price
 * amenity
 * latitude
 * longitude
 * radius
 * date
 * start_time
 * end_time
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
      latitude,
      longitude,
      radius,
      date,
      start_time,
      end_time,
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

      amenity,

      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      radius: radius ? Number(radius) : undefined,

      date,
      start_time,
      end_time,
    };

    const workspaces = await searchWorkspaceListings(filters);

    return res.status(200).json({
      status: true,
      message: "Workspace search completed successfully.",
      count: workspaces.length,
      filters,
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