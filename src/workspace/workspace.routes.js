import { Router } from "express";
import { upload } from "./workspace.upload.js";
import {
  protect,
  requireVerifiedHost,
  authorize,
} from "../common/middleware/auth.middleware.js";

import {
  handleCreateWorkspace,
  handleGetWorkspaceById,
  handleListWorkspaces,
  handleUpdateWorkspace,
  handleDeleteWorkspace,
  handleUploadWorkspacePhoto,
  handleUpdateWorkspaceStatus,
  handleListWorkspacePhotos,   
  handleDeleteWorkspacePhoto,
  handleFindMePowerNow,
} from "./workspace.controller.js";

import availabilityRoutes from "../booking/availability/availability.routes.js";
import { handleSearchWorkspaces } from "./search.controller.js";

const router = Router();

router.post("/", protect, requireVerifiedHost, handleCreateWorkspace);

router.get("/search", handleSearchWorkspaces);

router.get("/find-me-power-now", handleFindMePowerNow);

router.get("/:id", handleGetWorkspaceById);

router.get("/", handleListWorkspaces);

router.put("/:id", handleUpdateWorkspace);

router.delete("/:id", handleDeleteWorkspace);

router.post("/:id/photos", upload.single("photo"), handleUploadWorkspacePhoto);

router.patch(
  "/:id/status",
  protect,
  authorize("admin", "platform_admin"),
  handleUpdateWorkspaceStatus
);

/* Availability routes */
router.use("/", availabilityRoutes);
router.post("/:id/photos", upload.single("photo"), handleUploadWorkspacePhoto);


router.get("/:id/photos", handleListWorkspacePhotos);
router.delete("/:workspaceId/photos/:photoId", protect, handleDeleteWorkspacePhoto);
export default router;