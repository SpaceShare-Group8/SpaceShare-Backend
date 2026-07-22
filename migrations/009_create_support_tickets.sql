-- Migration: 009_create_support_tickets
-- Table: SupportTickets
-- Notes: Stores customer support requests and their status.

CREATE TABLE IF NOT EXISTS support_tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    subject         VARCHAR(150) NOT NULL,
    description     TEXT NOT NULL,

    category        VARCHAR(30) NOT NULL
                        CHECK (category IN (
                            'booking',
                            'payment',
                            'workspace',
                            'account',
                            'technical',
                            'other'
                        )),

    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN (
                            'open',
                            'in_progress',
                            'resolved',
                            'closed'
                        )),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
ON support_tickets (user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
ON support_tickets (status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category
ON support_tickets (category);