-- ============================================================
-- PingpongHub: Fix Club Members RLS and Triggers
-- Migration: 023_fix_club_members_rls.sql
-- Description: Fix RLS policies and triggers for club_members table
-- ============================================================

-- ============================================================
-- 1. DROP AND RECREATE RLS POLICIES FOR club_members
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "club_members_select" ON club_members;
DROP POLICY IF EXISTS "club_members_insert" ON club_members;
DROP POLICY IF EXISTS "club_members_update" ON club_members;
DROP POLICY IF EXISTS "club_members_delete" ON club_members;

-- SELECT: Anyone authenticated can view members of public clubs
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

-- INSERT: Users can request to join, or club owner/admin can add members
CREATE POLICY "club_members_insert" ON club_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM club_members cm 
            WHERE cm.club_id = club_members.club_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('OWNER', 'ADMIN')
            AND cm.status = 'APPROVED'
        )
    );

-- UPDATE: Club owner or admin can update member status
CREATE POLICY "club_members_update" ON club_members
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM club_members cm 
            WHERE cm.club_id = club_members.club_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('OWNER', 'ADMIN')
            AND cm.status = 'APPROVED'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM club_members cm 
            WHERE cm.club_id = club_members.club_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('OWNER', 'ADMIN')
            AND cm.status = 'APPROVED'
        )
    );

-- DELETE: Users can leave or owner can remove
CREATE POLICY "club_members_delete" ON club_members
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM club_members cm 
            WHERE cm.club_id = club_members.club_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('OWNER', 'ADMIN')
            AND cm.status = 'APPROVED'
        )
    );

-- ============================================================
-- 2. FIX TRIGGER FUNCTION - Use SECURITY DEFINER properly
-- ============================================================
CREATE OR REPLACE FUNCTION update_club_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_club_id UUID;
    v_member_count INTEGER;
    v_avg_mr INTEGER;
BEGIN
    -- Determine which club_id to use
    v_club_id := COALESCE(NEW.club_id, OLD.club_id);
    
    -- Get new stats for approved members only
    SELECT 
        COUNT(*),
        COALESCE(AVG(p.rating_mr)::INTEGER, 1000)
    INTO v_member_count, v_avg_mr
    FROM club_members cm
    JOIN profiles p ON p.id = cm.user_id
    WHERE cm.club_id = v_club_id
    AND cm.status = 'APPROVED';
    
    -- Update club stats
    UPDATE clubs
    SET 
        member_count = v_member_count,
        avg_rating_mr = v_avg_mr,
        updated_at = NOW()
    WHERE id = v_club_id;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the main operation
        RAISE WARNING 'update_club_stats error: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. FIX joined_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_member_joined_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set joined_at when status changes to APPROVED
    IF (OLD.status IS DISTINCT FROM 'APPROVED') AND NEW.status = 'APPROVED' THEN
        NEW.joined_at := NOW();
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'set_member_joined_at error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
DROP TRIGGER IF EXISTS on_club_member_change ON club_members;
CREATE TRIGGER on_club_member_change
    AFTER INSERT OR UPDATE OR DELETE ON club_members
    FOR EACH ROW
    EXECUTE FUNCTION update_club_stats();

DROP TRIGGER IF EXISTS on_member_approved ON club_members;
CREATE TRIGGER on_member_approved
    BEFORE UPDATE ON club_members
    FOR EACH ROW
    EXECUTE FUNCTION set_member_joined_at();

-- ============================================================
-- 4. GRANT NECESSARY PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON club_members TO authenticated;
GRANT SELECT, UPDATE ON clubs TO authenticated;

-- Done!
SELECT 'Migration 023_fix_club_members_rls.sql completed successfully' as status;
