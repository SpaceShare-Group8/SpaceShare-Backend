-- CREATE TABLE favorites (
--     id SERIAL PRIMARY KEY,

--     user_id INTEGER NOT NULL REFERENCES users(id),

--     workspace_id INTEGER NOT NULL REFERENCES workspaces(id),

--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );


#######################################################

-- Migration: 013_create_favorites
-- Table: Favorites

CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id
ON favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_workspace_id
ON favorites (workspace_id);