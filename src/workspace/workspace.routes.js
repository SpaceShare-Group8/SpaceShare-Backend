import { Router } from 'express';
import { upload } from './workspace.upload.js';
import { protect, requireVerifiedHost, authorize } from '../common/middleware/auth.middleware.js';
import {
  handleCreateWorkspace,
  handleGetWorkspaceById,
  handleListWorkspaces,
  handleUpdateWorkspace,
  handleDeleteWorkspace,
  handleUploadWorkspacePhoto,
  handleUpdateWorkspaceStatus
} from './workspace.controller.js';
import availabilityRoutes from "../booking/availability/availability.routes.js";

const router = Router();

router.post('/', protect, requireVerifiedHost, handleCreateWorkspace);
router.get('/:id', handleGetWorkspaceById);
router.get('/', handleListWorkspaces);
router.put('/:id', handleUpdateWorkspace);
router.delete('/:id', handleDeleteWorkspace);
router.post('/:id/photos', upload.single('photo'), handleUploadWorkspacePhoto);
router.patch('/:id/status', protect, authorize('admin', 'platform_admin'), handleUpdateWorkspaceStatus);
router.use("/", availabilityRoutes);

export default router;