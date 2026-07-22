-- Migration: 007_create_reviews
-- Table: Reviews
-- Notes: Stores post-booking reviews including power and internet reliability ratings.

CREATE TABLE IF NOT EXISTS reviews (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id                  UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    reviewer_id                 UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,

    overall_rating              INTEGER NOT NULL
                                    CHECK (overall_rating BETWEEN 1 AND 5),

    power_reliability_rating    INTEGER NOT NULL
                                    CHECK (power_reliability_rating BETWEEN 1 AND 5),

    internet_reliability_rating INTEGER NOT NULL
                                    CHECK (internet_reliability_rating BETWEEN 1 AND 5),

    comment                     TEXT,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_booking_id
ON reviews (booking_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
ON reviews (reviewer_id);