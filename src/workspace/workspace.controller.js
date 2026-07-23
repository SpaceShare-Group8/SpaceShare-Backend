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

    if (err.code === '23503') {
      return res.status(400).json({
        status: false,
        message: 'host_id does not match an existing host profile',
      });
    }

    if (err.code === '23514') {
      return res.status(400).json({
        status: false,
        message: 'workspace_type must be one of: desk, meeting_room, private_office, training_room, podcast_studio, creative_space',
      });
    }

    return res.status(500).json({
      status: false,
      message: 'Failed to create workspace',
    });
  }
}