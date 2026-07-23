import { Router } from 'express';
import { upload } from './workspace.upload.js';
import {
  handleCreateWorkspace,
  handleGetWorkspaceById,
  handleListWorkspaces,
  handleUpdateWorkspace,
  handleDeleteWorkspace,
  handleUploadWorkspacePhoto
} from './workspace.controller.js';

const router = Router();

router.post('/', handleCreateWorkspace);
router.get('/:id', handleGetWorkspaceById);
router.get('/', handleListWorkspaces);
router.put('/:id', handleUpdateWorkspace);
router.delete('/:id', handleDeleteWorkspace);
router.post('/:id/photos', upload.single('photo'), handleUploadWorkspacePhoto);

export default router;