-- Migration: 017_tournament_enhancements.sql
-- Tournament module enhancements for professional features

-- 1. Add bracket_type to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS bracket_type VARCHAR(20) DEFAULT 'SINGLE_ELIMINATION' 
CHECK (bracket_type IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'GROUP_KNOCKOUT'));

-- 2. Add check-in fields to tournament_participants
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS check_in_status VARCHAR(20) DEFAULT 'PENDING' 
CHECK (check_in_status IN ('PENDING', 'CHECKED_IN', 'NO_SHOW'));

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'PLAYER' 
CHECK (role IN ('PLAYER', 'REFEREE', 'ADMIN'));

-- 3. Add scheduling fields to tournament_matches
ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS referee_id UUID REFERENCES profiles(id);

ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS table_number INTEGER;

ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS bracket_side VARCHAR(10) DEFAULT 'WINNERS' 
CHECK (bracket_side IN ('WINNERS', 'LOSERS', 'GRAND_FINAL'));

-- 4. Create tournament_groups table for group stage
CREATE TABLE IF NOT EXISTS tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    group_name VARCHAR(50) NOT NULL, -- e.g., "Group A", "Group B"
    group_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, group_name)
);

-- 5. Create tournament_group_members table
CREATE TABLE IF NOT EXISTS tournament_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
    -- Standings
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    matches_drawn INTEGER DEFAULT 0,
    sets_won INTEGER DEFAULT 0,
    sets_lost INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    standing_points INTEGER DEFAULT 0, -- 3 for win, 1 for draw, 0 for loss
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, participant_id)
);

-- 6. Create tournament_notifications table
CREATE TABLE IF NOT EXISTS tournament_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'MATCH_UPCOMING', 
        'MATCH_STARTED', 
        'MATCH_COMPLETED', 
        'SCHEDULE_CHANGED', 
        'BRACKET_GENERATED',
        'TOURNAMENT_STARTED',
        'TOURNAMENT_COMPLETED',
        'CHECK_IN_REMINDER'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    match_id UUID REFERENCES tournament_matches(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament ON tournament_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_group_members_group ON tournament_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_tournament_notifications_user ON tournament_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tournament_notifications_tournament ON tournament_notifications(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_referee ON tournament_matches(referee_id) WHERE referee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_matches_bracket_side ON tournament_matches(tournament_id, bracket_side);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_tournament_groups_updated_at ON tournament_groups;
CREATE TRIGGER update_tournament_groups_updated_at
    BEFORE UPDATE ON tournament_groups
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS update_tournament_group_members_updated_at ON tournament_group_members;
CREATE TRIGGER update_tournament_group_members_updated_at
    BEFORE UPDATE ON tournament_group_members
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- RLS Policies for tournament_groups
ALTER TABLE tournament_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_groups_select_public" ON tournament_groups;
CREATE POLICY "tournament_groups_select_public" ON tournament_groups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournament_groups_insert_organizer" ON tournament_groups;
CREATE POLICY "tournament_groups_insert_organizer" ON tournament_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tournament_groups_update_organizer" ON tournament_groups;
CREATE POLICY "tournament_groups_update_organizer" ON tournament_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tournament_groups_delete_organizer" ON tournament_groups;
CREATE POLICY "tournament_groups_delete_organizer" ON tournament_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

-- RLS Policies for tournament_group_members
ALTER TABLE tournament_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_group_members_select_public" ON tournament_group_members;
CREATE POLICY "tournament_group_members_select_public" ON tournament_group_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournament_group_members_insert_organizer" ON tournament_group_members;
CREATE POLICY "tournament_group_members_insert_organizer" ON tournament_group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournament_groups g
            JOIN tournaments t ON t.id = g.tournament_id
            WHERE g.id = group_id 
            AND t.organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tournament_group_members_update_organizer" ON tournament_group_members;
CREATE POLICY "tournament_group_members_update_organizer" ON tournament_group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournament_groups g
            JOIN tournaments t ON t.id = g.tournament_id
            WHERE g.id = group_id 
            AND t.organizer_id = auth.uid()
        )
    );

-- RLS Policies for tournament_notifications
ALTER TABLE tournament_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_notifications_select_own" ON tournament_notifications;
CREATE POLICY "tournament_notifications_select_own" ON tournament_notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tournament_notifications_insert_system" ON tournament_notifications;
CREATE POLICY "tournament_notifications_insert_system" ON tournament_notifications
    FOR INSERT WITH CHECK (true); -- Allow triggers to insert

DROP POLICY IF EXISTS "tournament_notifications_update_own" ON tournament_notifications;
CREATE POLICY "tournament_notifications_update_own" ON tournament_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Function to send notification when match is about to start
CREATE OR REPLACE FUNCTION notify_match_upcoming()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify player 1
    IF NEW.player1_id IS NOT NULL AND NEW.scheduled_at IS NOT NULL THEN
        INSERT INTO tournament_notifications (tournament_id, user_id, type, title, message, match_id)
        VALUES (
            NEW.tournament_id,
            NEW.player1_id,
            'MATCH_UPCOMING',
            'Pertandingan Akan Dimulai',
            'Pertandingan Anda akan dimulai pada ' || to_char(NEW.scheduled_at, 'HH24:MI'),
            NEW.id
        );
    END IF;
    
    -- Notify player 2
    IF NEW.player2_id IS NOT NULL AND NEW.scheduled_at IS NOT NULL THEN
        INSERT INTO tournament_notifications (tournament_id, user_id, type, title, message, match_id)
        VALUES (
            NEW.tournament_id,
            NEW.player2_id,
            'MATCH_UPCOMING',
            'Pertandingan Akan Dimulai',
            'Pertandingan Anda akan dimulai pada ' || to_char(NEW.scheduled_at, 'HH24:MI'),
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify match result
CREATE OR REPLACE FUNCTION notify_match_completed()
RETURNS TRIGGER AS $$
DECLARE
    winner_name TEXT;
BEGIN
    -- Only when match is completed
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        SELECT name INTO winner_name FROM profiles WHERE id = NEW.winner_id;
        
        -- Notify both players
        IF NEW.player1_id IS NOT NULL THEN
            INSERT INTO tournament_notifications (tournament_id, user_id, type, title, message, match_id)
            VALUES (
                NEW.tournament_id,
                NEW.player1_id,
                'MATCH_COMPLETED',
                'Pertandingan Selesai',
                'Pemenang: ' || COALESCE(winner_name, 'TBD') || ' | Skor: ' || NEW.player1_score || ' - ' || NEW.player2_score,
                NEW.id
            );
        END IF;
        
        IF NEW.player2_id IS NOT NULL THEN
            INSERT INTO tournament_notifications (tournament_id, user_id, type, title, message, match_id)
            VALUES (
                NEW.tournament_id,
                NEW.player2_id,
                'MATCH_COMPLETED',
                'Pertandingan Selesai',
                'Pemenang: ' || COALESCE(winner_name, 'TBD') || ' | Skor: ' || NEW.player1_score || ' - ' || NEW.player2_score,
                NEW.id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for notifications
DROP TRIGGER IF EXISTS notify_match_upcoming_trigger ON tournament_matches;
CREATE TRIGGER notify_match_upcoming_trigger
    AFTER UPDATE OF scheduled_at ON tournament_matches
    FOR EACH ROW
    WHEN (NEW.scheduled_at IS NOT NULL AND OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at)
    EXECUTE FUNCTION notify_match_upcoming();

DROP TRIGGER IF EXISTS notify_match_completed_trigger ON tournament_matches;
CREATE TRIGGER notify_match_completed_trigger
    AFTER UPDATE OF status ON tournament_matches
    FOR EACH ROW
    EXECUTE FUNCTION notify_match_completed();

-- Enable Realtime for tournament_matches
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;

-- Comments
COMMENT ON TABLE tournament_groups IS 'Groups for group stage tournaments';
COMMENT ON TABLE tournament_group_members IS 'Participants in groups with standings';
COMMENT ON TABLE tournament_notifications IS 'In-app notifications for tournament events';
COMMENT ON COLUMN tournaments.bracket_type IS 'Type of bracket: SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ROUND_ROBIN, GROUP_KNOCKOUT';
COMMENT ON COLUMN tournament_participants.check_in_status IS 'Check-in status: PENDING, CHECKED_IN, NO_SHOW';
COMMENT ON COLUMN tournament_matches.bracket_side IS 'For double elimination: WINNERS, LOSERS, or GRAND_FINAL';
