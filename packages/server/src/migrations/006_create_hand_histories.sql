-- Migration: 006_create_hand_histories
-- Description: Create hand_histories table for storing completed hand records

CREATE TABLE hand_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL,
    community_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    players JSONB NOT NULL DEFAULT '[]'::jsonb,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    pot_total INTEGER NOT NULL DEFAULT 0,
    played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_hand_number CHECK (hand_number > 0),
    CONSTRAINT chk_pot_total CHECK (pot_total >= 0)
);

-- Index for finding hands in a tournament
CREATE INDEX idx_hand_histories_tournament_id ON hand_histories (tournament_id);

-- Index for finding the latest hand in a tournament
CREATE INDEX idx_hand_histories_tournament_hand ON hand_histories (tournament_id, hand_number DESC);

-- Index for time-based queries
CREATE INDEX idx_hand_histories_played_at ON hand_histories (played_at);
