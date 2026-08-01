import * as searchService from "./search.service.js";

/**
 * Save a search term
 * POST /api/search/history
 */
export const saveSearch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { searchTerm } = req.body;

    const search = await searchService.saveSearch(userId, searchTerm);

    return res.status(201).json({
      success: true,
      message: "Search saved successfully.",
      data: search,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's search history
 * GET /api/search/history
 */
export const getSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const history = await searchService.getSearchHistory(userId);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear search history
 * DELETE /api/search/history
 */
export const clearSearchHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await searchService.clearSearchHistory(userId);

    return res.status(200).json({
      success: true,
      message: "Search history cleared successfully.",
    });
  } catch (error) {
    next(error);
  }
};
