-- Migration: 021_add_admin_statuses_to_workspaces
-- Extends workspaces.status to support admin moderation outcomes,
-- alongside the existing host-driven draft/published/suspended states.

ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_status_check;

ALTER TABLE workspaces
ADD CONSTRAINT workspaces_status_check
CHECK (status IN ('draft', 'published', 'suspended', 'admin_approved', 'rejected'));