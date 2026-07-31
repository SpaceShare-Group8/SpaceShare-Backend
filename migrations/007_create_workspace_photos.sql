-- Migration: 007_create_workspace_photos
-- Table: workspace_photos
-- Notes: cloudinary_public_id is stored alongside the URL so photos can be
--        deleted/replaced via the Cloudinary API without re-parsing the URL.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_photos') THEN
        -- Table doesn't exist, create it
        CREATE TABLE workspace_photos (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id            UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
            photo_url               TEXT NOT NULL,
            cloudinary_public_id    VARCHAR(255),
            is_cover                BOOLEAN NOT NULL DEFAULT FALSE,
            display_order           INTEGER NOT NULL DEFAULT 0,
            created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_workspace_photos_workspace_id ON workspace_photos (workspace_id);

        -- Only one cover photo per workspace
        CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_photos_single_cover
            ON workspace_photos (workspace_id)
            WHERE is_cover = TRUE;
            
        RAISE NOTICE '✅ Created workspace_photos table';
    ELSE
        -- Table exists, check and add missing columns
        RAISE NOTICE '⏭️  workspace_photos table already exists, checking structure...';

        -- Add is_cover column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workspace_photos' AND column_name = 'is_cover'
        ) THEN
            ALTER TABLE workspace_photos ADD COLUMN is_cover BOOLEAN NOT NULL DEFAULT FALSE;
            RAISE NOTICE '✅ Added is_cover column to workspace_photos';
        END IF;

        -- Add cloudinary_public_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workspace_photos' AND column_name = 'cloudinary_public_id'
        ) THEN
            ALTER TABLE workspace_photos ADD COLUMN cloudinary_public_id VARCHAR(255);
            RAISE NOTICE '✅ Added cloudinary_public_id column to workspace_photos';
        END IF;

        -- Add display_order column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workspace_photos' AND column_name = 'display_order'
        ) THEN
            ALTER TABLE workspace_photos ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
            RAISE NOTICE '✅ Added display_order column to workspace_photos';
        END IF;

        -- Add photo_url column if missing (should exist, but just in case)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workspace_photos' AND column_name = 'photo_url'
        ) THEN
            ALTER TABLE workspace_photos ADD COLUMN photo_url TEXT NOT NULL;
            RAISE NOTICE '✅ Added photo_url column to workspace_photos';
        END IF;

        -- Add workspace_id column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workspace_photos' AND column_name = 'workspace_id'
        ) THEN
            ALTER TABLE workspace_photos ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added workspace_id column to workspace_photos';
        END IF;

        -- Create indexes if missing
        CREATE INDEX IF NOT EXISTS idx_workspace_photos_workspace_id ON workspace_photos (workspace_id);

        -- Create unique index for single cover if missing
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'workspace_photos' AND indexname = 'uq_workspace_photos_single_cover'
        ) THEN
            CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_photos_single_cover
                ON workspace_photos (workspace_id)
                WHERE is_cover = TRUE;
            RAISE NOTICE '✅ Added unique index for cover photo';
        END IF;

        RAISE NOTICE '✅ workspace_photos table structure verified';
    END IF;
END $$;