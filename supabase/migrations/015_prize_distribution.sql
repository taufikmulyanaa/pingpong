-- ============================================================
-- Add Prize Distribution Columns to Tournaments
-- Migration: 015_prize_distribution.sql
-- Description: Add columns to store individual prize amounts
-- ============================================================

-- Add prize distribution columns to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS prize_1st INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_2nd INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_3rd INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_harapan_1 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_harapan_2 INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_harapan_3 INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN tournaments.prize_1st IS 'Prize amount for 1st place winner';
COMMENT ON COLUMN tournaments.prize_2nd IS 'Prize amount for 2nd place winner';
COMMENT ON COLUMN tournaments.prize_3rd IS 'Prize amount for 3rd place winner';
COMMENT ON COLUMN tournaments.prize_harapan_1 IS 'Prize amount for consolation 1st place';
COMMENT ON COLUMN tournaments.prize_harapan_2 IS 'Prize amount for consolation 2nd place';
COMMENT ON COLUMN tournaments.prize_harapan_3 IS 'Prize amount for consolation 3rd place';
