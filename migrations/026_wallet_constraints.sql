-- ================================================================
-- MIGRATION: 026_wallet_constraints
-- Description: Data integrity constraints for wallet system
-- PRD Sections: 10.8, 11.8
-- ================================================================

-- ================================================================
-- ADD CHECK CONSTRAINTS FOR AMOUNTS
-- ================================================================

-- Ensure withdrawal amounts are positive
ALTER TABLE withdrawal_requests 
  DROP CONSTRAINT IF EXISTS chk_withdrawal_requests_amount_positive;

ALTER TABLE withdrawal_requests 
  ADD CONSTRAINT chk_withdrawal_requests_amount_positive 
  CHECK (amount > 0);

-- Ensure payout amounts are positive
ALTER TABLE payout_schedules 
  DROP CONSTRAINT IF EXISTS chk_payout_schedules_amount_positive;

ALTER TABLE payout_schedules 
  ADD CONSTRAINT chk_payout_schedules_amount_positive 
  CHECK (amount > 0);

-- ================================================================
-- ADD CHECK CONSTRAINTS FOR WITHDRAWAL LIMITS
-- ================================================================

-- Ensure limits are non-negative
ALTER TABLE withdrawal_limits 
  DROP CONSTRAINT IF EXISTS chk_withdrawal_limits_daily_limit;

ALTER TABLE withdrawal_limits 
  ADD CONSTRAINT chk_withdrawal_limits_daily_limit 
  CHECK (daily_limit >= 0);

ALTER TABLE withdrawal_limits 
  DROP CONSTRAINT IF EXISTS chk_withdrawal_limits_weekly_limit;

ALTER TABLE withdrawal_limits 
  ADD CONSTRAINT chk_withdrawal_limits_weekly_limit 
  CHECK (weekly_limit >= 0);

ALTER TABLE withdrawal_limits 
  DROP CONSTRAINT IF EXISTS chk_withdrawal_limits_daily_used;

ALTER TABLE withdrawal_limits 
  ADD CONSTRAINT chk_withdrawal_limits_daily_used 
  CHECK (daily_used >= 0);

ALTER TABLE withdrawal_limits 
  DROP CONSTRAINT IF EXISTS chk_withdrawal_limits_weekly_used;

ALTER TABLE withdrawal_limits 
  ADD CONSTRAINT chk_withdrawal_limits_weekly_used 
  CHECK (weekly_used >= 0);

-- ================================================================
-- ADD CHECK CONSTRAINTS FOR WITHDRAWAL STATUS
-- ================================================================

ALTER TABLE withdrawal_requests 
  DROP CONSTRAINT IF EXISTS chk_withdrawal_requests_status;

ALTER TABLE withdrawal_requests 
  ADD CONSTRAINT chk_withdrawal_requests_status 
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'review_required'));

-- ================================================================
-- ADD CHECK CONSTRAINTS FOR PAYOUT STATUS
-- ================================================================

ALTER TABLE payout_schedules 
  DROP CONSTRAINT IF EXISTS chk_payout_schedules_status;

ALTER TABLE payout_schedules 
  ADD CONSTRAINT chk_payout_schedules_status 
  CHECK (status IN ('pending', 'ready', 'processing', 'completed', 'failed', 'cancelled'));

-- ================================================================
-- ADD CHECK CONSTRAINTS FOR REVIEW REQUESTS
-- ================================================================

ALTER TABLE review_requests 
  DROP CONSTRAINT IF EXISTS chk_review_requests_status;

ALTER TABLE review_requests 
  ADD CONSTRAINT chk_review_requests_status 
  CHECK (status IN ('pending', 'sent', 'responded', 'expired'));

-- ================================================================
-- ADD CHECK CONSTRAINT FOR WALLETS
-- ================================================================

ALTER TABLE wallets 
  DROP CONSTRAINT IF EXISTS chk_wallets_balance_non_negative;

ALTER TABLE wallets 
  ADD CONSTRAINT chk_wallets_balance_non_negative 
  CHECK (balance >= 0);

-- ================================================================
-- ADD CHECK CONSTRAINT FOR BOOKING TIMES
-- ================================================================

ALTER TABLE bookings 
  DROP CONSTRAINT IF EXISTS chk_bookings_time_valid;

ALTER TABLE bookings 
  ADD CONSTRAINT chk_bookings_time_valid 
  CHECK (end_time > start_time);

-- ================================================================
-- CREATE WITHDRAWAL LIMITS FOR ALL EXISTING HOSTS
-- (Skip if already exists)
-- ================================================================

INSERT INTO withdrawal_limits (host_id, daily_limit, weekly_limit, created_at, updated_at)
SELECT 
  u.id,
  500000,
  2000000,
  NOW(),
  NOW()
FROM users u
WHERE u.role = 'host'
AND NOT EXISTS (
  SELECT 1 FROM withdrawal_limits wl WHERE wl.host_id = u.id
);

-- ================================================================
-- CREATE WALLETS FOR HOSTS THAT DON'T HAVE ONE
-- (Skip if wallet already exists)
-- ================================================================

INSERT INTO wallets (host_id, balance, currency, created_at, updated_at)
SELECT 
  u.id,
  0,
  'NGN',
  NOW(),
  NOW()
FROM users u
WHERE u.role = 'host'
AND NOT EXISTS (
  SELECT 1 FROM wallets w WHERE w.host_id = u.id
);