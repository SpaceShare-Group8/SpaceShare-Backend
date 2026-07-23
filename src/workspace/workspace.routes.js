import { Router } from 'express';
import { handleCreateWorkspace, handleGetWorkspaceById, handleListWorkspaces } from './workspace.controller.js';


const router = Router();

router.post('/', handleCreateWorkspace);
router.get('/:id', handleGetWorkspaceById);
router.get('/', handleListWorkspaces);

export default router;

