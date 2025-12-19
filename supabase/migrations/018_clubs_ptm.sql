-- ============================================================
-- PingpongHub PTM/Clubs Feature
-- Migration: 018_clubs_ptm.sql
-- Description: Tables for PTM (Perkumpulan Tenis Meja) / Clubs
-- ============================================================

-- ============================================================
-- 1. CLUBS TABLE (PTM)
-- ============================================================
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    city TEXT NOT NULL,
    province TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    email TEXT,
    website TEXT,
    social_media JSONB DEFAULT '{}',
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    avg_rating_mr INTEGER NOT NULL DEFAULT 1000,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CLUB_MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'COACH', 'MEMBER')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'BANNED')),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(club_id, user_id)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clubs_city ON clubs(city);
CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_status ON club_members(status);

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- Everyone can view public clubs
DROP POLICY IF EXISTS "clubs_select_public" ON clubs;
CREATE POLICY "clubs_select_public" ON clubs
    FOR SELECT TO authenticated
    USING (is_public = true OR owner_id = auth.uid());

-- Only owner can insert clubs
DROP POLICY IF EXISTS "clubs_insert_owner" ON clubs;
CREATE POLICY "clubs_insert_owner" ON clubs
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Only owner can update their clubs
DROP POLICY IF EXISTS "clubs_update_owner" ON clubs;
CREATE POLICY "clubs_update_owner" ON clubs
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Only owner can delete their clubs
DROP POLICY IF EXISTS "clubs_delete_owner" ON clubs;
CREATE POLICY "clubs_delete_owner" ON clubs
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- Club members policies
-- Anyone in club can view members (if club is public)
DROP POLICY IF EXISTS "club_members_select" ON club_members;
CREATE POLICY "club_members_select" ON club_members
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND (c.is_public = true OR c.owner_id = auth.uid())
        )
        OR user_id = auth.uid()
    );

-- Users can request to join (insert themselves)
DROP POLICY IF EXISTS "club_members_insert" ON club_members;
CREATE POLICY "club_members_insert" ON club_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM clubs c WHERE c.id = club_members.club_id AND c.owner_id = auth.uid()
        )
    );

-- Club owner/admin can update members
DROP POLICY IF EXISTS "club_members_update" ON club_members;
CREATE POLICY "club_members_update" ON club_members
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM clubs c WHERE c.id = club_members.club_id AND c.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM club_members cm 
            WHERE cm.club_id = club_members.club_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('OWNER', 'ADMIN')
        )
    );

-- Users can leave (delete themselves) or owner can remove
DROP POLICY IF EXISTS "club_members_delete" ON club_members;
CREATE POLICY "club_members_delete" ON club_members
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM clubs c WHERE c.id = club_members.club_id AND c.owner_id = auth.uid()
        )
    );

-- ============================================================
-- 5. TRIGGER: Update member count and avg MR
-- ============================================================
CREATE OR REPLACE FUNCTION update_club_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_member_count INTEGER;
    v_avg_mr INTEGER;
BEGIN
    -- Get new stats
    SELECT 
        COUNT(*),
        COALESCE(AVG(p.rating_mr)::INTEGER, 1000)
    INTO v_member_count, v_avg_mr
    FROM club_members cm
    JOIN profiles p ON p.id = cm.user_id
    WHERE cm.club_id = COALESCE(NEW.club_id, OLD.club_id)
    AND cm.status = 'APPROVED';
    
    -- Update club
    UPDATE clubs
    SET 
        member_count = v_member_count,
        avg_rating_mr = v_avg_mr,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.club_id, OLD.club_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_club_member_change ON club_members;
CREATE TRIGGER on_club_member_change
    AFTER INSERT OR UPDATE OR DELETE ON club_members
    FOR EACH ROW
    EXECUTE FUNCTION update_club_stats();

-- ============================================================
-- 6. TRIGGER: Set joined_at when approved
-- ============================================================
CREATE OR REPLACE FUNCTION set_member_joined_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'APPROVED' AND NEW.status = 'APPROVED' THEN
        NEW.joined_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_member_approved ON club_members;
CREATE TRIGGER on_member_approved
    BEFORE UPDATE ON club_members
    FOR EACH ROW
    EXECUTE FUNCTION set_member_joined_at();
