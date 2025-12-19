-- ============================================================
-- Debug: Check what's causing 500 error
-- Run these queries one by one in Supabase SQL Editor
-- ============================================================

-- 1. First, check if there are any issues with the clubs table
SELECT id, name, owner_id, member_count FROM clubs LIMIT 5;

-- 2. Check the club_members record that's failing
SELECT * FROM club_members WHERE id = '5e48caeb-44de-4c25-ac95-c1fdf18360cb';

-- 3. Temporarily disable triggers to test if they're the issue
ALTER TABLE club_members DISABLE TRIGGER on_club_member_change;
ALTER TABLE club_members DISABLE TRIGGER on_member_approved;

-- 4. Try the update manually (replace the UUID with the actual one)
UPDATE club_members 
SET status = 'APPROVED' 
WHERE id = '5e48caeb-44de-4c25-ac95-c1fdf18360cb';

-- 5. If step 4 works, the issue is in the triggers
-- Re-enable triggers
ALTER TABLE club_members ENABLE TRIGGER on_club_member_change;
ALTER TABLE club_members ENABLE TRIGGER on_member_approved;

-- 6. If triggers are the issue, let's create simpler versions:

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_club_member_change ON club_members;
DROP TRIGGER IF EXISTS on_member_approved ON club_members;

-- Create a simpler update_club_stats function that won't fail
CREATE OR REPLACE FUNCTION update_club_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple update without complex logic
    UPDATE clubs
    SET 
        member_count = (
            SELECT COUNT(*) FROM club_members 
            WHERE club_id = COALESCE(NEW.club_id, OLD.club_id) 
            AND status = 'APPROVED'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.club_id, OLD.club_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simpler set_member_joined_at
CREATE OR REPLACE FUNCTION set_member_joined_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
        NEW.joined_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER on_member_approved
    BEFORE UPDATE ON club_members
    FOR EACH ROW
    EXECUTE FUNCTION set_member_joined_at();

CREATE TRIGGER on_club_member_change
    AFTER INSERT OR UPDATE OR DELETE ON club_members
    FOR EACH ROW
    EXECUTE FUNCTION update_club_stats();

-- Test the update again
UPDATE club_members 
SET status = 'APPROVED' 
WHERE id = '5e48caeb-44de-4c25-ac95-c1fdf18360cb';

SELECT 'Done! Check if the update worked.' as status;
