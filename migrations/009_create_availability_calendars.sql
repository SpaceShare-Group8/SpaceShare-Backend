CREATE TABLE availability_calendars(
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),

    date DATE NOT NULL,
    start_time TIME NOT NULL, 
    end_time TIME NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,

    UNIQUE (workspace_id, date, start_time)
);