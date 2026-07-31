-- Migration: 019_create_disputes
-- Table: disputes
-- Notes: Stores disputes raised after bookings for admin resolution.
-- PRD Section 14: Disputes (id, booking_id, filed_by, status, resolution, resolved_by_admin_id)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disputes') THEN
        -- Table doesn't exist, create it (using PRD field names)
        CREATE TABLE disputes (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id          UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
            filed_by            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            reason              TEXT NOT NULL,
            evidence            TEXT,
            status              VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
            resolution          TEXT,
            resolved_by_admin_id UUID REFERENCES users (id) ON DELETE SET NULL,
            resolved_at         TIMESTAMPTZ,
            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes (booking_id);
        CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes (filed_by);
        CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
        
        RAISE NOTICE '✅ Created disputes table (PRD schema)';
    ELSE
        -- Table exists, check and add missing columns
        RAISE NOTICE '⏭️  disputes table already exists, checking structure...';

        -- Check what columns exist to avoid errors
        -- filed_by_user_id vs filed_by - handle both
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'filed_by'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'filed_by_user_id'
        ) THEN
            -- Neither exists, add filed_by
            ALTER TABLE disputes ADD COLUMN filed_by UUID REFERENCES users (id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added filed_by column to disputes';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'filed_by_user_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'filed_by'
        ) THEN
            -- filed_by_user_id exists, rename to filed_by
            ALTER TABLE disputes RENAME COLUMN filed_by_user_id TO filed_by;
            RAISE NOTICE '✅ Renamed filed_by_user_id to filed_by';
        END IF;

        -- Add evidence column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'evidence'
        ) THEN
            ALTER TABLE disputes ADD COLUMN evidence TEXT;
            RAISE NOTICE '✅ Added evidence column to disputes';
        END IF;

        -- Add resolved_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'resolved_at'
        ) THEN
            ALTER TABLE disputes ADD COLUMN resolved_at TIMESTAMPTZ;
            RAISE NOTICE '✅ Added resolved_at column to disputes';
        END IF;

        -- Add updated_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE disputes ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            RAISE NOTICE '✅ Added updated_at column to disputes';
        END IF;

        -- Add reason column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'reason'
        ) THEN
            ALTER TABLE disputes ADD COLUMN reason TEXT NOT NULL;
            RAISE NOTICE '✅ Added reason column to disputes';
        END IF;

        -- Add booking_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'booking_id'
        ) THEN
            ALTER TABLE disputes ADD COLUMN booking_id UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added booking_id column to disputes';
        END IF;

        -- Add status column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'status'
        ) THEN
            ALTER TABLE disputes ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed'));
            RAISE NOTICE '✅ Added status column to disputes';
        END IF;

        -- Add resolution column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'resolution'
        ) THEN
            ALTER TABLE disputes ADD COLUMN resolution TEXT;
            RAISE NOTICE '✅ Added resolution column to disputes';
        END IF;

        -- Add resolved_by_admin_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'resolved_by_admin_id'
        ) THEN
            ALTER TABLE disputes ADD COLUMN resolved_by_admin_id UUID REFERENCES users (id) ON DELETE SET NULL;
            RAISE NOTICE '✅ Added resolved_by_admin_id column to disputes';
        END IF;

        -- Create indexes if missing
        CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes (booking_id);
        CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes (filed_by);
        CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);

        RAISE NOTICE '✅ disputes table structure verified (PRD schema)';
    END IF;
END $$;