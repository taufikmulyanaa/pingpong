-- Migration: 013_tournament_matches.sql
-- Tournament bracket match storage

-- Create tournament_matches table for storing bracket matches
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    
    -- Match positioning
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    bracket_position INTEGER, -- For bracket visualization
    
    -- Players (null until match is populated)
    player1_id UUID REFERENCES profiles(id),
    player2_id UUID REFERENCES profiles(id),
    winner_id UUID REFERENCES profiles(id),
    
    -- Scores
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    
    -- Match details
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BYE')),
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Match linkage for bracket progression
    next_match_id UUID REFERENCES tournament_matches(id),
    next_match_slot INTEGER CHECK (next_match_slot IN (1, 2)), -- 1 = player1, 2 = player2
    
    -- Special flags
    is_bye BOOLEAN NOT NULL DEFAULT false,
    is_third_place BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique match per round in tournament
    UNIQUE(tournament_id, round, match_number)
);

-- Indexes for tournament_matches
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player1 ON tournament_matches(player1_id) WHERE player1_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player2 ON tournament_matches(player2_id) WHERE player2_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tournament_matches_updated_at ON tournament_matches;
CREATE TRIGGER update_tournament_matches_updated_at
    BEFORE UPDATE ON tournament_matches
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- RLS Policies for tournament_matches
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Everyone can view tournament matches
DROP POLICY IF EXISTS "tournament_matches_select_public" ON tournament_matches;
CREATE POLICY "tournament_matches_select_public" ON tournament_matches
    FOR SELECT USING (true);

-- Only tournament organizer can insert matches
DROP POLICY IF EXISTS "tournament_matches_insert_organizer" ON tournament_matches;
CREATE POLICY "tournament_matches_insert_organizer" ON tournament_matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

-- Only tournament organizer can update matches
DROP POLICY IF EXISTS "tournament_matches_update_organizer" ON tournament_matches;
CREATE POLICY "tournament_matches_update_organizer" ON tournament_matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

-- Only tournament organizer can delete matches
DROP POLICY IF EXISTS "tournament_matches_delete_organizer" ON tournament_matches;
CREATE POLICY "tournament_matches_delete_organizer" ON tournament_matches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

-- Function to propagate winner to next match
CREATE OR REPLACE FUNCTION propagate_tournament_winner()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act when winner is set
    IF NEW.winner_id IS NOT NULL AND OLD.winner_id IS NULL THEN
        -- Update next match with winner
        IF NEW.next_match_id IS NOT NULL THEN
            IF NEW.next_match_slot = 1 THEN
                UPDATE tournament_matches 
                SET player1_id = NEW.winner_id, updated_at = now()
                WHERE id = NEW.next_match_id;
            ELSIF NEW.next_match_slot = 2 THEN
                UPDATE tournament_matches 
                SET player2_id = NEW.winner_id, updated_at = now()
                WHERE id = NEW.next_match_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for winner propagation
DROP TRIGGER IF EXISTS propagate_winner_trigger ON tournament_matches;
CREATE TRIGGER propagate_winner_trigger
    AFTER UPDATE OF winner_id ON tournament_matches
    FOR EACH ROW
    EXECUTE FUNCTION propagate_tournament_winner();

-- Comment for documentation
COMMENT ON TABLE tournament_matches IS 'Stores bracket matches for tournaments with automatic winner propagation';
