import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import {
  createWorkspace,
  getWorkspaceById,
  listWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  addWorkspacePhoto,
  countWorkspacePhotos,
  updateWorkspaceMediaStatus,
  updateWorkspaceStatusByAdmin,
  getWorkspaceHostUserId,
  notifyHost,
  getWorkspaceAvailability,
  listWorkspacePhotos,       
  getWorkspacePhotoById,     
  deleteWorkspacePhotoRecord,
  findMePowerNow,
} from './workspace.service.js';

// Load environment variables
dotenv.config();

// Configure Cloudinary directly in the controller (temporary fix)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('☁️ Cloudinary configured with:');
console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ MISSING');

export async function handleCreateWorkspace(req, res) {
  try {
    const { title, workspace_type, capacity } = req.body;

    if (!title || !workspace_type || !capacity) {
      return res.status(400).json({
        status: false,
        message: 'title, workspace_type, and capacity are required',
      });
    }

    const workspaceData = {
      ...req.body,
      host_id: req.hostProfile.id,
    };

    const workspace = await createWorkspace(workspaceData);

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
        message: 'One or more fields failed validation (check workspace_type or capacity)',
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
    const {
      page = 1,
      limit = 10,

      city,
      workspace_type,

      minCapacity,
      minPrice,
      maxPrice,

      amenities,

      date,
      start_time,
      end_time,

      minReliabilityScore,
    } = req.query;

    const workspaces = await listWorkspaces({
      page: Number(page),
      limit: Number(limit),

      city,
      workspace_type,

      minCapacity: minCapacity ? Number(minCapacity) : undefined,

      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,

      amenities,

      date,
      start_time,
      end_time,

      minReliabilityScore: minReliabilityScore
        ? Number(minReliabilityScore)
        : undefined,
    });

    return res.status(200).json({
      success: true,
      count: workspaces.length,
      data: workspaces,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workspaces.",
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

export async function handleUploadWorkspacePhoto(req, res) {
  try {
    console.log('📸 Uploading photo...');
    console.log('File:', req.file ? '✅ File received' : '❌ No file');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ MISSING');

    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: 'No image file provided',
      });
    }

    console.log('📤 Uploading to Cloudinary...');

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'spaceshare/workspaces' },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary error:', error.message);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful');
            resolve(result);
          }
        }
      );
      stream.end(req.file.buffer);
    });

    console.log('💾 Saving to database...');

    const photo = await addWorkspacePhoto(
      req.params.id,
      uploadResult.secure_url,
      uploadResult.public_id
    );

    const photoCount = await countWorkspacePhotos(req.params.id);

    if (photoCount >= 3) {
      await updateWorkspaceMediaStatus(req.params.id, 'complete');
    }

    return res.status(201).json({
      status: true,
      message: 'Photo uploaded successfully',
      data: photo,
      media_status: photoCount >= 3 ? 'complete' : 'incomplete',
      photos_uploaded: photoCount,
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    return res.status(500).json({
      status: false,
      message: 'Failed to upload photo',
      error: err.message,
    });
  }
}

const ADMIN_STATUS_MESSAGES = {
  admin_approved: 'Your workspace listing has been approved and is now live.',
  rejected: 'Your workspace listing was rejected. Please review and resubmit.',
  suspended: 'Your workspace listing has been suspended by an administrator.',
};

export async function handleUpdateWorkspaceStatus(req, res) {
  try {
    const { status } = req.body;
    const allowedStatuses = Object.keys(ADMIN_STATUS_MESSAGES);

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: false,
        message: `status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const workspace = await updateWorkspaceStatusByAdmin(req.params.id, status);

    if (!workspace) {
      return res.status(404).json({
        status: false,
        message: 'Workspace not found',
      });
    }

    const hostUserId = await getWorkspaceHostUserId(req.params.id);

    if (hostUserId) {
      await notifyHost(
        hostUserId,
        'Workspace status updated',
        `${workspace.title}: ${ADMIN_STATUS_MESSAGES[status]}`
      );
    }

    return res.status(200).json({
      status: true,
      message: 'Workspace status updated successfully',
      data: workspace,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: 'Failed to update workspace status',
    });
  }
}

export async function handleGetWorkspaceAvailability(req, res) {
  try {
    const { id } = req.params;
    const { date } = req.query;

    console.log('📅 Availability request:', { id, date });

    if (!date) {
      return res.status(400).json({
        status: false,
        message: 'Date parameter is required (YYYY-MM-DD)'
      });
    }

    const availability = await getWorkspaceAvailability(id, date);

    console.log('📊 Availability data found:', availability.length, 'records');

    return res.status(200).json({
      status: true,
      data: availability
    });
  } catch (err) {
    console.error('❌ Availability error:', err.message);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch availability',
      error: err.message
    });
  }
}

/**
 * GET /api/workspaces/:id/photos
 */
export async function handleListWorkspacePhotos(req, res) {
  try {
    const { id } = req.params;

    const workspace = await getWorkspaceById(id);
    if (!workspace) {
      return res.status(404).json({
        status: false,
        message: 'Workspace not found',
      });
    }

    const photos = await listWorkspacePhotos(id);

    return res.status(200).json({
      status: true,
      data: photos,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch workspace photos',
    });
  }
}

/**
 * DELETE /api/workspaces/:workspaceId/photos/:photoId
 */
export async function handleDeleteWorkspacePhoto(req, res) {
  try {
    const { workspaceId, photoId } = req.params;

    const photo = await getWorkspacePhotoById(photoId, workspaceId);
    if (!photo) {
      return res.status(404).json({
        status: false,
        message: 'Photo not found for this workspace',
      });
    }

    const hostUserId = await getWorkspaceHostUserId(workspaceId);
    const isOwner = hostUserId && hostUserId === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'platform_admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: false,
        message: 'You do not have permission to delete this photo',
      });
    }

    if (photo.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(photo.cloudinary_public_id);
      } catch (cloudErr) {
        // Don't block DB cleanup if Cloudinary is briefly unavailable
        console.error('⚠️ Cloudinary deletion failed (continuing to remove DB record):', cloudErr.message);
      }
    }

    await deleteWorkspacePhotoRecord(photoId, workspaceId);

    const photoCount = await countWorkspacePhotos(workspaceId);
    await updateWorkspaceMediaStatus(workspaceId, photoCount >= 3 ? 'complete' : 'incomplete');

    return res.status(200).json({
      status: true,
      message: 'Photo deleted successfully',
      photos_remaining: photoCount,
      media_status: photoCount >= 3 ? 'complete' : 'incomplete',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: 'Failed to delete photo',
    });
  }
}

export async function handleFindMePowerNow(req, res) {
  try {
    const {
      latitude,
      longitude,
      radius = 10,
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required.",
      });
    }

    const workspace = await findMePowerNow({
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius: Number(radius),
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "No nearby workspace found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: workspace,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to locate nearby workspace.",
    });
  }
}