-- Migration: 002_create_game_instances
-- Description: Create game_instances table for Spin and Go game management

CREATE TABLE game_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50) NOT NULL DEFAULT 'texas_holdem',
    max_players INTEGER NOT NULL DEFAULT 3,
    buy_in INTEGER NOT NULL DEFAULT 1,
    starting_chips INTEGER NOT NULL DEFAULT 500,
    blind_interval_minutes INTEGER NOT NULL DEFAULT 3,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES players(id) ON DELETE SET NULL,

    CONSTRAINT chk_max_players CHECK (max_players >= 2 AND max_players <= 6),
    CONSTRAINT chk_buy_in CHECK (buy_in >= 0),
    CONSTRAINT chk_starting_chips CHECK (starting_chips > 0),
    CONSTRAINT chk_blind_interval CHECK (blind_interval_minutes > 0),
    CONSTRAINT chk_status CHECK (status IN ('open', 'full', 'in_progress', 'completed'))
);

-- Index for lobby queries: find open games that haven't expired
CREATE INDEX idx_game_instances_status ON game_instances (status);
CREATE INDEX idx_game_instances_end_date ON game_instances (end_date);
CREATE INDEX idx_game_instances_status_end_date ON game_instances (status, end_date) WHERE status = 'open';
CREATE INDEX idx_game_instances_created_by ON game_instances (created_by);
