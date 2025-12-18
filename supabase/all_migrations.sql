-- ============================================================
-- PingpongHub Database Schema
-- Migration: 001_create_tables.sql
-- Description: Creates all 12 tables with proper data types and constraints
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    city TEXT,
    province TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    grip_style TEXT NOT NULL DEFAULT 'SHAKEHAND' CHECK (grip_style IN ('SHAKEHAND', 'PENHOLD', 'SEEMILLER')),
    play_style TEXT NOT NULL DEFAULT 'ALLROUND' CHECK (play_style IN ('OFFENSIVE', 'DEFENSIVE', 'ALLROUND')),
    rating_mr INTEGER NOT NULL DEFAULT 1000,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    total_matches INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_active_at TIMESTAMPTZ,
    push_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. VENUES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone TEXT,
    table_count INTEGER NOT NULL DEFAULT 1,
    price_per_hour DECIMAL(10, 2),
    facilities TEXT[] DEFAULT '{}',
    opening_hours JSONB DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rating DECIMAL(2, 1) NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TOURNAMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    rules TEXT,
    banner_url TEXT,
    format TEXT NOT NULL CHECK (format IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'GROUP_STAGE')),
    category TEXT NOT NULL CHECK (category IN ('OPEN', 'MALE', 'FEMALE', 'DOUBLES', 'U17', 'U21', 'VETERAN_40', 'VETERAN_50')),
    max_participants INTEGER NOT NULL DEFAULT 16,
    current_participants INTEGER NOT NULL DEFAULT 0,
    registration_fee DECIMAL(10, 2),
    prize_pool DECIMAL(10, 2),
    registration_start TIMESTAMPTZ NOT NULL,
    registration_end TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    is_ranked BOOLEAN NOT NULL DEFAULT TRUE,
    has_third_place BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. MATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('RANKED', 'FRIENDLY', 'TOURNAMENT')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
    best_of INTEGER NOT NULL DEFAULT 3 CHECK (best_of IN (1, 3, 5, 7)),
    player1_rating_before INTEGER,
    player2_rating_before INTEGER,
    player1_rating_change INTEGER,
    player2_rating_change INTEGER,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- ============================================================
-- 5. MATCH_SETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS match_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number >= 1 AND set_number <= 7),
    player1_score INTEGER NOT NULL DEFAULT 0 CHECK (player1_score >= 0),
    player2_score INTEGER NOT NULL DEFAULT 0 CHECK (player2_score >= 0),
    
    UNIQUE(match_id, set_number)
);

-- ============================================================
-- 6. CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenged_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    match_type TEXT NOT NULL DEFAULT 'FRIENDLY' CHECK (match_type IN ('RANKED', 'FRIENDLY', 'TOURNAMENT')),
    best_of INTEGER NOT NULL DEFAULT 3 CHECK (best_of IN (1, 3, 5, 7)),
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT different_players_challenge CHECK (challenger_id != challenged_id)
);

-- ============================================================
-- 7. VENUE_REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(venue_id, user_id)
);

-- ============================================================
-- 8. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT different_users_message CHECK (sender_id != receiver_id)
);

-- ============================================================
-- 9. FRIENDSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    CONSTRAINT different_users_friendship CHECK (user_id != friend_id),
    UNIQUE(user_id, friend_id)
);

-- ============================================================
-- 10. BADGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('COMPETITION', 'PERFORMANCE', 'SOCIAL', 'SPECIAL')),
    requirement JSONB NOT NULL DEFAULT '{}',
    xp_reward INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 11. USER_BADGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, badge_id)
);

-- ============================================================
-- 12. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'CHALLENGE_RECEIVED', 'CHALLENGE_ACCEPTED', 'CHALLENGE_DECLINED',
        'MATCH_REMINDER', 'MATCH_RESULT', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED',
        'TOURNAMENT_REMINDER', 'LEVEL_UP', 'BADGE_EARNED', 'SYSTEM'
    )),
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TOURNAMENT_PARTICIPANTS TABLE (Junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seed INTEGER,
    status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'CHECKED_IN', 'ELIMINATED', 'WINNER')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tournament_id, user_id)
);
-- ============================================================
-- PingpongHub Performance Indexes
-- Migration: 002_create_indexes.sql
-- Description: Creates indexes for frequently queried columns
-- ============================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating_mr DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);

-- Venues indexes
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON venues(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_venues_rating ON venues(rating DESC);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_type ON matches(type);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id) WHERE tournament_id IS NOT NULL;

-- Match sets indexes
CREATE INDEX IF NOT EXISTS idx_match_sets_match ON match_sets(match_id);

-- Challenges indexes
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at) WHERE status = 'PENDING';

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = FALSE;
-- Composite index for chat conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(
    LEAST(sender_id, receiver_id), 
    GREATEST(sender_id, receiver_id), 
    created_at DESC
);

-- Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Tournaments indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_registration ON tournaments(registration_start, registration_end);

-- Tournament participants indexes
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);

-- Venue reviews indexes
CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue ON venue_reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_user ON venue_reviews(user_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- User badges indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- Badges indexes
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_code ON badges(code);
-- ============================================================
-- PingpongHub Row Level Security (RLS) Policies
-- Migration: 003_rls_policies.sql
-- Description: Enables RLS and creates access policies for all tables
-- ============================================================

-- ============================================================
-- PROFILES TABLE
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view profiles
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles
    FOR SELECT TO authenticated
    USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Profiles are created via trigger, not direct insert
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- ============================================================
-- VENUES TABLE
-- ============================================================
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Everyone can view active venues
DROP POLICY IF EXISTS "venues_select_active" ON venues;
CREATE POLICY "venues_select_active" ON venues
    FOR SELECT TO authenticated
    USING (is_active = true OR owner_id = auth.uid());

-- Only owner can insert venues
DROP POLICY IF EXISTS "venues_insert_owner" ON venues;
CREATE POLICY "venues_insert_owner" ON venues
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Only owner can update their venues
DROP POLICY IF EXISTS "venues_update_owner" ON venues;
CREATE POLICY "venues_update_owner" ON venues
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Only owner can delete their venues
DROP POLICY IF EXISTS "venues_delete_owner" ON venues;
CREATE POLICY "venues_delete_owner" ON venues
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- ============================================================
-- TOURNAMENTS TABLE
-- ============================================================
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Everyone can view non-draft tournaments
DROP POLICY IF EXISTS "tournaments_select_public" ON tournaments;
CREATE POLICY "tournaments_select_public" ON tournaments
    FOR SELECT TO authenticated
    USING (status != 'DRAFT' OR organizer_id = auth.uid());

-- Only organizer can insert tournaments
DROP POLICY IF EXISTS "tournaments_insert_organizer" ON tournaments;
CREATE POLICY "tournaments_insert_organizer" ON tournaments
    FOR INSERT TO authenticated
    WITH CHECK (organizer_id = auth.uid());

-- Only organizer can update their tournaments
DROP POLICY IF EXISTS "tournaments_update_organizer" ON tournaments;
CREATE POLICY "tournaments_update_organizer" ON tournaments
    FOR UPDATE TO authenticated
    USING (organizer_id = auth.uid())
    WITH CHECK (organizer_id = auth.uid());

-- Only organizer can delete their tournaments
DROP POLICY IF EXISTS "tournaments_delete_organizer" ON tournaments;
CREATE POLICY "tournaments_delete_organizer" ON tournaments
    FOR DELETE TO authenticated
    USING (organizer_id = auth.uid());

-- ============================================================
-- MATCHES TABLE
-- ============================================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Players can view matches they're part of
DROP POLICY IF EXISTS "matches_select_participant" ON matches;
CREATE POLICY "matches_select_participant" ON matches
    FOR SELECT TO authenticated
    USING (player1_id = auth.uid() OR player2_id = auth.uid() OR status = 'COMPLETED');

-- Players can create matches
DROP POLICY IF EXISTS "matches_insert_player" ON matches;
CREATE POLICY "matches_insert_player" ON matches
    FOR INSERT TO authenticated
    WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());

-- Only participants can update match
DROP POLICY IF EXISTS "matches_update_participant" ON matches;
CREATE POLICY "matches_update_participant" ON matches
    FOR UPDATE TO authenticated
    USING (player1_id = auth.uid() OR player2_id = auth.uid())
    WITH CHECK (player1_id = auth.uid() OR player2_id = auth.uid());

-- ============================================================
-- MATCH_SETS TABLE
-- ============================================================
ALTER TABLE match_sets ENABLE ROW LEVEL SECURITY;

-- Anyone can view match sets for matches they can view
DROP POLICY IF EXISTS "match_sets_select" ON match_sets;
CREATE POLICY "match_sets_select" ON match_sets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = match_sets.match_id 
            AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid() OR m.status = 'COMPLETED')
        )
    );

-- Match participants can insert sets
DROP POLICY IF EXISTS "match_sets_insert" ON match_sets;
CREATE POLICY "match_sets_insert" ON match_sets
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = match_sets.match_id 
            AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
        )
    );

-- Match participants can update sets
DROP POLICY IF EXISTS "match_sets_update" ON match_sets;
CREATE POLICY "match_sets_update" ON match_sets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = match_sets.match_id 
            AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
        )
    );

-- ============================================================
-- CHALLENGES TABLE
-- ============================================================
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Users can view challenges they're involved in
DROP POLICY IF EXISTS "challenges_select_involved" ON challenges;
CREATE POLICY "challenges_select_involved" ON challenges
    FOR SELECT TO authenticated
    USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

-- Users can create challenges
DROP POLICY IF EXISTS "challenges_insert_challenger" ON challenges;
CREATE POLICY "challenges_insert_challenger" ON challenges
    FOR INSERT TO authenticated
    WITH CHECK (challenger_id = auth.uid());

-- Both parties can update challenge status
DROP POLICY IF EXISTS "challenges_update_involved" ON challenges;
CREATE POLICY "challenges_update_involved" ON challenges
    FOR UPDATE TO authenticated
    USING (challenger_id = auth.uid() OR challenged_id = auth.uid())
    WITH CHECK (challenger_id = auth.uid() OR challenged_id = auth.uid());

-- ============================================================
-- VENUE_REVIEWS TABLE
-- ============================================================
ALTER TABLE venue_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
DROP POLICY IF EXISTS "venue_reviews_select_all" ON venue_reviews;
CREATE POLICY "venue_reviews_select_all" ON venue_reviews
    FOR SELECT TO authenticated
    USING (true);

-- Users can create reviews
DROP POLICY IF EXISTS "venue_reviews_insert_user" ON venue_reviews;
CREATE POLICY "venue_reviews_insert_user" ON venue_reviews
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own reviews
DROP POLICY IF EXISTS "venue_reviews_update_own" ON venue_reviews;
CREATE POLICY "venue_reviews_update_own" ON venue_reviews
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own reviews
DROP POLICY IF EXISTS "venue_reviews_delete_own" ON venue_reviews;
CREATE POLICY "venue_reviews_delete_own" ON venue_reviews
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
DROP POLICY IF EXISTS "messages_select_involved" ON messages;
CREATE POLICY "messages_select_involved" ON messages
    FOR SELECT TO authenticated
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can send messages
DROP POLICY IF EXISTS "messages_insert_sender" ON messages;
CREATE POLICY "messages_insert_sender" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- Receiver can mark as read
DROP POLICY IF EXISTS "messages_update_receiver" ON messages;
CREATE POLICY "messages_update_receiver" ON messages
    FOR UPDATE TO authenticated
    USING (receiver_id = auth.uid())
    WITH CHECK (receiver_id = auth.uid());

-- ============================================================
-- FRIENDSHIPS TABLE
-- ============================================================
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their friendships
DROP POLICY IF EXISTS "friendships_select_involved" ON friendships;
CREATE POLICY "friendships_select_involved" ON friendships
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Users can create friend requests
DROP POLICY IF EXISTS "friendships_insert_user" ON friendships;
CREATE POLICY "friendships_insert_user" ON friendships
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Both parties can update friendship status
DROP POLICY IF EXISTS "friendships_update_involved" ON friendships;
CREATE POLICY "friendships_update_involved" ON friendships
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid())
    WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

-- Users can delete their friendships
DROP POLICY IF EXISTS "friendships_delete_involved" ON friendships;
CREATE POLICY "friendships_delete_involved" ON friendships
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR friend_id = auth.uid());

-- ============================================================
-- BADGES TABLE
-- ============================================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Everyone can view badges
DROP POLICY IF EXISTS "badges_select_all" ON badges;
CREATE POLICY "badges_select_all" ON badges
    FOR SELECT TO authenticated
    USING (true);

-- Only service role can insert/update/delete badges (admin only)
-- No user-level insert/update/delete policies

-- ============================================================
-- USER_BADGES TABLE
-- ============================================================
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can view user badges
DROP POLICY IF EXISTS "user_badges_select_all" ON user_badges;
CREATE POLICY "user_badges_select_all" ON user_badges
    FOR SELECT TO authenticated
    USING (true);

-- Badges are awarded via triggers/functions, not direct insert
-- No user-level insert policy (use service role)

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Notifications are created via triggers/functions
-- Allow insert for the notification system
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;
CREATE POLICY "notifications_insert_system" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (user_id IS NOT NULL);

-- ============================================================
-- TOURNAMENT_PARTICIPANTS TABLE
-- ============================================================
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

-- Everyone can view tournament participants
DROP POLICY IF EXISTS "tournament_participants_select_all" ON tournament_participants;
CREATE POLICY "tournament_participants_select_all" ON tournament_participants
    FOR SELECT TO authenticated
    USING (true);

-- Users can register themselves
DROP POLICY IF EXISTS "tournament_participants_insert_self" ON tournament_participants;
CREATE POLICY "tournament_participants_insert_self" ON tournament_participants
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own registration
DROP POLICY IF EXISTS "tournament_participants_update_self" ON tournament_participants;
CREATE POLICY "tournament_participants_update_self" ON tournament_participants
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can withdraw themselves
DROP POLICY IF EXISTS "tournament_participants_delete_self" ON tournament_participants;
CREATE POLICY "tournament_participants_delete_self" ON tournament_participants
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());
-- ============================================================
-- PingpongHub Database Triggers & Functions
-- Migration: 004_triggers_functions.sql
-- Description: Auto-profile creation, ELO rating, XP/Level, Badges
-- ============================================================

-- ============================================================
-- 1. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================

-- Function to create profile when new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), ' ', '_')) || '_' || SUBSTRING(NEW.id::text, 1, 8)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ELO RATING CALCULATION FUNCTION
-- ============================================================

-- Calculate expected score based on ELO formula
CREATE OR REPLACE FUNCTION calculate_expected_score(player_rating INTEGER, opponent_rating INTEGER)
RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN 1.0 / (1.0 + POWER(10, (opponent_rating - player_rating)::DOUBLE PRECISION / 400.0));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get K-factor based on total matches played
CREATE OR REPLACE FUNCTION get_k_factor(total_matches INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF total_matches < 30 THEN
        RETURN 32;  -- New player, rating changes quickly
    ELSIF total_matches < 100 THEN
        RETURN 24;  -- Intermediate player
    ELSE
        RETURN 16;  -- Veteran player, rating more stable
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main function to calculate and apply ELO rating changes after match
CREATE OR REPLACE FUNCTION calculate_elo_rating(
    p_match_id UUID,
    p_winner_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_match RECORD;
    v_player1 RECORD;
    v_player2 RECORD;
    v_expected1 DOUBLE PRECISION;
    v_expected2 DOUBLE PRECISION;
    v_actual1 DOUBLE PRECISION;
    v_actual2 DOUBLE PRECISION;
    v_k1 INTEGER;
    v_k2 INTEGER;
    v_change1 INTEGER;
    v_change2 INTEGER;
    v_new_rating1 INTEGER;
    v_new_rating2 INTEGER;
BEGIN
    -- Get match details
    SELECT * INTO v_match FROM matches WHERE id = p_match_id;
    
    IF v_match IS NULL THEN
        RAISE EXCEPTION 'Match not found';
    END IF;
    
    -- Only calculate for RANKED matches
    IF v_match.type != 'RANKED' THEN
        RETURN jsonb_build_object('message', 'ELO only calculated for RANKED matches');
    END IF;
    
    -- Get player details
    SELECT * INTO v_player1 FROM profiles WHERE id = v_match.player1_id;
    SELECT * INTO v_player2 FROM profiles WHERE id = v_match.player2_id;
    
    -- Calculate expected scores
    v_expected1 := calculate_expected_score(v_player1.rating_mr, v_player2.rating_mr);
    v_expected2 := calculate_expected_score(v_player2.rating_mr, v_player1.rating_mr);
    
    -- Determine actual scores (1 for win, 0 for loss)
    IF p_winner_id = v_match.player1_id THEN
        v_actual1 := 1.0;
        v_actual2 := 0.0;
    ELSE
        v_actual1 := 0.0;
        v_actual2 := 1.0;
    END IF;
    
    -- Get K-factors
    v_k1 := get_k_factor(v_player1.total_matches);
    v_k2 := get_k_factor(v_player2.total_matches);
    
    -- Calculate rating changes
    v_change1 := ROUND(v_k1 * (v_actual1 - v_expected1));
    v_change2 := ROUND(v_k2 * (v_actual2 - v_expected2));
    
    -- Calculate new ratings (minimum 100)
    v_new_rating1 := GREATEST(100, v_player1.rating_mr + v_change1);
    v_new_rating2 := GREATEST(100, v_player2.rating_mr + v_change2);
    
    -- Update match with rating info
    UPDATE matches SET
        player1_rating_before = v_player1.rating_mr,
        player2_rating_before = v_player2.rating_mr,
        player1_rating_change = v_change1,
        player2_rating_change = v_change2,
        winner_id = p_winner_id,
        status = 'COMPLETED',
        completed_at = NOW()
    WHERE id = p_match_id;
    
    -- Update player1 profile
    UPDATE profiles SET
        rating_mr = v_new_rating1,
        total_matches = total_matches + 1,
        wins = CASE WHEN p_winner_id = id THEN wins + 1 ELSE wins END,
        losses = CASE WHEN p_winner_id != id THEN losses + 1 ELSE losses END,
        current_streak = CASE 
            WHEN p_winner_id = id THEN current_streak + 1 
            ELSE 0 
        END,
        best_streak = CASE 
            WHEN p_winner_id = id AND current_streak + 1 > best_streak THEN current_streak + 1 
            ELSE best_streak 
        END,
        updated_at = NOW()
    WHERE id = v_match.player1_id;
    
    -- Update player2 profile
    UPDATE profiles SET
        rating_mr = v_new_rating2,
        total_matches = total_matches + 1,
        wins = CASE WHEN p_winner_id = id THEN wins + 1 ELSE wins END,
        losses = CASE WHEN p_winner_id != id THEN losses + 1 ELSE losses END,
        current_streak = CASE 
            WHEN p_winner_id = id THEN current_streak + 1 
            ELSE 0 
        END,
        best_streak = CASE 
            WHEN p_winner_id = id AND current_streak + 1 > best_streak THEN current_streak + 1 
            ELSE best_streak 
        END,
        updated_at = NOW()
    WHERE id = v_match.player2_id;
    
    -- Award XP to both players
    PERFORM award_match_xp(v_match.player1_id, p_winner_id = v_match.player1_id);
    PERFORM award_match_xp(v_match.player2_id, p_winner_id = v_match.player2_id);
    
    -- Check badges for both players
    PERFORM check_and_award_badges(v_match.player1_id);
    PERFORM check_and_award_badges(v_match.player2_id);
    
    RETURN jsonb_build_object(
        'player1_old_rating', v_player1.rating_mr,
        'player1_new_rating', v_new_rating1,
        'player1_change', v_change1,
        'player2_old_rating', v_player2.rating_mr,
        'player2_new_rating', v_new_rating2,
        'player2_change', v_change2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. XP AND LEVEL SYSTEM
-- ============================================================

-- XP thresholds for each level
CREATE OR REPLACE FUNCTION get_xp_for_level(p_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Exponential growth formula
    -- Level 1: 0, Level 5: 1000, Level 10: 5000, Level 20: 20000, etc.
    IF p_level <= 1 THEN
        RETURN 0;
    ELSIF p_level <= 5 THEN
        RETURN (p_level - 1) * 250;
    ELSIF p_level <= 10 THEN
        RETURN 1000 + (p_level - 5) * 800;
    ELSIF p_level <= 20 THEN
        RETURN 5000 + (p_level - 10) * 1500;
    ELSIF p_level <= 30 THEN
        RETURN 20000 + (p_level - 20) * 3000;
    ELSIF p_level <= 40 THEN
        RETURN 50000 + (p_level - 30) * 5000;
    ELSE
        RETURN 100000 + (p_level - 40) * 10000;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(p_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER := 1;
BEGIN
    WHILE get_xp_for_level(v_level + 1) <= p_xp AND v_level < 100 LOOP
        v_level := v_level + 1;
    END LOOP;
    RETURN v_level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Award XP after match
CREATE OR REPLACE FUNCTION award_match_xp(p_user_id UUID, p_is_winner BOOLEAN)
RETURNS INTEGER AS $$
DECLARE
    v_xp_earned INTEGER;
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_new_xp INTEGER;
BEGIN
    -- Base XP: 50 for playing, +30 for winning
    v_xp_earned := 50;
    IF p_is_winner THEN
        v_xp_earned := v_xp_earned + 30;
    END IF;
    
    -- Get current level
    SELECT level, xp INTO v_old_level, v_new_xp FROM profiles WHERE id = p_user_id;
    
    -- Add XP
    v_new_xp := v_new_xp + v_xp_earned;
    
    -- Calculate new level
    v_new_level := calculate_level_from_xp(v_new_xp);
    
    -- Update profile
    UPDATE profiles SET
        xp = v_new_xp,
        level = v_new_level,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- If level up, create notification
    IF v_new_level > v_old_level THEN
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            p_user_id,
            'LEVEL_UP',
            'Level Up! ðŸŽ‰',
            'Selamat! Kamu naik ke Level ' || v_new_level,
            jsonb_build_object('old_level', v_old_level, 'new_level', v_new_level)
        );
    END IF;
    
    RETURN v_xp_earned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award XP for any action
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_xp_amount INTEGER, p_reason TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_new_xp INTEGER;
BEGIN
    -- Get current level
    SELECT level, xp INTO v_old_level, v_new_xp FROM profiles WHERE id = p_user_id;
    
    -- Add XP
    v_new_xp := v_new_xp + p_xp_amount;
    
    -- Calculate new level
    v_new_level := calculate_level_from_xp(v_new_xp);
    
    -- Update profile
    UPDATE profiles SET
        xp = v_new_xp,
        level = v_new_level,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- If level up, create notification
    IF v_new_level > v_old_level THEN
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            p_user_id,
            'LEVEL_UP',
            'Level Up! ðŸŽ‰',
            'Selamat! Kamu naik ke Level ' || v_new_level,
            jsonb_build_object('old_level', v_old_level, 'new_level', v_new_level, 'reason', p_reason)
        );
    END IF;
    
    RETURN v_new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. BADGE SYSTEM
-- ============================================================

-- Check and award badges for a user
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS SETOF UUID AS $$
DECLARE
    v_profile RECORD;
    v_badge RECORD;
    v_already_has BOOLEAN;
    v_meets_requirement BOOLEAN;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Loop through all badges
    FOR v_badge IN SELECT * FROM badges LOOP
        -- Check if user already has this badge
        SELECT EXISTS(
            SELECT 1 FROM user_badges 
            WHERE user_id = p_user_id AND badge_id = v_badge.id
        ) INTO v_already_has;
        
        IF NOT v_already_has THEN
            v_meets_requirement := FALSE;
            
            -- Check different badge types based on requirement
            CASE v_badge.code
                -- Match count badges
                WHEN 'FIRST_MATCH' THEN
                    v_meets_requirement := v_profile.total_matches >= 1;
                WHEN 'MATCH_10' THEN
                    v_meets_requirement := v_profile.total_matches >= 10;
                WHEN 'MATCH_50' THEN
                    v_meets_requirement := v_profile.total_matches >= 50;
                WHEN 'MATCH_100' THEN
                    v_meets_requirement := v_profile.total_matches >= 100;
                WHEN 'MATCH_500' THEN
                    v_meets_requirement := v_profile.total_matches >= 500;
                    
                -- Win count badges
                WHEN 'FIRST_WIN' THEN
                    v_meets_requirement := v_profile.wins >= 1;
                WHEN 'WIN_10' THEN
                    v_meets_requirement := v_profile.wins >= 10;
                WHEN 'WIN_50' THEN
                    v_meets_requirement := v_profile.wins >= 50;
                WHEN 'WIN_100' THEN
                    v_meets_requirement := v_profile.wins >= 100;
                    
                -- Streak badges
                WHEN 'STREAK_3' THEN
                    v_meets_requirement := v_profile.best_streak >= 3;
                WHEN 'STREAK_5' THEN
                    v_meets_requirement := v_profile.best_streak >= 5;
                WHEN 'STREAK_10' THEN
                    v_meets_requirement := v_profile.best_streak >= 10;
                    
                -- Rating badges
                WHEN 'RATING_1200' THEN
                    v_meets_requirement := v_profile.rating_mr >= 1200;
                WHEN 'RATING_1500' THEN
                    v_meets_requirement := v_profile.rating_mr >= 1500;
                WHEN 'RATING_1800' THEN
                    v_meets_requirement := v_profile.rating_mr >= 1800;
                WHEN 'RATING_2000' THEN
                    v_meets_requirement := v_profile.rating_mr >= 2000;
                    
                -- Level badges
                WHEN 'LEVEL_10' THEN
                    v_meets_requirement := v_profile.level >= 10;
                WHEN 'LEVEL_25' THEN
                    v_meets_requirement := v_profile.level >= 25;
                WHEN 'LEVEL_50' THEN
                    v_meets_requirement := v_profile.level >= 50;
                    
                ELSE
                    v_meets_requirement := FALSE;
            END CASE;
            
            -- Award badge if requirement met
            IF v_meets_requirement THEN
                -- Insert user badge
                INSERT INTO user_badges (user_id, badge_id)
                VALUES (p_user_id, v_badge.id);
                
                -- Award XP from badge
                IF v_badge.xp_reward > 0 THEN
                    PERFORM award_xp(p_user_id, v_badge.xp_reward, 'Badge: ' || v_badge.name);
                END IF;
                
                -- Create notification
                INSERT INTO notifications (user_id, type, title, body, data)
                VALUES (
                    p_user_id,
                    'BADGE_EARNED',
                    'Badge Baru! ðŸ†',
                    'Kamu mendapatkan badge: ' || v_badge.name,
                    jsonb_build_object('badge_id', v_badge.id, 'badge_name', v_badge.name, 'xp_reward', v_badge.xp_reward)
                );
                
                RETURN NEXT v_badge.id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. UPDATED_AT TRIGGER FOR ALL TABLES
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venues_updated_at ON venues;
CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. VENUE RATING UPDATE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_venue_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE venues SET
        rating = (
            SELECT COALESCE(AVG(rating), 0)::DECIMAL(2,1)
            FROM venue_reviews
            WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
        ),
        review_count = (
            SELECT COUNT(*)
            FROM venue_reviews
            WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
        )
    WHERE id = COALESCE(NEW.venue_id, OLD.venue_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_venue_rating_on_review ON venue_reviews;
CREATE TRIGGER update_venue_rating_on_review
    AFTER INSERT OR UPDATE OR DELETE ON venue_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_venue_rating();

-- ============================================================
-- 7. TOURNAMENT PARTICIPANT COUNT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_tournament_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tournaments SET
        current_participants = (
            SELECT COUNT(*)
            FROM tournament_participants
            WHERE tournament_id = COALESCE(NEW.tournament_id, OLD.tournament_id)
        )
    WHERE id = COALESCE(NEW.tournament_id, OLD.tournament_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_tournament_count_on_participant ON tournament_participants;
CREATE TRIGGER update_tournament_count_on_participant
    AFTER INSERT OR DELETE ON tournament_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_participant_count();

-- ============================================================
-- 8. CHALLENGE EXPIRY CHECK FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE challenges SET
        status = 'EXPIRED'
    WHERE status = 'PENDING'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- PingpongHub Seed Data
-- Migration: 005_seed_data.sql
-- Description: Initial badges and sample data
-- ============================================================

-- ============================================================
-- BADGES SEED DATA
-- ============================================================

INSERT INTO badges (code, name, description, category, xp_reward) VALUES
-- Competition Badges (Match Count)
('FIRST_MATCH', 'Debut', 'Bermain match pertama kamu', 'COMPETITION', 25),
('MATCH_10', 'Pemain Aktif', 'Bermain 10 match', 'COMPETITION', 50),
('MATCH_50', 'Pemain Berdedikasi', 'Bermain 50 match', 'COMPETITION', 100),
('MATCH_100', 'Legenda Lapangan', 'Bermain 100 match', 'COMPETITION', 200),
('MATCH_500', 'Master 500', 'Bermain 500 match', 'COMPETITION', 500),

-- Competition Badges (Win Count)
('FIRST_WIN', 'Kemenangan Pertama', 'Memenangkan match pertama', 'COMPETITION', 25),
('WIN_10', 'Pemenang Bronze', 'Memenangkan 10 match', 'COMPETITION', 50),
('WIN_50', 'Pemenang Silver', 'Memenangkan 50 match', 'COMPETITION', 100),
('WIN_100', 'Pemenang Gold', 'Memenangkan 100 match', 'COMPETITION', 200),

-- Performance Badges (Streaks)
('STREAK_3', 'Hat-trick', 'Win streak 3 kali berturut-turut', 'PERFORMANCE', 30),
('STREAK_5', 'Dominasi', 'Win streak 5 kali berturut-turut', 'PERFORMANCE', 75),
('STREAK_10', 'Tak Terkalahkan', 'Win streak 10 kali berturut-turut', 'PERFORMANCE', 150),

-- Performance Badges (Rating)
('RATING_1200', 'Rising Star', 'Mencapai rating 1200', 'PERFORMANCE', 50),
('RATING_1500', 'Challenger', 'Mencapai rating 1500', 'PERFORMANCE', 100),
('RATING_1800', 'Elite Player', 'Mencapai rating 1800', 'PERFORMANCE', 200),
('RATING_2000', 'Grandmaster', 'Mencapai rating 2000', 'PERFORMANCE', 500),

-- Social Badges (Level)
('LEVEL_10', 'Level 10', 'Mencapai Level 10', 'SOCIAL', 100),
('LEVEL_25', 'Level 25', 'Mencapai Level 25', 'SOCIAL', 250),
('LEVEL_50', 'Level 50', 'Mencapai Level 50', 'SOCIAL', 500),

-- Special Badges
('EARLY_ADOPTER', 'Early Adopter', 'Bergabung di fase awal PingpongHub', 'SPECIAL', 100),
('TOURNAMENT_WINNER', 'Juara Turnamen', 'Memenangkan turnamen resmi', 'SPECIAL', 300),
('TOURNAMENT_FINALIST', 'Finalis', 'Mencapai final turnamen resmi', 'SPECIAL', 150),
('VENUE_HOST', 'Host Venue', 'Mendaftarkan venue pertama', 'SPECIAL', 100),
('REVIEWER', 'Critic', 'Memberikan 10 review venue', 'SOCIAL', 50)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    xp_reward = EXCLUDED.xp_reward;
-- ============================================================
-- PingpongHub Storage Buckets & Policies
-- Migration: 006_storage_buckets.sql
-- Description: Create storage buckets with appropriate RLS policies
-- ============================================================

-- ============================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================

-- Avatars bucket (public for viewing, authenticated for upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Venue images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'venue-images',
    'venue-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Match photos bucket (authenticated access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'match-photos',
    'match-photos',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Tournament banners bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tournament-banners',
    'tournament-banners',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. STORAGE POLICIES FOR AVATARS
-- ============================================================

-- Anyone can view avatars
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 3. STORAGE POLICIES FOR VENUE IMAGES
-- ============================================================

-- Anyone can view venue images
DROP POLICY IF EXISTS "Venue images are publicly accessible" ON storage.objects;
CREATE POLICY "Venue images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'venue-images');

-- Venue owners can upload images
DROP POLICY IF EXISTS "Venue owners can upload images" ON storage.objects;
CREATE POLICY "Venue owners can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'venue-images' AND
    EXISTS (
        SELECT 1 FROM venues 
        WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
);

-- Venue owners can delete images
DROP POLICY IF EXISTS "Venue owners can delete images" ON storage.objects;
CREATE POLICY "Venue owners can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'venue-images' AND
    EXISTS (
        SELECT 1 FROM venues 
        WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
);

-- ============================================================
-- 4. STORAGE POLICIES FOR MATCH PHOTOS
-- ============================================================

-- Match participants can view photos
DROP POLICY IF EXISTS "Match participants can view photos" ON storage.objects;
CREATE POLICY "Match participants can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'match-photos' AND
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id::text = (storage.foldername(name))[1]
        AND (player1_id = auth.uid() OR player2_id = auth.uid())
    )
);

-- Match participants can upload photos
DROP POLICY IF EXISTS "Match participants can upload photos" ON storage.objects;
CREATE POLICY "Match participants can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'match-photos' AND
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id::text = (storage.foldername(name))[1]
        AND (player1_id = auth.uid() OR player2_id = auth.uid())
    )
);

-- ============================================================
-- 5. STORAGE POLICIES FOR TOURNAMENT BANNERS
-- ============================================================

-- Anyone can view tournament banners
DROP POLICY IF EXISTS "Tournament banners are publicly accessible" ON storage.objects;
CREATE POLICY "Tournament banners are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament-banners');

-- Tournament organizers can upload banners
DROP POLICY IF EXISTS "Tournament organizers can upload banners" ON storage.objects;
CREATE POLICY "Tournament organizers can upload banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tournament-banners' AND
    EXISTS (
        SELECT 1 FROM tournaments 
        WHERE id::text = (storage.foldername(name))[1]
        AND organizer_id = auth.uid()
    )
);

-- Tournament organizers can update banners
DROP POLICY IF EXISTS "Tournament organizers can update banners" ON storage.objects;
CREATE POLICY "Tournament organizers can update banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tournament-banners' AND
    EXISTS (
        SELECT 1 FROM tournaments 
        WHERE id::text = (storage.foldername(name))[1]
        AND organizer_id = auth.uid()
    )
);
-- ============================================================
-- PingpongHub Rate Limiting & Security Constraints
-- Migration: 007_rate_limiting.sql
-- Description: Database-level rate limiting and security
-- ============================================================

-- ============================================================
-- 1. CHALLENGE COOLDOWN (1 per hour to same player)
-- ============================================================

-- Function to check challenge cooldown
CREATE OR REPLACE FUNCTION check_challenge_cooldown()
RETURNS TRIGGER AS $$
DECLARE
    v_last_challenge TIMESTAMP;
    v_cooldown_hours INTEGER := 1;
BEGIN
    -- Check if there's a recent challenge to the same player
    SELECT created_at INTO v_last_challenge
    FROM challenges
    WHERE challenger_id = NEW.challenger_id
    AND challenged_id = NEW.challenged_id
    AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_last_challenge IS NOT NULL THEN
        RAISE EXCEPTION 'Challenge cooldown active. Please wait before challenging this player again.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS enforce_challenge_cooldown ON challenges;
CREATE TRIGGER enforce_challenge_cooldown
    BEFORE INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION check_challenge_cooldown();

-- ============================================================
-- 2. MESSAGE FLOOD PROTECTION (max 10 per minute)
-- ============================================================

-- Function to check message rate limit
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_message_count INTEGER;
    v_max_messages INTEGER := 10;
    v_window_minutes INTEGER := 1;
BEGIN
    -- Count recent messages from this sender
    SELECT COUNT(*) INTO v_message_count
    FROM messages
    WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
    IF v_message_count >= v_max_messages THEN
        RAISE EXCEPTION 'Message rate limit exceeded. Please wait before sending more messages.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS enforce_message_rate_limit ON messages;
CREATE TRIGGER enforce_message_rate_limit
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION check_message_rate_limit();

-- ============================================================
-- 3. PREVENT SELF-CHALLENGE
-- ============================================================

-- Function to prevent self-challenge
CREATE OR REPLACE FUNCTION prevent_self_challenge()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.challenger_id = NEW.challenged_id THEN
        RAISE EXCEPTION 'Cannot challenge yourself.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS prevent_self_challenge_trigger ON challenges;
CREATE TRIGGER prevent_self_challenge_trigger
    BEFORE INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_challenge();

-- ============================================================
-- 4. PREVENT DUPLICATE PENDING CHALLENGES
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_duplicate_pending_challenge()
RETURNS TRIGGER AS $$
DECLARE
    v_existing INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_existing
    FROM challenges
    WHERE challenger_id = NEW.challenger_id
    AND challenged_id = NEW.challenged_id
    AND status = 'PENDING';
    
    IF v_existing > 0 THEN
        RAISE EXCEPTION 'You already have a pending challenge to this player.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_duplicate_challenge ON challenges;
CREATE TRIGGER prevent_duplicate_challenge
    BEFORE INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_pending_challenge();

-- ============================================================
-- 5. MESSAGE CONTENT VALIDATION (prevent empty messages)
-- ============================================================

CREATE OR REPLACE FUNCTION validate_message_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Trim whitespace
    NEW.content := TRIM(NEW.content);
    
    -- Check for empty message
    IF NEW.content = '' OR NEW.content IS NULL THEN
        RAISE EXCEPTION 'Message content cannot be empty.';
    END IF;
    
    -- Limit message length
    IF LENGTH(NEW.content) > 2000 THEN
        RAISE EXCEPTION 'Message too long. Maximum 2000 characters allowed.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_message_trigger ON messages;
CREATE TRIGGER validate_message_trigger
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION validate_message_content();

-- ============================================================
-- 6. MATCH VALIDATION
-- ============================================================

CREATE OR REPLACE FUNCTION validate_match()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent self-match
    IF NEW.player1_id = NEW.player2_id THEN
        RAISE EXCEPTION 'Cannot create a match with yourself.';
    END IF;
    
    -- Validate best_of is odd number
    IF NEW.best_of % 2 = 0 THEN
        RAISE EXCEPTION 'best_of must be an odd number (1, 3, 5, 7).';
    END IF;
    
    -- Validate best_of range
    IF NEW.best_of < 1 OR NEW.best_of > 7 THEN
        RAISE EXCEPTION 'best_of must be between 1 and 7.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_match_trigger ON matches;
CREATE TRIGGER validate_match_trigger
    BEFORE INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION validate_match();
-- ============================================================
-- PingpongHub Extended Badges
-- Migration: 008_extended_badges.sql
-- Description: Add 10+ more badges for 30+ total badges
-- ============================================================

-- Additional badges
INSERT INTO badges (code, name, description, category, xp_reward) VALUES

-- More Competition Badges
('MATCH_250', 'Veteran', 'Bermain 250 match', 'COMPETITION', 300),
('MATCH_1000', 'The Legend', 'Bermain 1000 match', 'COMPETITION', 1000),
('WIN_250', 'Pemenang Platinum', 'Memenangkan 250 match', 'COMPETITION', 400),
('WIN_500', 'Pemenang Diamond', 'Memenangkan 500 match', 'COMPETITION', 750),

-- More Performance Badges
('STREAK_15', 'On Fire', 'Win streak 15 kali berturut-turut', 'PERFORMANCE', 300),
('STREAK_20', 'Unstoppable', 'Win streak 20 kali berturut-turut', 'PERFORMANCE', 500),
('COMEBACK_KING', 'Comeback King', 'Menang setelah tertinggal 0-2 set', 'PERFORMANCE', 200),
('PERFECT_GAME', 'Perfect Game', 'Menang tanpa kehilangan 1 pun set', 'PERFORMANCE', 100),
('RATING_1000', 'Beginner Champion', 'Mencapai rating 1000', 'PERFORMANCE', 25),
('RATING_2200', 'Super Grandmaster', 'Mencapai rating 2200', 'PERFORMANCE', 750),
('RATING_2500', 'World Class', 'Mencapai rating 2500', 'PERFORMANCE', 1000),

-- Social Badges
('FRIEND_5', 'Friendly', 'Memiliki 5 teman', 'SOCIAL', 25),
('FRIEND_10', 'Social Player', 'Memiliki 10 teman', 'SOCIAL', 50),
('FRIEND_25', 'Connector', 'Memiliki 25 teman', 'SOCIAL', 100),
('FRIEND_50', 'Influencer', 'Memiliki 50 teman', 'SOCIAL', 200),
('CHAT_100', 'Chatterbox', 'Mengirim 100 pesan', 'SOCIAL', 30),
('CHAT_500', 'Communicator', 'Mengirim 500 pesan', 'SOCIAL', 75),

-- Venue Badges
('VENUE_EXPLORER', 'Explorer', 'Bermain di 5 venue berbeda', 'SOCIAL', 50),
('VENUE_TRAVELER', 'Traveler', 'Bermain di 10 venue berbeda', 'SOCIAL', 100),
('REVIEWER_PRO', 'Review Expert', 'Memberikan 25 review venue', 'SOCIAL', 100),

-- Tournament Badges
('TOURNAMENT_3', 'Tournament Regular', 'Mengikuti 3 turnamen', 'COMPETITION', 75),
('TOURNAMENT_10', 'Tournament Veteran', 'Mengikuti 10 turnamen', 'COMPETITION', 200),
('TOURNAMENT_CHAMPION_3', 'Triple Crown', 'Memenangkan 3 turnamen', 'SPECIAL', 500),

-- Special Achievement Badges
('DAILY_PLAYER', 'Daily Warrior', 'Bermain 7 hari berturut-turut', 'SPECIAL', 100),
('WEEKLY_CHAMPION', 'Week Champion', 'Top 10 leaderboard mingguan', 'SPECIAL', 150),
('MONTHLY_CHAMPION', 'Month Champion', 'Top 10 leaderboard bulanan', 'SPECIAL', 300),
('FIRST_CHALLENGE', 'Challenger', 'Mengirim tantangan pertama', 'SOCIAL', 15),
('CHALLENGE_ACCEPTED', 'Brave Soul', 'Menerima tantangan pertama', 'SOCIAL', 15)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    xp_reward = EXCLUDED.xp_reward;

-- ============================================================
-- UPDATE BADGE CHECK FUNCTION FOR NEW BADGES
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS SETOF UUID AS $$
DECLARE
    v_profile RECORD;
    v_badge RECORD;
    v_already_has BOOLEAN;
    v_meets_requirement BOOLEAN;
    v_friend_count INTEGER;
    v_message_count INTEGER;
    v_venue_count INTEGER;
    v_review_count INTEGER;
    v_tournament_count INTEGER;
    v_tournament_wins INTEGER;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Get additional counts
    SELECT COUNT(*) INTO v_friend_count 
    FROM friendships 
    WHERE (user_id = p_user_id OR friend_id = p_user_id) 
    AND status = 'ACCEPTED';
    
    SELECT COUNT(*) INTO v_message_count 
    FROM messages 
    WHERE sender_id = p_user_id;
    
    SELECT COUNT(DISTINCT venue_id) INTO v_venue_count 
    FROM matches 
    WHERE (player1_id = p_user_id OR player2_id = p_user_id) 
    AND venue_id IS NOT NULL;
    
    SELECT COUNT(*) INTO v_review_count 
    FROM venue_reviews 
    WHERE user_id = p_user_id;
    
    -- Loop through all badges
    FOR v_badge IN SELECT * FROM badges LOOP
        -- Check if user already has this badge
        SELECT EXISTS(
            SELECT 1 FROM user_badges 
            WHERE user_id = p_user_id AND badge_id = v_badge.id
        ) INTO v_already_has;
        
        IF NOT v_already_has THEN
            v_meets_requirement := FALSE;
            
            -- Check different badge types based on requirement
            CASE v_badge.code
                -- Match count badges
                WHEN 'FIRST_MATCH' THEN v_meets_requirement := v_profile.total_matches >= 1;
                WHEN 'MATCH_10' THEN v_meets_requirement := v_profile.total_matches >= 10;
                WHEN 'MATCH_50' THEN v_meets_requirement := v_profile.total_matches >= 50;
                WHEN 'MATCH_100' THEN v_meets_requirement := v_profile.total_matches >= 100;
                WHEN 'MATCH_250' THEN v_meets_requirement := v_profile.total_matches >= 250;
                WHEN 'MATCH_500' THEN v_meets_requirement := v_profile.total_matches >= 500;
                WHEN 'MATCH_1000' THEN v_meets_requirement := v_profile.total_matches >= 1000;
                    
                -- Win count badges
                WHEN 'FIRST_WIN' THEN v_meets_requirement := v_profile.wins >= 1;
                WHEN 'WIN_10' THEN v_meets_requirement := v_profile.wins >= 10;
                WHEN 'WIN_50' THEN v_meets_requirement := v_profile.wins >= 50;
                WHEN 'WIN_100' THEN v_meets_requirement := v_profile.wins >= 100;
                WHEN 'WIN_250' THEN v_meets_requirement := v_profile.wins >= 250;
                WHEN 'WIN_500' THEN v_meets_requirement := v_profile.wins >= 500;
                    
                -- Streak badges
                WHEN 'STREAK_3' THEN v_meets_requirement := v_profile.best_streak >= 3;
                WHEN 'STREAK_5' THEN v_meets_requirement := v_profile.best_streak >= 5;
                WHEN 'STREAK_10' THEN v_meets_requirement := v_profile.best_streak >= 10;
                WHEN 'STREAK_15' THEN v_meets_requirement := v_profile.best_streak >= 15;
                WHEN 'STREAK_20' THEN v_meets_requirement := v_profile.best_streak >= 20;
                    
                -- Rating badges
                WHEN 'RATING_1000' THEN v_meets_requirement := v_profile.rating_mr >= 1000;
                WHEN 'RATING_1200' THEN v_meets_requirement := v_profile.rating_mr >= 1200;
                WHEN 'RATING_1500' THEN v_meets_requirement := v_profile.rating_mr >= 1500;
                WHEN 'RATING_1800' THEN v_meets_requirement := v_profile.rating_mr >= 1800;
                WHEN 'RATING_2000' THEN v_meets_requirement := v_profile.rating_mr >= 2000;
                WHEN 'RATING_2200' THEN v_meets_requirement := v_profile.rating_mr >= 2200;
                WHEN 'RATING_2500' THEN v_meets_requirement := v_profile.rating_mr >= 2500;
                    
                -- Level badges
                WHEN 'LEVEL_10' THEN v_meets_requirement := v_profile.level >= 10;
                WHEN 'LEVEL_25' THEN v_meets_requirement := v_profile.level >= 25;
                WHEN 'LEVEL_50' THEN v_meets_requirement := v_profile.level >= 50;
                    
                -- Friend badges
                WHEN 'FRIEND_5' THEN v_meets_requirement := v_friend_count >= 5;
                WHEN 'FRIEND_10' THEN v_meets_requirement := v_friend_count >= 10;
                WHEN 'FRIEND_25' THEN v_meets_requirement := v_friend_count >= 25;
                WHEN 'FRIEND_50' THEN v_meets_requirement := v_friend_count >= 50;
                    
                -- Message badges
                WHEN 'CHAT_100' THEN v_meets_requirement := v_message_count >= 100;
                WHEN 'CHAT_500' THEN v_meets_requirement := v_message_count >= 500;
                    
                -- Venue badges
                WHEN 'VENUE_EXPLORER' THEN v_meets_requirement := v_venue_count >= 5;
                WHEN 'VENUE_TRAVELER' THEN v_meets_requirement := v_venue_count >= 10;
                
                -- Review badges
                WHEN 'REVIEWER' THEN v_meets_requirement := v_review_count >= 10;
                WHEN 'REVIEWER_PRO' THEN v_meets_requirement := v_review_count >= 25;
                    
                ELSE v_meets_requirement := FALSE;
            END CASE;
            
            -- Award badge if requirement met
            IF v_meets_requirement THEN
                INSERT INTO user_badges (user_id, badge_id)
                VALUES (p_user_id, v_badge.id);
                
                -- Award XP from badge
                IF v_badge.xp_reward > 0 THEN
                    PERFORM award_xp(p_user_id, v_badge.xp_reward, 'Badge: ' || v_badge.name);
                END IF;
                
                -- Create notification
                INSERT INTO notifications (user_id, type, title, body, data)
                VALUES (
                    p_user_id,
                    'BADGE_EARNED',
                    'Badge Baru! ðŸ†',
                    'Kamu mendapatkan badge: ' || v_badge.name,
                    jsonb_build_object('badge_id', v_badge.id, 'badge_name', v_badge.name, 'xp_reward', v_badge.xp_reward)
                );
                
                RETURN NEXT v_badge.id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- PingpongHub Performance Monitoring
-- Migration: 009_performance_monitoring.sql
-- Description: Database performance tracking and analytics tables
-- ============================================================

-- ============================================================
-- 1. ENABLE PG_STAT_STATEMENTS (requires superuser)
-- ============================================================
-- Note: This needs to be enabled via Supabase Dashboard
-- Go to: Database > Extensions > Enable pg_stat_statements

-- ============================================================
-- 2. ANALYTICS EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    event_type VARCHAR(50) NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user and time
CREATE INDEX IF NOT EXISTS idx_analytics_user_time 
ON analytics_events(user_id, created_at DESC);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_type 
ON analytics_events(event_type, created_at DESC);

-- Partition by month for performance (optional for large-scale)
-- ALTER TABLE analytics_events SET (autovacuum_vacuum_scale_factor = 0.01);

-- ============================================================
-- 3. DAILY STATS AGGREGATION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,
    completed_matches INTEGER DEFAULT 0,
    ranked_matches INTEGER DEFAULT 0,
    friendly_matches INTEGER DEFAULT 0,
    total_challenges INTEGER DEFAULT 0,
    accepted_challenges INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_badges_earned INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date DESC);

-- ============================================================
-- 4. FUNCTION TO AGGREGATE DAILY STATS
-- ============================================================

CREATE OR REPLACE FUNCTION aggregate_daily_stats(p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID AS $$
DECLARE
    v_total_users INTEGER;
    v_active_users INTEGER;
    v_new_users INTEGER;
    v_total_matches INTEGER;
    v_completed_matches INTEGER;
    v_ranked_matches INTEGER;
    v_friendly_matches INTEGER;
    v_total_challenges INTEGER;
    v_accepted_challenges INTEGER;
    v_total_messages INTEGER;
    v_total_badges INTEGER;
BEGIN
    -- Total users
    SELECT COUNT(*) INTO v_total_users FROM profiles;
    
    -- Active users (played or sent message that day)
    SELECT COUNT(DISTINCT user_id) INTO v_active_users
    FROM (
        SELECT player1_id AS user_id FROM matches 
        WHERE DATE(created_at) = p_date
        UNION
        SELECT player2_id FROM matches 
        WHERE DATE(created_at) = p_date
        UNION
        SELECT sender_id FROM messages 
        WHERE DATE(created_at) = p_date
    ) active;
    
    -- New users
    SELECT COUNT(*) INTO v_new_users 
    FROM profiles 
    WHERE DATE(created_at) = p_date;
    
    -- Matches
    SELECT COUNT(*) INTO v_total_matches 
    FROM matches 
    WHERE DATE(created_at) = p_date;
    
    SELECT COUNT(*) INTO v_completed_matches 
    FROM matches 
    WHERE DATE(completed_at) = p_date AND status = 'COMPLETED';
    
    SELECT COUNT(*) INTO v_ranked_matches 
    FROM matches 
    WHERE DATE(created_at) = p_date AND type = 'RANKED';
    
    SELECT COUNT(*) INTO v_friendly_matches 
    FROM matches 
    WHERE DATE(created_at) = p_date AND type = 'FRIENDLY';
    
    -- Challenges
    SELECT COUNT(*) INTO v_total_challenges 
    FROM challenges 
    WHERE DATE(created_at) = p_date;
    
    SELECT COUNT(*) INTO v_accepted_challenges 
    FROM challenges 
    WHERE DATE(responded_at) = p_date AND status = 'ACCEPTED';
    
    -- Messages
    SELECT COUNT(*) INTO v_total_messages 
    FROM messages 
    WHERE DATE(created_at) = p_date;
    
    -- Badges
    SELECT COUNT(*) INTO v_total_badges 
    FROM user_badges 
    WHERE DATE(earned_at) = p_date;
    
    -- Upsert daily stats
    INSERT INTO daily_stats (
        stat_date, total_users, active_users, new_users,
        total_matches, completed_matches, ranked_matches, friendly_matches,
        total_challenges, accepted_challenges, total_messages, total_badges_earned
    ) VALUES (
        p_date, v_total_users, v_active_users, v_new_users,
        v_total_matches, v_completed_matches, v_ranked_matches, v_friendly_matches,
        v_total_challenges, v_accepted_challenges, v_total_messages, v_total_badges
    )
    ON CONFLICT (stat_date) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_users = EXCLUDED.active_users,
        new_users = EXCLUDED.new_users,
        total_matches = EXCLUDED.total_matches,
        completed_matches = EXCLUDED.completed_matches,
        ranked_matches = EXCLUDED.ranked_matches,
        friendly_matches = EXCLUDED.friendly_matches,
        total_challenges = EXCLUDED.total_challenges,
        accepted_challenges = EXCLUDED.accepted_challenges,
        total_messages = EXCLUDED.total_messages,
        total_badges_earned = EXCLUDED.total_badges_earned;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. FUNCTION TO GET DASHBOARD STATS
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_days INTEGER DEFAULT 7)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles),
        'total_matches', (SELECT COUNT(*) FROM matches WHERE status = 'COMPLETED'),
        'active_today', (
            SELECT COUNT(DISTINCT id) FROM profiles 
            WHERE last_active_at > NOW() - INTERVAL '24 hours'
        ),
        'matches_today', (
            SELECT COUNT(*) FROM matches 
            WHERE DATE(created_at) = CURRENT_DATE
        ),
        'daily_stats', (
            SELECT jsonb_agg(row_to_json(d))
            FROM (
                SELECT * FROM daily_stats
                WHERE stat_date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
                ORDER BY stat_date DESC
            ) d
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. RLS POLICIES FOR ANALYTICS
-- ============================================================


ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
DROP POLICY IF EXISTS "Users can insert own events" ON analytics_events;
CREATE POLICY "Users can insert own events" ON analytics_events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can view their own events
DROP POLICY IF EXISTS "Users can view own events" ON analytics_events;
CREATE POLICY "Users can view own events" ON analytics_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Daily stats are public read
DROP POLICY IF EXISTS "Daily stats are public" ON daily_stats;
CREATE POLICY "Daily stats are public" ON daily_stats
    FOR SELECT TO authenticated
    USING (true);

-- ============================================================
-- PingpongHub Admin & Moderation System
-- Migration: 010_admin_system.sql
-- Description: Admin fields, ban system, and moderation
-- ============================================================

-- ============================================================
-- 1. ADD ADMIN FIELDS TO PROFILES
-- ============================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_role VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ban_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- 2. ADD VERIFICATION FIELDS TO VENUES
-- ============================================================

ALTER TABLE venues
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT NULL;

-- ============================================================
-- 3. ADMIN LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

-- ============================================================
-- 4. REPORTS TABLE (for moderation)
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES profiles(id),
    reported_type VARCHAR(20) NOT NULL, -- 'user', 'message', 'venue_review'
    reported_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, REVIEWED, RESOLVED, DISMISSED
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for pending reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

-- ============================================================
-- 5. SYSTEM ANNOUNCEMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES profiles(id),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, MAINTENANCE, UPDATE
    target_audience VARCHAR(20) DEFAULT 'ALL', -- ALL, PREMIUM, NEW_USERS
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active announcements index
CREATE INDEX IF NOT EXISTS idx_announcements_active 
ON announcements(is_active, starts_at, ends_at);

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;


-- Only admins can view admin logs
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;
CREATE POLICY "Admins can view logs" ON admin_logs
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Only admins can insert logs
DROP POLICY IF EXISTS "Admins can insert logs" ON admin_logs;
CREATE POLICY "Admins can insert logs" ON admin_logs
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Users can create reports
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT TO authenticated
    USING (reporter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Active announcements are public
DROP POLICY IF EXISTS "Active announcements are public" ON announcements;
CREATE POLICY "Active announcements are public" ON announcements
    FOR SELECT TO authenticated
    USING (is_active = true AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()));

-- Admins can manage announcements
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements" ON announcements
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));


-- ============================================================
-- 7. FUNCTION: Check if user is banned
-- ============================================================

CREATE OR REPLACE FUNCTION check_user_banned()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is banned
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND is_banned = true 
        AND (ban_until IS NULL OR ban_until > NOW())
    ) THEN
        RAISE EXCEPTION 'User is banned';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply ban check to sensitive operations
DROP TRIGGER IF EXISTS check_ban_on_challenge ON challenges;
CREATE TRIGGER check_ban_on_challenge
    BEFORE INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION check_user_banned();

DROP TRIGGER IF EXISTS check_ban_on_message ON messages;
CREATE TRIGGER check_ban_on_message
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION check_user_banned();
