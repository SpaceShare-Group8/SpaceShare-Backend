/**
 * Support Controller
 * Handles HTTP requests for support tickets.
 */

import * as supportService from "./support.service.js";

/**
 * PATCH /api/support/tickets/:id
 * Update support ticket status.
 */
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await supportService.updateTicketStatus(id, status);

    return res.status(200).json({
      status: "success",
      message: "Support ticket updated successfully.",
      data: {
        ticket,
      },
    });
  } catch (error) {
    if (error.message === "Support ticket not found.") {
      return res.status(404).json({
        status: "error",
        message: error.message,
      });
    }

    if (error.message === "Invalid support ticket status.") {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }

    next(error);
  }
};
