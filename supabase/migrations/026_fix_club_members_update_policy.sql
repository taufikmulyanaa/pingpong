-- ============================================================
-- PingpongHub: Fix Infinite Recursion in Club Members UPDATE RLS
-- Migration: 026_fix_club_members_update_policy.sql
-- Description: Simplify UPDATE policy to avoid infinite recursion
-- ============================================================

-- Drop the problematic UPDATE policy
DROP POLICY IF EXISTS "club_members_update" ON club_members;

-- Recreate UPDATE policy WITHOUT checking club_members table (to avoid recursion)
-- Only club OWNER can update (checked via clubs table only)
CREATE POLICY "club_members_update" ON club_members
    FOR UPDATE TO authenticated
    USING (
        -- Club owner can update
        EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Club owner can update
        EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
    );

-- Also fix DELETE policy for consistency
DROP POLICY IF EXISTS "club_members_delete" ON club_members;

CREATE POLICY "club_members_delete" ON club_members
    FOR DELETE TO authenticated
    USING (
        -- User can leave (delete own membership)
        user_id = auth.uid()
        -- OR club owner can remove members
        OR EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
    );

-- Done!
SELECT 'Migration 026_fix_club_members_update_policy.sql completed successfully' as status;
