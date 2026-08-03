-- Migration: 032_add_workspace_review_flagging
-- Adds auto-flagging fields to workspaces for the Trust Engine.
-- reliability_score and review_count already exist (see 028).

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS flag_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_flagged_for_review
ON workspaces (flagged_for_review);
