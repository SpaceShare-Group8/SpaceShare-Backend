import * as favoritesService from "./favorites.service.js";

/**
 * Add a workspace to favorites
 * POST /api/favorites/:workspaceId
 */
export const addFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.params;

    const favorite = await favoritesService.addFavorite(userId, workspaceId);

    if (!favorite) {
      return res.status(200).json({
        success: true,
        message: "Workspace was already in your favorites.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Workspace added to favorites.",
      data: favorite,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a workspace from favorites
 * DELETE /api/favorites/:workspaceId
 */
export const removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.params;

    await favoritesService.removeFavorite(userId, workspaceId);

    return res.status(200).json({
      success: true,
      message: "Workspace removed from favorites.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all favorites for the logged-in user
 * GET /api/favorites
 */
export const getUserFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const favorites = await favoritesService.getUserFavorites(userId);

    return res.status(200).json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
};
