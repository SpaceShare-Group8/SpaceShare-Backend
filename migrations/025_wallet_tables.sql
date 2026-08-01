-- ================================================================
-- MIGRATION: 025_wallet_tables
-- Description: Wallet system tables - Wallets, Withdrawals, Payouts
-- PRD Sections: 10.8, 11.8, 11.15
-- Dependencies: 001_initial_schema (Users, Bookings, Workspaces)
-- ================================================================

-- ================================================================
-- WITHDRAWAL REQUESTS TABLE
-- PRD Section 11.8 - Host withdrawal requests
-- ================================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  bank_code VARCHAR(10) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reference VARCHAR(50) UNIQUE NOT NULL,
  failure_reason TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE withdrawal_requests 
  ADD CONSTRAINT fk_withdrawal_requests_host 
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE;

-- ================================================================
-- PAYOUT SCHEDULES TABLE
-- PRD Section 10.8 - 24-hour hold period
-- ================================================================

CREATE TABLE IF NOT EXISTS payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_date TIMESTAMP NOT NULL,
  completed_date TIMESTAMP,
  failed_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE payout_schedules 
  ADD CONSTRAINT fk_payout_schedules_host 
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE payout_schedules 
  ADD CONSTRAINT fk_payout_schedules_booking 
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- ================================================================
-- WITHDRAWAL LIMITS TABLE
-- PRD Section 11.8 - Withdrawal limits
-- ================================================================

CREATE TABLE IF NOT EXISTS withdrawal_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  daily_limit DECIMAL(10,2) DEFAULT 500000,
  weekly_limit DECIMAL(10,2) DEFAULT 2000000,
  daily_used DECIMAL(10,2) DEFAULT 0,
  weekly_used DECIMAL(10,2) DEFAULT 0,
  daily_reset_at TIMESTAMP DEFAULT NOW(),
  weekly_reset_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE withdrawal_limits 
  ADD CONSTRAINT fk_withdrawal_limits_host 
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add unique constraint
ALTER TABLE withdrawal_limits 
  ADD CONSTRAINT uq_withdrawal_limits_host 
  UNIQUE (host_id);

-- ================================================================
-- REVIEW REQUESTS TABLE
-- PRD Section 10.3 - Reliability review requests
-- ================================================================

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  user_id UUID NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE review_requests 
  ADD CONSTRAINT fk_review_requests_booking 
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE review_requests 
  ADD CONSTRAINT fk_review_requests_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ================================================================
-- SYSTEM LOGS TABLE
-- PRD Section 12 - System logging
-- ================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- ADMIN LOGS TABLE
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

-- ================================================================
-- INDEXES FOR WALLET SYSTEM
-- ================================================================

-- Withdrawal requests indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_host_id 
  ON withdrawal_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status 
  ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_reference 
  ON withdrawal_requests(reference);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at 
  ON withdrawal_requests(created_at);

-- Payout schedules indexes
CREATE INDEX IF NOT EXISTS idx_payout_schedules_host_id 
  ON payout_schedules(host_id);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_booking_id 
  ON payout_schedules(booking_id);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_status 
  ON payout_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_scheduled_date 
  ON payout_schedules(scheduled_date);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_action 
  ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at 
  ON system_logs(created_at);

-- Admin logs indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id 
  ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action 
  ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at 
  ON admin_logs(created_at);

-- Review requests indexes
CREATE INDEX IF NOT EXISTS idx_review_requests_booking_id 
  ON review_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_user_id 
  ON review_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status 
  ON review_requests(status);

-- ================================================================
-- UPDATE TRIGGER FOR TABLES WITH updated_at
-- ================================================================

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to new tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'withdrawal_requests', 'payout_schedules', 'withdrawal_limits'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END;
$$;