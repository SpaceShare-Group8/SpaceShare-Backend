CREATE TABLE bookings(
    id SERIAL PRIMARY KEY,

    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
    seeker_id INTEGER NOT NULL REFERENCES users(id),
    
    corporate_account_id INTEGER REFERENCES corporate_accounts(id),

    start_time TIMESTAMP NOT NULL,

    end_time TIMESTAMP NOT NULL,

    mode VARCHAR(20) NOT NULL,

    status VARCHAR(20) NOT NULL,

    checkin_code VARCHAR(50)
);