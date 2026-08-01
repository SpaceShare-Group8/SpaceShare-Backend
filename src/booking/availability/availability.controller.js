import {
  createAvailability,
  getWorkspaceAvailability,
  updateAvailability,
  deleteAvailability,
} from "./availability.service.js";

export async function handleCreateAvailability(req, res) {
  try {
    const availability = await createAvailability(req.body);

    res.status(201).json({
      status: true,
      message: "Availability created successfully.",
      data: availability,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: false,
      message: "Failed to create availability.",
    });
  }
}

export async function handleGetWorkspaceAvailability(req, res) {
  try {
    const { start_date, end_date } = req.query;

    const availability = await getWorkspaceAvailability(
      req.params.workspaceId,
      start_date,
      end_date
    );

    res.json({
      status: true,
      data: availability,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: false,
      message: "Failed to fetch availability.",
    });
  }
}

export async function handleUpdateAvailability(req, res) {
  try {
    const result = await updateAvailability(req.params.id, req.body);

    if (result.error === "no_fields") {
      return res.status(400).json({
        status: false,
        message: "No valid fields supplied.",
      });
    }

    if (result.error === "not_found") {
      return res.status(404).json({
        status: false,
        message: "Availability record not found.",
      });
    }

    res.json({
      status: true,
      message: "Availability updated successfully.",
      data: result.data,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: false,
      message: "Failed to update availability.",
    });
  }
}

export async function handleDeleteAvailability(req, res) {
  try {
    const deleted = await deleteAvailability(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: "Availability record not found.",
      });
    }

    res.json({
      status: true,
      message: "Availability deleted successfully.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      status: false,
      message: "Failed to delete availability.",
    });
  }
}