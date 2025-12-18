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

