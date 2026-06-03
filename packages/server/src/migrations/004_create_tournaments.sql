-- Migration: 004_create_tournaments
-- Description: Create tournaments table for active tournament tracking

CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
    current_blind_level INTEGER NOT NULL DEFAULT 1,
    prize_pool INTEGER NOT NULL DEFAULT 0,
    winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_tournament_status CHECK (status IN ('active', 'completed')),
    CONSTRAINT chk_blind_level CHECK (current_blind_level >= 1 AND current_blind_level <= 8),
    CONSTRAINT chk_prize_pool CHECK (prize_pool >= 0)
);

-- Index for finding tournaments by game instance
CREATE INDEX idx_tournaments_game_instance_id ON tournaments (game_instance_id);

-- Index for finding active tournaments
CREATE INDEX idx_tournaments_status ON tournaments (status) WHERE status = 'active';

-- Index for winner lookups
CREATE INDEX idx_tournaments_winner_id ON tournaments (winner_id);
