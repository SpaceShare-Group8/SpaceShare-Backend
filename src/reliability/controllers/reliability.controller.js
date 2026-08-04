import { getWorkspaceReliabilityScore } from '../services/reliability.service.js';

// GET /api/workspaces/:id/reliability-score
export async function handleGetWorkspaceReliabilityScore(req, res) {
    try {
        const { id } = req.params;
        const result = await getWorkspaceReliabilityScore(id);

        return res.status(200).json({
            status: true,
            data: result,
        });
    } catch (err) {
        console.error(err);
        return res.status(err.statusCode || 500).json({
            status: false,
            message: err.message || 'Failed to fetch reliability score',
        });
    }
}
