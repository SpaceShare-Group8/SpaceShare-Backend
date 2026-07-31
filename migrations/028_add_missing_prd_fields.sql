-- ================================================================
-- SpaceShare Database Migration: 024_add_missing_prd_fields.sql
-- 
-- Description: Add missing fields to align with PRD Section 14
-- This migration adds ONLY what's missing from the existing schema
-- 
-- Date: 2026-07-30
-- ================================================================

BEGIN;

-- ================================================================
-- 1. USERS TABLE - Add refresh_token for JWT management
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'refresh_token'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN refresh_token TEXT;
        RAISE NOTICE '✅ Added refresh_token to users table';
    ELSE
        RAISE NOTICE '⏭️  refresh_token already exists in users table';
    END IF;
END $$;

-- ================================================================
-- 2. BOOKINGS TABLE - Add payment and check-in tracking fields
-- ================================================================

-- Add total_amount for booking value tracking (PRD 11.8)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN total_amount DECIMAL(10, 2);
        RAISE NOTICE '✅ Added total_amount to bookings table';
    ELSE
        RAISE NOTICE '⏭️  total_amount already exists in bookings table';
    END IF;
END $$;

-- Add failed_checkin_attempts for rate limiting (PRD 11.11)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'failed_checkin_attempts'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN failed_checkin_attempts INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added failed_checkin_attempts to bookings table';
    ELSE
        RAISE NOTICE '⏭️  failed_checkin_attempts already exists in bookings table';
    END IF;
END $$;

-- Add cancellation_reason for audit trail
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE '✅ Added cancellation_reason to bookings table';
    ELSE
        RAISE NOTICE '⏭️  cancellation_reason already exists in bookings table';
    END IF;
END $$;

-- Add commission_amount for tracking platform revenue
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'commission_amount'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN commission_amount DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added commission_amount to bookings table';
    ELSE
        RAISE NOTICE '⏭️  commission_amount already exists in bookings table';
    END IF;
END $$;

-- ================================================================
-- 3. WORKSPACES TABLE - Add reliability scoring fields
-- ================================================================

-- Add reliability_score for quick access (PRD 10.3)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'workspaces' 
        AND column_name = 'reliability_score'
    ) THEN
        ALTER TABLE workspaces 
        ADD COLUMN reliability_score DECIMAL(5, 2) DEFAULT 0;
        RAISE NOTICE '✅ Added reliability_score to workspaces table';
    ELSE
        RAISE NOTICE '⏭️  reliability_score already exists in workspaces table';
    END IF;
END $$;

-- Add review_count for quick display
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'workspaces' 
        AND column_name = 'review_count'
    ) THEN
        ALTER TABLE workspaces 
        ADD COLUMN review_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added review_count to workspaces table';
    ELSE
        RAISE NOTICE '⏭️  review_count already exists in workspaces table';
    END IF;
END $$;

-- ================================================================
-- 4. FAVORITES TABLE - Create if it doesn't exist (PRD 11.4a)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'favorites'
    ) THEN
        CREATE TABLE favorites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            workspace_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, workspace_id)
        );
        RAISE NOTICE '✅ Created favorites table';
    ELSE
        RAISE NOTICE '⏭️  favorites table already exists';
    END IF;
END $$;

-- ================================================================
-- 5. WALLETS TABLE - Create if it doesn't exist (PRD 11.8)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'wallets'
    ) THEN
        CREATE TABLE wallets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            host_id UUID NOT NULL,
            balance DECIMAL(10, 2) DEFAULT 0,
            currency VARCHAR(3) DEFAULT 'NGN',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(host_id)
        );
        RAISE NOTICE '✅ Created wallets table';
    ELSE
        RAISE NOTICE '⏭️  wallets table already exists';
    END IF;
END $$;

-- ================================================================
-- 6. REVIEWS TABLE - Create if it doesn't exist (PRD 11.12)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'reviews'
    ) THEN
        CREATE TABLE reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL,
            reviewer_id UUID NOT NULL,
            reviewee_id UUID NOT NULL,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(booking_id, reviewer_id, reviewee_id)
        );
        RAISE NOTICE '✅ Created reviews table';
    ELSE
        RAISE NOTICE '⏭️  reviews table already exists';
    END IF;
END $$;

-- ================================================================
-- 7. RELIABILITY REVIEWS TABLE - Create if it doesn't exist (PRD 10.3)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'reliabilityreviews'
    ) THEN
        CREATE TABLE reliabilityreviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL,
            workspace_id UUID NOT NULL,
            power_stable BOOLEAN DEFAULT TRUE,
            internet_as_described BOOLEAN DEFAULT TRUE,
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(booking_id)
        );
        RAISE NOTICE '✅ Created reliabilityreviews table';
    ELSE
        RAISE NOTICE '⏭️  reliabilityreviews table already exists';
    END IF;
END $$;

-- ================================================================
-- 8. SUPPORT TICKETS TABLE - Create if it doesn't exist (PRD 16.8)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'supporttickets'
    ) THEN
        CREATE TABLE supporttickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            category VARCHAR(50) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'open',
            priority VARCHAR(20) DEFAULT 'normal',
            assigned_to UUID,
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created supporttickets table';
    ELSE
        RAISE NOTICE '⏭️  supporttickets table already exists';
    END IF;
END $$;

-- ================================================================
-- 9. DISPUTES TABLE - Create if it doesn't exist (PRD 16.8)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'disputes'
    ) THEN
        CREATE TABLE disputes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL,
            filed_by UUID NOT NULL,
            reason TEXT NOT NULL,
            evidence TEXT,
            status VARCHAR(20) DEFAULT 'open',
            resolution TEXT,
            resolved_by_admin_id UUID,
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created disputes table';
    ELSE
        RAISE NOTICE '⏭️  disputes table already exists';
    END IF;
END $$;

-- ================================================================
-- 10. NOTIFICATIONS TABLE - Create if it doesn't exist (PRD 11.10)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'system',
            payload JSONB DEFAULT '{}'::jsonb,
            read_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created notifications table';
    ELSE
        RAISE NOTICE '⏭️  notifications table already exists';
    END IF;
END $$;

-- ================================================================
-- 11. BOOKING CHECK-INS TABLE - Create if it doesn't exist (PRD 10.7)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'bookingcheckins'
    ) THEN
        CREATE TABLE bookingcheckins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL,
            checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            checked_out_at TIMESTAMP WITH TIME ZONE,
            method VARCHAR(50) DEFAULT '6-digit-code',
            host_id UUID,
            metadata JSONB DEFAULT '{}'::jsonb
        );
        RAISE NOTICE '✅ Created bookingcheckins table';
    ELSE
        RAISE NOTICE '⏭️  bookingcheckins table already exists';
    END IF;
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 024 completed successfully!';
END $$;

COMMIT;
