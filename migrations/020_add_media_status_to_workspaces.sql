-- Migration: 020_add_media_status_to_workspaces
-- Adds a flag tracking whether a workspace has met the minimum
-- photo requirement (3) before it can be considered listing-ready.

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS media_status VARCHAR(20) NOT NULL DEFAULT 'incomplete'
    CHECK (media_status IN ('incomplete', 'complete'));