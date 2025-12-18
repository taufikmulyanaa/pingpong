-- PingpongHub Database Cleanup Script
-- Menghapus semua data mock/dummy KECUALI user wakwaw@contoh.com
-- Jalankan di Supabase SQL Editor

-- Disable triggers temporarily for faster deletion
SET session_replication_role = replica;

-- Delete from child tables first (respect foreign keys)
DELETE FROM tournament_participants;
DELETE FROM user_badges;
DELETE FROM notifications;
DELETE FROM venue_reviews;
DELETE FROM match_sets;
DELETE FROM messages;
DELETE FROM challenges;
DELETE FROM matches;
DELETE FROM friendships;
DELETE FROM tournaments;
DELETE FROM venues;

-- Delete analytics data
DELETE FROM analytics_events;
DELETE FROM daily_stats;

-- Delete admin data (reports, announcements, logs)
DELETE FROM reports;
DELETE FROM announcements;
DELETE FROM admin_logs;

-- Delete profiles EXCEPT wakwaw@contoh.com
-- First get the user ID from auth.users
DELETE FROM profiles 
WHERE id NOT IN (
    SELECT id FROM auth.users WHERE email = 'wakwaw@contoh.com'
);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify remaining data
SELECT 'profiles' as table_name, COUNT(*) as remaining FROM profiles
UNION ALL SELECT 'matches', COUNT(*) FROM matches
UNION ALL SELECT 'venues', COUNT(*) FROM venues
UNION ALL SELECT 'tournaments', COUNT(*) FROM tournaments
UNION ALL SELECT 'challenges', COUNT(*) FROM challenges
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
