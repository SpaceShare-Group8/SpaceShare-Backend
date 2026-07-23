import {
    createWorkspace,
    getWorkspaceById,
    listWorkspaces,
    updateWorkspace,
    deleteWorkspace,
  } from './workspace.service.js';

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

export async function handleGetWorkspaceById(req, res) {
    try {
      const workspace = await getWorkspaceById(req.params.id);
  
      if (!workspace) {
        return res.status(404).json({
          status: false,
          message: 'Workspace not found',
        });
      }
  
      return res.status(200).json({
        status: true,
        data: workspace,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch workspace',
      });
    }
  }
  
  export async function handleListWorkspaces(req, res) {
    try {
      const { page, limit, city, workspace_type } = req.query;
  
      const workspaces = await listWorkspaces({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        city,
        workspace_type,
      });
  
      return res.status(200).json({
        status: true,
        data: workspaces,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: 'Failed to fetch workspaces',
      });
    }
  }

  export async function handleUpdateWorkspace(req, res) {
    try {
      const { host_id } = req.body;
  
      if (!host_id) {
        return res.status(400).json({
          status: false,
          message: 'host_id is required to verify ownership',
        });
      }
  
      const result = await updateWorkspace(req.params.id, host_id, req.body);
  
      if (result.error === 'no_fields') {
        return res.status(400).json({
          status: false,
          message: 'No valid fields provided to update',
        });
      }
  
      if (result.error === 'not_found_or_forbidden') {
        return res.status(404).json({
          status: false,
          message: 'Workspace not found, or you do not own this workspace',
        });
      }
  
      return res.status(200).json({
        status: true,
        message: 'Workspace updated successfully',
        data: result.data,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: 'Failed to update workspace',
      });
    }
  }
  
  export async function handleDeleteWorkspace(req, res) {
    try {
      const { host_id } = req.body;
  
      if (!host_id) {
        return res.status(400).json({
          status: false,
          message: 'host_id is required to verify ownership',
        });
      }
  
      const deleted = await deleteWorkspace(req.params.id, host_id);
  
      if (!deleted) {
        return res.status(404).json({
          status: false,
          message: 'Workspace not found, or you do not own this workspace',
        });
      }
  
      return res.status(200).json({
        status: true,
        message: 'Workspace deleted successfully',
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        status: false,
        message: 'Failed to delete workspace',
      });
    }
  }
