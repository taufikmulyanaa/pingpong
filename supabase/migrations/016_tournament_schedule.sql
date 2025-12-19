-- ============================================================
-- Add Schedule Column to Tournaments
-- Migration: 016_tournament_schedule.sql
-- Description: Add JSON column to store tournament schedule
-- ============================================================

-- Add schedule column to tournaments table (stores JSON array of schedule items)
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS schedule TEXT;

-- Add comment for documentation
COMMENT ON COLUMN tournaments.schedule IS 'JSON array of schedule items: [{id, time, event, day}]';
