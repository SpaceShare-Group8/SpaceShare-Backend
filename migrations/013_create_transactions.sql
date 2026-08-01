-- Migration: 013_create_transactions
-- Table: transactions
-- Notes: Stores payment, payout, and refund transactions

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        -- Table doesn't exist, create it
        CREATE TABLE transactions (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id          UUID,
            wallet_id           UUID,
            corporate_account_id UUID,
            payment_reference   VARCHAR(255),
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
        
        RAISE NOTICE '✅ Created transactions table';
    ELSE
        -- Table exists, check and add missing columns
        RAISE NOTICE '⏭️  transactions table already exists, checking structure...';

        -- Add wallet_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'wallet_id'
        ) THEN
            ALTER TABLE transactions ADD COLUMN wallet_id UUID;
            RAISE NOTICE '✅ Added wallet_id column to transactions';
        END IF;

        -- Add corporate_account_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'corporate_account_id'
        ) THEN
            ALTER TABLE transactions ADD COLUMN corporate_account_id UUID;
            RAISE NOTICE '✅ Added corporate_account_id column to transactions';
        END IF;

        -- Add payment_reference column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'payment_reference'
        ) THEN
            ALTER TABLE transactions ADD COLUMN payment_reference VARCHAR(255);
            RAISE NOTICE '✅ Added payment_reference column to transactions';
        END IF;

        -- Add commission_amount column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'commission_amount'
        ) THEN
            ALTER TABLE transactions ADD COLUMN commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
            RAISE NOTICE '✅ Added commission_amount column to transactions';
        END IF;

        -- Add booking_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'booking_id'
        ) THEN
            ALTER TABLE transactions ADD COLUMN booking_id UUID;
            RAISE NOTICE '✅ Added booking_id column to transactions';
        END IF;

        -- Add amount column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'amount'
        ) THEN
            ALTER TABLE transactions ADD COLUMN amount DECIMAL(12, 2) NOT NULL DEFAULT 0;
            RAISE NOTICE '✅ Added amount column to transactions';
        END IF;

        -- Add type column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'type'
        ) THEN
            ALTER TABLE transactions ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'payment';
            -- Add check constraint if missing
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.constraint_column_usage 
                WHERE table_name = 'transactions' AND constraint_name LIKE '%transactions_type_check%'
            ) THEN
                ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
                    CHECK (type IN ('payment', 'payout', 'refund'));
            END IF;
            RAISE NOTICE '✅ Added type column to transactions';
        END IF;

        -- Add status column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'status'
        ) THEN
            ALTER TABLE transactions ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending';
            -- Add check constraint if missing
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.constraint_column_usage 
                WHERE table_name = 'transactions' AND constraint_name LIKE '%transactions_status_check%'
            ) THEN
                ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
                    CHECK (status IN ('pending', 'completed', 'failed'));
            END IF;
            RAISE NOTICE '✅ Added status column to transactions';
        END IF;

        -- Add updated_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            RAISE NOTICE '✅ Added updated_at column to transactions';
        END IF;

        -- Create indexes if missing
        CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions (booking_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions (wallet_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_corporate ON transactions (corporate_account_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
        CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions (payment_reference);

        RAISE NOTICE '✅ transactions table structure verified';
    END IF;
END $$;