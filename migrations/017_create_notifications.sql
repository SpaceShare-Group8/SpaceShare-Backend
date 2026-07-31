-- Migration: 017_create_notifications
-- Table: notifications
-- Notes: Stores notifications sent to users.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Table doesn't exist, create it
        CREATE TABLE notifications (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
            title           VARCHAR(150) NOT NULL,
            message         TEXT NOT NULL,
            type            VARCHAR(30) NOT NULL CHECK (type IN ('booking', 'payment', 'support', 'reminder', 'system')),
            payload         JSONB,
            is_read         BOOLEAN NOT NULL DEFAULT FALSE,
            read_at         TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);
        
        RAISE NOTICE '✅ Created notifications table';
    ELSE
        -- Table exists, check and add missing columns
        RAISE NOTICE '⏭️  notifications table already exists, checking structure...';

        -- Add is_read column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'is_read'
        ) THEN
            ALTER TABLE notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
            RAISE NOTICE '✅ Added is_read column to notifications';
        END IF;

        -- Add read_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'read_at'
        ) THEN
            ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
            RAISE NOTICE '✅ Added read_at column to notifications';
        END IF;

        -- Add payload column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'payload'
        ) THEN
            ALTER TABLE notifications ADD COLUMN payload JSONB;
            RAISE NOTICE '✅ Added payload column to notifications';
        END IF;

        -- Add updated_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            RAISE NOTICE '✅ Added updated_at column to notifications';
        END IF;

        -- Add user_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE notifications ADD COLUMN user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added user_id column to notifications';
        END IF;

        -- Add title column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'title'
        ) THEN
            ALTER TABLE notifications ADD COLUMN title VARCHAR(150) NOT NULL;
            RAISE NOTICE '✅ Added title column to notifications';
        END IF;

        -- Add message column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'message'
        ) THEN
            ALTER TABLE notifications ADD COLUMN message TEXT NOT NULL;
            RAISE NOTICE '✅ Added message column to notifications';
        END IF;

        -- Add type column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'type'
        ) THEN
            ALTER TABLE notifications ADD COLUMN type VARCHAR(30) NOT NULL CHECK (type IN ('booking', 'payment', 'support', 'reminder', 'system'));
            RAISE NOTICE '✅ Added type column to notifications';
        END IF;

        -- Create indexes if missing
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);

        RAISE NOTICE '✅ notifications table structure verified';
    END IF;
END $$;