CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(id),

    workspace_id INTEGER NOT NULL REFERENCES workspaces(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);