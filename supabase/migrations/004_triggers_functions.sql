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
            'Level Up! 🎉',
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
            'Level Up! 🎉',
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
                    'Badge Baru! 🏆',
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
