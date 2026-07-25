CREATE TABLE IF NOT EXISTS wallets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id          UUID UNIQUE NOT NULL, -- FK to users(id) or host_profiles(id)
    balance          DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    pending_balance  DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Tracks escrow/unsettled funds prior to checkout
    currency         VARCHAR(10) NOT NULL DEFAULT 'NGN',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_host ON wallets (host_id);