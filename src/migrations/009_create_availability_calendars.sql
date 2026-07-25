-- CREATE TABLE availability_calendars(
--     id SERIAL PRIMARY KEY,
--     workspace_id INTEGER NOT NULL REFERENCES workspaces(id),

--     date DATE NOT NULL,
--     start_time TIME NOT NULL, 
--     end_time TIME NOT NULL,
--     is_blocked BOOLEAN DEFAULT FALSE,

--     UNIQUE (workspace_id, date, start_time)
-- );




-- Migration: 009_create_availability_calendars
-- Table: AvailabilityCalendars

CREATE TABLE IF NOT EXISTS availability_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (end_time > start_time),

    UNIQUE (workspace_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_workspace_id
ON availability_calendars (workspace_id);