-- Migration: 004_create_workspace_amenities
-- Table: WorkspaceAmenities
-- Notes: One row per amenity so filtering ("workspaces with WiFi + parking")
--        is a simple join instead of parsing a text/array column.

CREATE TABLE IF NOT EXISTS workspace_amenities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    amenity_name    VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id, amenity_name)
);

CREATE INDEX IF NOT EXISTS idx_workspace_amenities_workspace_id ON workspace_amenities (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_amenities_name ON workspace_amenities (amenity_name);
