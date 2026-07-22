-- CREATE TABLE reliability_reviews (
--     id SERIAL PRIMARY KEY,

--     booking_id INTEGER NOT NULL REFERENCES bookings(id),

--     power_stable BOOLEAN NOT NULL,

--     internet_as_described BOOLEAN NOT NULL
-- );


########################################################
-- Migration: 012_create_reliability_reviews
-- Table: ReliabilityReviews

CREATE TABLE IF NOT EXISTS reliability_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    power_stable BOOLEAN NOT NULL,

    internet_as_described BOOLEAN NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reliability_reviews_booking_id
ON reliability_reviews (booking_id);