import { Router } from 'express';
import {
  handleCreateWorkspace,
  handleGetWorkspaceById,
  handleListWorkspaces,
  handleUpdateWorkspace,
  handleDeleteWorkspace,
} from './workspace.controller.js';

const router = Router();

router.post('/', handleCreateWorkspace);
router.get('/:id', handleGetWorkspaceById);
router.get('/', handleListWorkspaces);
router.put('/:id', handleUpdateWorkspace);
router.delete('/:id', handleDeleteWorkspace);

export default router;