-- Migration: 027_tournament_complete.sql
-- Complete tournament system: matches table + all enhancements
-- Run this ONCE in Supabase SQL Editor

-- ============================================
-- PART 0: CREATE HELPER FUNCTION
-- ============================================

-- Create trigger_set_timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 1: CREATE TOURNAMENT MATCHES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    
    -- Match positioning
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    bracket_position INTEGER,
    
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
    next_match_slot INTEGER CHECK (next_match_slot IN (1, 2)),
    
    -- Special flags
    is_bye BOOLEAN NOT NULL DEFAULT false,
    is_third_place BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
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

DROP POLICY IF EXISTS "tournament_matches_select_public" ON tournament_matches;
CREATE POLICY "tournament_matches_select_public" ON tournament_matches
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournament_matches_insert_organizer" ON tournament_matches;
CREATE POLICY "tournament_matches_insert_organizer" ON tournament_matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tournament_matches_update_organizer" ON tournament_matches;
CREATE POLICY "tournament_matches_update_organizer" ON tournament_matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

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
    IF NEW.winner_id IS NOT NULL AND OLD.winner_id IS NULL THEN
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

DROP TRIGGER IF EXISTS propagate_winner_trigger ON tournament_matches;
CREATE TRIGGER propagate_winner_trigger
    AFTER UPDATE OF winner_id ON tournament_matches
    FOR EACH ROW
    EXECUTE FUNCTION propagate_tournament_winner();

COMMENT ON TABLE tournament_matches IS 'Stores bracket matches for tournaments with automatic winner propagation';

-- ============================================
-- PART 2: TOURNAMENT ENHANCEMENTS
-- ============================================

-- Add bracket_type to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS bracket_type VARCHAR(20) DEFAULT 'SINGLE_ELIMINATION' 
CHECK (bracket_type IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'GROUP_KNOCKOUT'));

-- Add check-in fields to tournament_participants
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS check_in_status VARCHAR(20) DEFAULT 'PENDING' 
CHECK (check_in_status IN ('PENDING', 'CHECKED_IN', 'NO_SHOW'));

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'PLAYER' 
CHECK (role IN ('PLAYER', 'REFEREE', 'ADMIN'));

-- Add scheduling fields to tournament_matches
ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS referee_id UUID REFERENCES profiles(id);

ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS table_number INTEGER;

ALTER TABLE tournament_matches 
ADD COLUMN IF NOT EXISTS bracket_side VARCHAR(10) DEFAULT 'WINNERS' 
CHECK (bracket_side IN ('WINNERS', 'LOSERS', 'GRAND_FINAL'));

-- ============================================
-- PART 3: GROUP STAGE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    group_name VARCHAR(50) NOT NULL,
    group_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, group_name)
);

CREATE TABLE IF NOT EXISTS tournament_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    matches_drawn INTEGER DEFAULT 0,
    sets_won INTEGER DEFAULT 0,
    sets_lost INTEGER DEFAULT 0,
    points_for INTEGER DEFAULT 0,
    points_against INTEGER DEFAULT 0,
    standing_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, participant_id)
);

-- ============================================
-- PART 4: NOTIFICATIONS TABLE
-- ============================================

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

-- ============================================
-- PART 5: INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament ON tournament_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_group_members_group ON tournament_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_tournament_notifications_user ON tournament_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tournament_notifications_tournament ON tournament_notifications(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_referee ON tournament_matches(referee_id) WHERE referee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tournament_matches_bracket_side ON tournament_matches(tournament_id, bracket_side);

-- ============================================
-- PART 6: TRIGGERS
-- ============================================

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

-- ============================================
-- PART 7: RLS POLICIES
-- ============================================

-- tournament_groups
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

-- tournament_group_members
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

-- tournament_notifications
ALTER TABLE tournament_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_notifications_select_own" ON tournament_notifications;
CREATE POLICY "tournament_notifications_select_own" ON tournament_notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tournament_notifications_insert_system" ON tournament_notifications;
CREATE POLICY "tournament_notifications_insert_system" ON tournament_notifications
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "tournament_notifications_update_own" ON tournament_notifications;
CREATE POLICY "tournament_notifications_update_own" ON tournament_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- PART 8: NOTIFICATION TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION notify_match_upcoming()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION notify_match_completed()
RETURNS TRIGGER AS $$
DECLARE
    winner_name TEXT;
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        SELECT name INTO winner_name FROM profiles WHERE id = NEW.winner_id;
        
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

-- ============================================
-- PART 9: ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE tournament_matches;

-- ============================================
-- DONE
-- ============================================

COMMENT ON TABLE tournament_groups IS 'Groups for group stage tournaments';
COMMENT ON TABLE tournament_group_members IS 'Participants in groups with standings';
COMMENT ON TABLE tournament_notifications IS 'In-app notifications for tournament events';
COMMENT ON COLUMN tournaments.bracket_type IS 'Type of bracket: SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ROUND_ROBIN, GROUP_KNOCKOUT';
COMMENT ON COLUMN tournament_participants.check_in_status IS 'Check-in status: PENDING, CHECKED_IN, NO_SHOW';
COMMENT ON COLUMN tournament_matches.bracket_side IS 'For double elimination: WINNERS, LOSERS, or GRAND_FINAL';
