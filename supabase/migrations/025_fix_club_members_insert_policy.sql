-- ============================================================
-- PingpongHub: Fix Infinite Recursion in Club Members RLS
-- Migration: 025_fix_club_members_insert_policy.sql
-- Description: Simplify INSERT policy to avoid infinite recursion
-- ============================================================

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "club_members_insert" ON club_members;

-- Recreate INSERT policy WITHOUT checking club_members table (to avoid recursion)
-- Users can ONLY insert themselves, or club OWNER can add (checked via clubs table only)
CREATE POLICY "club_members_insert" ON club_members
    FOR INSERT TO authenticated
    WITH CHECK (
        -- User can request to join themselves
        user_id = auth.uid() 
        -- OR club owner can add members (check via clubs table, NOT club_members)
        OR EXISTS (
            SELECT 1 FROM clubs c 
            WHERE c.id = club_members.club_id 
            AND c.owner_id = auth.uid()
        )
    );

-- Done!
SELECT 'Migration 025_fix_club_members_insert_policy.sql completed successfully' as status;
