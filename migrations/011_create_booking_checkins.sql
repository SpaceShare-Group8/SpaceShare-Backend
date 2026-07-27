

-- Migration: 011_create_booking_checkins
-- Table: BookingCheckIns

CREATE TABLE IF NOT EXISTS booking_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    checked_in_at TIMESTAMPTZ NOT NULL,

    method VARCHAR(50) NOT NULL
        CHECK (method IN ('qr_code', 'manual')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_checkins_booking_id
ON booking_checkins (booking_id);