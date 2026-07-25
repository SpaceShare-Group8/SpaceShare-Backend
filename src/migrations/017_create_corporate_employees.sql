CREATE TABLE IF NOT EXISTS corporate_employees (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corporate_account_id    UUID NOT NULL REFERENCES corporate_accounts (id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL, -- FK to users(id)
    individual_budget_limit DECIMAL(12, 2) DEFAULT NULL, -- Allows per-employee spending limits (PRD 11.14)
    status                  VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'revoked'
    invited_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_corporate_user UNIQUE (corporate_account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_corporate_employees_account ON corporate_employees (corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_corporate_employees_user ON corporate_employees (user_id);