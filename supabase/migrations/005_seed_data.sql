-- ============================================================
-- PingpongHub Seed Data
-- Migration: 005_seed_data.sql
-- Description: Initial badges and sample data
-- ============================================================

-- ============================================================
-- BADGES SEED DATA
-- ============================================================

INSERT INTO badges (code, name, description, category, xp_reward) VALUES
-- Competition Badges (Match Count)
('FIRST_MATCH', 'Debut', 'Bermain match pertama kamu', 'COMPETITION', 25),
('MATCH_10', 'Pemain Aktif', 'Bermain 10 match', 'COMPETITION', 50),
('MATCH_50', 'Pemain Berdedikasi', 'Bermain 50 match', 'COMPETITION', 100),
('MATCH_100', 'Legenda Lapangan', 'Bermain 100 match', 'COMPETITION', 200),
('MATCH_500', 'Master 500', 'Bermain 500 match', 'COMPETITION', 500),

-- Competition Badges (Win Count)
('FIRST_WIN', 'Kemenangan Pertama', 'Memenangkan match pertama', 'COMPETITION', 25),
('WIN_10', 'Pemenang Bronze', 'Memenangkan 10 match', 'COMPETITION', 50),
('WIN_50', 'Pemenang Silver', 'Memenangkan 50 match', 'COMPETITION', 100),
('WIN_100', 'Pemenang Gold', 'Memenangkan 100 match', 'COMPETITION', 200),

-- Performance Badges (Streaks)
('STREAK_3', 'Hat-trick', 'Win streak 3 kali berturut-turut', 'PERFORMANCE', 30),
('STREAK_5', 'Dominasi', 'Win streak 5 kali berturut-turut', 'PERFORMANCE', 75),
('STREAK_10', 'Tak Terkalahkan', 'Win streak 10 kali berturut-turut', 'PERFORMANCE', 150),

-- Performance Badges (Rating)
('RATING_1200', 'Rising Star', 'Mencapai rating 1200', 'PERFORMANCE', 50),
('RATING_1500', 'Challenger', 'Mencapai rating 1500', 'PERFORMANCE', 100),
('RATING_1800', 'Elite Player', 'Mencapai rating 1800', 'PERFORMANCE', 200),
('RATING_2000', 'Grandmaster', 'Mencapai rating 2000', 'PERFORMANCE', 500),

-- Social Badges (Level)
('LEVEL_10', 'Level 10', 'Mencapai Level 10', 'SOCIAL', 100),
('LEVEL_25', 'Level 25', 'Mencapai Level 25', 'SOCIAL', 250),
('LEVEL_50', 'Level 50', 'Mencapai Level 50', 'SOCIAL', 500),

-- Special Badges
('EARLY_ADOPTER', 'Early Adopter', 'Bergabung di fase awal PingpongHub', 'SPECIAL', 100),
('TOURNAMENT_WINNER', 'Juara Turnamen', 'Memenangkan turnamen resmi', 'SPECIAL', 300),
('TOURNAMENT_FINALIST', 'Finalis', 'Mencapai final turnamen resmi', 'SPECIAL', 150),
('VENUE_HOST', 'Host Venue', 'Mendaftarkan venue pertama', 'SPECIAL', 100),
('REVIEWER', 'Critic', 'Memberikan 10 review venue', 'SOCIAL', 50)

ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    xp_reward = EXCLUDED.xp_reward;
