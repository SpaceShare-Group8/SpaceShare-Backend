-- Migration: 023_fix_bookings_schema
-- Adds columns the booking service code depends on but the original
-- bookings migration never created, and expands status/method CHECK
-- constraints to include values the actual booking lifecycle uses.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS failed_checkin_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
ADD CONSTRAINT bookings_status_check
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'in_progress', 'declined'));

ALTER TABLE booking_checkins DROP CONSTRAINT IF EXISTS booking_checkins_method_check;
ALTER TABLE booking_checkins
ADD CONSTRAINT booking_checkins_method_check
CHECK (method IN ('qr_code', 'manual', '6-digit-code'));