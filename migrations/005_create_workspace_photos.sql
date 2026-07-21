-- Migration: 005_create_workspace_photos
-- Table: WorkspacePhotos
-- Notes: cloudinary_public_id is stored alongside the URL so photos can be
--        deleted/replaced via the Cloudinary API without re-parsing the URL.

CREATE TABLE IF NOT EXISTS workspace_photos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    photo_url               TEXT NOT NULL,
    cloudinary_public_id    VARCHAR(255),
    is_cover                BOOLEAN NOT NULL DEFAULT FALSE,
    display_order           INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_photos_workspace_id ON workspace_photos (workspace_id);

-- Only one cover photo per workspace
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_photos_single_cover
    ON workspace_photos (workspace_id)
    WHERE is_cover = TRUE;
