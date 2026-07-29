-- Migration: 006_create_workspace_pricing
-- Table: WorkspacePricing
-- Notes: A workspace can have multiple pricing tiers (hourly/daily/weekly)
--        active at once, that's why this isn't just columns on Workspaces.

CREATE TABLE IF NOT EXISTS workspace_pricing (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    pricing_type    VARCHAR(20) NOT NULL
                        CHECK (pricing_type IN ('hourly', 'daily', 'weekly')),
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id, pricing_type)
);

CREATE INDEX IF NOT EXISTS idx_workspace_pricing_workspace_id ON workspace_pricing (workspace_id);
