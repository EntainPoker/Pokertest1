-- Migration: 001_create_players
-- Description: Create players table for user accounts

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance INTEGER NOT NULL DEFAULT 1000,
    is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Index for username lookups during authentication
CREATE INDEX idx_players_username ON players (username);

-- Index for filtering test accounts
CREATE INDEX idx_players_is_test_account ON players (is_test_account) WHERE is_test_account = TRUE;
