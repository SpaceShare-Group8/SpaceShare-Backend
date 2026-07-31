-- Migration: 024_add_cancellation_tracking
-- Records who cancelled a booking (seeker vs host) and why, so
-- Emmanuella's refund-policy work can branch on cancellation type.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(10)
    CHECK (cancelled_by IN ('seeker', 'host'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;