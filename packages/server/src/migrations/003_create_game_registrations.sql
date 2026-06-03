-- Migration: 003_create_game_registrations
-- Description: Create game_registrations table for tracking player registrations to game instances

CREATE TABLE game_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_instance_id UUID NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- A player can only register once per game instance
    CONSTRAINT uq_game_registration UNIQUE (game_instance_id, player_id)
);

-- Index for looking up registrations by game instance
CREATE INDEX idx_game_registrations_game_instance_id ON game_registrations (game_instance_id);

-- Index for looking up a player's registrations
CREATE INDEX idx_game_registrations_player_id ON game_registrations (player_id);
