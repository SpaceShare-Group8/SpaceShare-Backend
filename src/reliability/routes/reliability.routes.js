import { Router } from 'express';
import { handleGetWorkspaceReliabilityScore } from '../controllers/reliability.controller.js';

const router = Router();

// GET /api/workspaces/:id/reliability-score
// Mounted at "/" inside workspace.routes.js, the same pattern already
// used there for availability routes — so the final path resolves
// correctly under /api/workspaces.
router.get('/:id/reliability-score', handleGetWorkspaceReliabilityScore);

export default router;
