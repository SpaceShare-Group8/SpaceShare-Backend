-- Migration: 031_create_search_history.sql

CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    search_term TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user
ON search_history(user_id);

CREATE INDEX IF NOT EXISTS idx_search_history_created_at
ON search_history(created_at DESC);