-- Migration: 008_create_notifications
-- Table: Notifications
-- Notes: Stores notifications sent to users.

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    title           VARCHAR(150) NOT NULL,

    message         TEXT NOT NULL,

    type            VARCHAR(30) NOT NULL
                        CHECK (type IN (
                            'booking',
                            'payment',
                            'support',
                            'reminder',
                            'system'
                        )),

    payload         JSONB,

    is_read         BOOLEAN NOT NULL DEFAULT FALSE,

    read_at         TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications (type);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
ON notifications (is_read);