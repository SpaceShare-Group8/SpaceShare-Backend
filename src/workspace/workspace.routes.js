import { Router } from 'express';
import { handleCreateWorkspace } from './workspace.controller.js';

const router = Router();

router.post('/', handleCreateWorkspace);

export default router;