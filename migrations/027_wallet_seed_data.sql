-- ================================================================
-- MIGRATION: 027_wallet_seed_data
-- Description: Seed initial wallet data and configurations
-- PRD Sections: 10.8, 11.8
-- ================================================================

-- ================================================================
-- INSERT DEFAULT WITHDRAWAL LIMITS FOR ALL HOSTS (if not exist)
-- ================================================================

INSERT INTO withdrawal_limits (host_id, daily_limit, weekly_limit, daily_reset_at, weekly_reset_at, created_at, updated_at)
SELECT 
  u.id,
  500000,
  2000000,
  NOW(),
  NOW(),
  NOW(),
  NOW()
FROM users u
WHERE (u.role = 'host' OR 'host' = ANY(u.roles))
AND NOT EXISTS (
  SELECT 1 FROM withdrawal_limits wl WHERE wl.host_id = u.id
);

-- ================================================================
-- CREATE WALLETS FOR HOSTS THAT DON'T HAVE ONE
-- ================================================================

INSERT INTO wallets (host_id, balance, currency, created_at, updated_at)
SELECT 
  u.id,
  0,
  'NGN',
  NOW(),
  NOW()
FROM users u
WHERE (u.role = 'host' OR 'host' = ANY(u.roles))
AND NOT EXISTS (
  SELECT 1 FROM wallets w WHERE w.host_id = u.id
);

-- ================================================================
-- RECALCULATE WALLET BALANCES FROM EXISTING TRANSACTIONS
-- ================================================================

UPDATE wallets w
SET balance = COALESCE((
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN t.type = 'refund' THEN t.amount ELSE 0 END), 0)
  FROM transactions t
  JOIN bookings b ON t.booking_id = b.id
  JOIN workspaces ws ON b.workspace_id = ws.id
  WHERE ws.host_id = w.host_id
    AND t.status IN ('successful', 'completed')
), 0),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM transactions t
  JOIN bookings b ON t.booking_id = b.id
  JOIN workspaces ws ON b.workspace_id = ws.id
  WHERE ws.host_id = w.host_id
);

-- ================================================================
-- CREATE ADMIN LOGS TABLE (if not exists)
-- PRD Section 12 - Admin action logging
-- ================================================================

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE admin_logs 
  ADD CONSTRAINT fk_admin_logs_admin 
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id 
  ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action 
  ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at 
  ON admin_logs(created_at);

-- ================================================================
-- UPDATE TRANSACTIONS TABLE TO INCLUDE WALLET ID
-- ================================================================

-- Add wallet_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'wallet_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN wallet_id UUID;
    
    -- Add foreign key constraint
    ALTER TABLE transactions 
      ADD CONSTRAINT fk_transactions_wallet 
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================================
-- UPDATE EXISTING TRANSACTIONS TO HAVE WALLET ID
-- ================================================================

UPDATE transactions t
SET wallet_id = (
  SELECT w.id 
  FROM wallets w
  JOIN bookings b ON t.booking_id = b.id
  JOIN workspaces ws ON b.workspace_id = ws.id
  WHERE ws.host_id = w.host_id
  LIMIT 1
)
WHERE t.wallet_id IS NULL 
  AND t.type IN ('payment', 'payout', 'refund');

-- ================================================================
-- ADD ADDITIONAL TRANSACTION COLUMNS (if not exist)
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payment_method VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'provider_fee'
  ) THEN
    ALTER TABLE transactions ADD COLUMN provider_fee DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'webhook_idempotency_key'
  ) THEN
    ALTER TABLE transactions ADD COLUMN webhook_idempotency_key VARCHAR(255) UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'webhook_attempts'
  ) THEN
    ALTER TABLE transactions ADD COLUMN webhook_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'last_webhook_attempt'
  ) THEN
    ALTER TABLE transactions ADD COLUMN last_webhook_attempt TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE transactions ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- ================================================================
-- ADD PAYMENT ATTEMPTS TO BOOKINGS (if not exist)
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'payment_attempts'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'last_payment_attempt'
  ) THEN
    ALTER TABLE bookings ADD COLUMN last_payment_attempt TIMESTAMP;
  END IF;
END $$;