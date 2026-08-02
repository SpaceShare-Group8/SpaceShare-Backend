/**
 * Support Service
 * Handles support ticket operations.
 */

// Mock support tickets (replace with database later)
const supportTickets = [
  {
    id: 1,
    user_id: 101,
    category: "Booking",
    status: "Open",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    user_id: 102,
    category: "Payment",
    status: "In Progress",
    created_at: new Date().toISOString(),
  },
];

const VALID_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

/**
 * Update a support ticket's status.
 */
export const updateTicketStatus = async (ticketId, status) => {
  const ticket = supportTickets.find((t) => t.id === Number(ticketId));

  if (!ticket) {
    throw new Error("Support ticket not found.");
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Invalid support ticket status.");
  }

  ticket.status = status;

  return ticket;
};
