CREATE TABLE IF NOT EXISTS transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID, -- FK to bookings(id)
    wallet_id           UUID, -- FK to wallets(id) for host payouts/credits
    corporate_account_id UUID, -- Enables corporate spend report queries (PRD 11.14)
    payment_reference   VARCHAR(255), -- Stores Paystack/Flutterwave reference (PRD 11.8)
    amount              DECIMAL(12, 2) NOT NULL,
    commission_amount   DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    type                VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'payout', 'refund')),
    status              VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions (booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_corporate ON transactions (corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions (payment_reference);