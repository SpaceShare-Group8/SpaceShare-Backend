import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from "./favorites.service.js";

export async function createFavorite(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const user_id = req.user.id;

    const favorite = await addFavorite(user_id, workspaceId);

    res.status(201).json({
      success: true,
      message: "Workspace added to favorites.",
      data: favorite,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFavorite(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const user_id = req.user.id;

    const favorite = await removeFavorite(user_id, workspaceId);

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: "Favorite not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workspace removed from favorites.",
    });
  } catch (error) {
    next(error);
  }
}

export async function listFavorites(req, res, next) {
  try {
    const user_id = req.user.id;

    const favorites = await getFavorites(user_id);

    res.status(200).json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
}
