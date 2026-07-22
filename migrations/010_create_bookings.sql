-- CREATE TABLE bookings(
--     id SERIAL PRIMARY KEY,

--     workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
--     seeker_id INTEGER NOT NULL REFERENCES users(id),
    
--     corporate_account_id INTEGER REFERENCES corporate_accounts(id),

--     start_time TIMESTAMP NOT NULL,

--     end_time TIMESTAMP NOT NULL,

--     mode VARCHAR(20) NOT NULL,

--     status VARCHAR(20) NOT NULL,

--     checkin_code VARCHAR(50)
-- );


#########################################

-- Migration: 010_create_bookings
-- Table: Bookings

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,

     corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,


    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    mode VARCHAR(20) NOT NULL
        CHECK (mode IN ('instant', 'request')),

    status VARCHAR(20) NOT NULL
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),

    checkin_code VARCHAR(6),
    CHECK (checkin_code ~ '^[0-9]{6}$')

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_workspace_id
ON bookings (workspace_id);

CREATE INDEX IF NOT EXISTS idx_bookings_seeker_id
ON bookings (seeker_id);


CREATE INDEX IF NOT EXISTS idx_bookings_status
ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_start_time
ON bookings(start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_corporate_account
ON bookings(corporate_account_id);