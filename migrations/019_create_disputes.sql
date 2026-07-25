-- Migration: 015_create_disputes
-- Table: Disputes
-- Notes: Stores disputes raised after bookings for admin resolution.

CREATE TABLE IF NOT EXISTS disputes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id          UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,

    filed_by_user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    reason              VARCHAR(255) NOT NULL,

    description         TEXT NOT NULL,

    status              VARCHAR(20) NOT NULL DEFAULT 'open'
                            CHECK (status IN (
                                'open',
                                'under_review',
                                'resolved',
                                'rejected'
                            )),

    resolution          TEXT,

    resolved_by_admin_id UUID REFERENCES users (id) ON DELETE SET NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_booking_id
ON disputes (booking_id);

CREATE INDEX IF NOT EXISTS idx_disputes_filed_by_user_id
ON disputes (filed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_disputes_status
ON disputes (status);