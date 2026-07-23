import { createWorkspace } from './workspace.service.js';

export async function handleCreateWorkspace(req, res) {
  try {
    const { host_id, title, workspace_type, capacity } = req.body;

    if (!host_id || !title || !workspace_type || !capacity) {
      return res.status(400).json({
        status: false,
        message: 'host_id, title, workspace_type, and capacity are required',
      });
    }

    const workspace = await createWorkspace(req.body);

    return res.status(201).json({
      status: true,
      message: 'Workspace created successfully',
      data: workspace,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: 'Failed to create workspace',
    });
  }
}