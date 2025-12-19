-- ============================================================
-- Fix Tournament Banner Upload RLS Policy
-- Migration: 014_fix_banner_upload_policy.sql
-- Description: Simplify banner upload policy for authenticated users
-- ============================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Tournament organizers can upload banners" ON storage.objects;

-- Create simpler policy that allows any authenticated user to upload to tournament-banners
-- The application already validates organizer_id on tournament creation
CREATE POLICY "Authenticated users can upload tournament banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tournament-banners'
);

-- Allow authenticated users to update their uploads
DROP POLICY IF EXISTS "Tournament organizers can update banners" ON storage.objects;
CREATE POLICY "Authenticated users can update tournament banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tournament-banners');

-- Allow authenticated users to delete their uploads
DROP POLICY IF EXISTS "Tournament organizers can delete banners" ON storage.objects;
CREATE POLICY "Authenticated users can delete tournament banners"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tournament-banners');
