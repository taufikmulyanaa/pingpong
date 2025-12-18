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
