CREATE TABLE IF NOT EXISTS corporate_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id   UUID NOT NULL, -- FK to users(id)
    company_name    VARCHAR(255) NOT NULL,
    budget_amount   DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    budget_period   VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_accounts_admin ON corporate_accounts (admin_user_id);