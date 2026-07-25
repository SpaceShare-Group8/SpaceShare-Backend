-- Migration: 003_create_workspaces
-- Table: Workspaces
-- Notes: Core listing table. lat/lng kept as plain numeric for now —
--        swap to PostGIS geography type later if proximity search needs it.

CREATE TABLE IF NOT EXISTS workspaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id         UUID NOT NULL REFERENCES host_profiles (id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    workspace_type  VARCHAR(30) NOT NULL
                        CHECK (workspace_type IN (
                            'desk', 'meeting_room', 'private_office',
                            'training_room', 'podcast_studio', 'creative_space'
                        )),
    capacity        INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
    address         VARCHAR(255),
    city            VARCHAR(100),
    state           VARCHAR(100),
    latitude        NUMERIC(9, 6),
    longitude       NUMERIC(9, 6),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'suspended')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_host_id ON workspaces (host_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_city ON workspaces (city);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces (status);
CREATE INDEX IF NOT EXISTS idx_workspaces_type ON workspaces (workspace_type);
