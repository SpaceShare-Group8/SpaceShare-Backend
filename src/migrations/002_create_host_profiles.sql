-- Migration: 002_create_host_profiles
-- Table: HostProfiles
-- Notes: One-to-one extension of users for the "host" role.

CREATE TABLE IF NOT EXISTS host_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    business_name       VARCHAR(150),
    bio                 TEXT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    payout_info         JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_profiles_user_id ON host_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_host_profiles_verification_status ON host_profiles (verification_status);
