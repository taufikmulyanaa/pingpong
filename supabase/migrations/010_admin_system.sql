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
