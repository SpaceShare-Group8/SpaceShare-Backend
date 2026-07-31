-- Migration: 006_create_workspace_amenities
-- Table: workspace_amenities
-- Notes: One row per amenity so filtering ("workspaces with WiFi + parking")
--        is a simple join instead of parsing a text/array column.

-- Check if table exists before creating
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_amenities') THEN
        CREATE TABLE workspace_amenities (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id    UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
            amenity_name    VARCHAR(100) NOT NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (workspace_id, amenity_name)
        );

        CREATE INDEX IF NOT EXISTS idx_workspace_amenities_workspace_id ON workspace_amenities (workspace_id);
        CREATE INDEX IF NOT EXISTS idx_workspace_amenities_name ON workspace_amenities (amenity_name);
        
        RAISE NOTICE '✅ Created workspace_amenities table';
    ELSE
        -- Check if amenity_name column exists, add if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workspace_amenities' AND column_name = 'amenity_name'
        ) THEN
            ALTER TABLE workspace_amenities ADD COLUMN amenity_name VARCHAR(100) NOT NULL;
            RAISE NOTICE '✅ Added amenity_name column to workspace_amenities';
        END IF;

        -- Check if workspace_id column exists, add if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workspace_amenities' AND column_name = 'workspace_id'
        ) THEN
            ALTER TABLE workspace_amenities ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Added workspace_id column to workspace_amenities';
        END IF;

        -- Add unique constraint if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'workspace_amenities' AND constraint_name = 'workspace_amenities_workspace_id_amenity_name_key'
        ) THEN
            ALTER TABLE workspace_amenities ADD CONSTRAINT workspace_amenities_workspace_id_amenity_name_key UNIQUE (workspace_id, amenity_name);
            RAISE NOTICE '✅ Added unique constraint to workspace_amenities';
        END IF;

        -- Create indexes if missing
        CREATE INDEX IF NOT EXISTS idx_workspace_amenities_workspace_id ON workspace_amenities (workspace_id);
        CREATE INDEX IF NOT EXISTS idx_workspace_amenities_name ON workspace_amenities (amenity_name);
        
        RAISE NOTICE '⏭️  workspace_amenities table already exists, verified structure';
    END IF;
END $$;