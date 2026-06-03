-- Migration: 005_create_tournament_players
-- Description: Create tournament_players table for tracking player state within tournaments

CREATE TABLE tournament_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    chip_count INTEGER NOT NULL DEFAULT 500,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    finish_position INTEGER,
    eliminated_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_tp_status CHECK (status IN ('active', 'eliminated')),
    CONSTRAINT chk_chip_count CHECK (chip_count >= 0),
    CONSTRAINT chk_finish_position CHECK (finish_position IS NULL OR (finish_position >= 1 AND finish_position <= 6)),
    -- A player can only be in a tournament once
    CONSTRAINT uq_tournament_player UNIQUE (tournament_id, player_id)
);

-- Index for finding players in a tournament
CREATE INDEX idx_tournament_players_tournament_id ON tournament_players (tournament_id);

-- Index for finding a player's tournament history
CREATE INDEX idx_tournament_players_player_id ON tournament_players (player_id);

-- Index for finding active players in a tournament
CREATE INDEX idx_tournament_players_status ON tournament_players (tournament_id, status) WHERE status = 'active';
