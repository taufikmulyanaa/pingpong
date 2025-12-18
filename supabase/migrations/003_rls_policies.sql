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
