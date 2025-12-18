-- ============================================================
-- PingpongHub Storage Buckets & Policies
-- Migration: 006_storage_buckets.sql
-- Description: Create storage buckets with appropriate RLS policies
-- ============================================================

-- ============================================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================================

-- Avatars bucket (public for viewing, authenticated for upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Venue images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'venue-images',
    'venue-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Match photos bucket (authenticated access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'match-photos',
    'match-photos',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Tournament banners bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tournament-banners',
    'tournament-banners',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. STORAGE POLICIES FOR AVATARS
-- ============================================================

-- Anyone can view avatars
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 3. STORAGE POLICIES FOR VENUE IMAGES
-- ============================================================

-- Anyone can view venue images
DROP POLICY IF EXISTS "Venue images are publicly accessible" ON storage.objects;
CREATE POLICY "Venue images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'venue-images');

-- Venue owners can upload images
DROP POLICY IF EXISTS "Venue owners can upload images" ON storage.objects;
CREATE POLICY "Venue owners can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'venue-images' AND
    EXISTS (
        SELECT 1 FROM venues 
        WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
);

-- Venue owners can delete images
DROP POLICY IF EXISTS "Venue owners can delete images" ON storage.objects;
CREATE POLICY "Venue owners can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'venue-images' AND
    EXISTS (
        SELECT 1 FROM venues 
        WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
);

-- ============================================================
-- 4. STORAGE POLICIES FOR MATCH PHOTOS
-- ============================================================

-- Match participants can view photos
DROP POLICY IF EXISTS "Match participants can view photos" ON storage.objects;
CREATE POLICY "Match participants can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'match-photos' AND
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id::text = (storage.foldername(name))[1]
        AND (player1_id = auth.uid() OR player2_id = auth.uid())
    )
);

-- Match participants can upload photos
DROP POLICY IF EXISTS "Match participants can upload photos" ON storage.objects;
CREATE POLICY "Match participants can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'match-photos' AND
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id::text = (storage.foldername(name))[1]
        AND (player1_id = auth.uid() OR player2_id = auth.uid())
    )
);

-- ============================================================
-- 5. STORAGE POLICIES FOR TOURNAMENT BANNERS
-- ============================================================

-- Anyone can view tournament banners
DROP POLICY IF EXISTS "Tournament banners are publicly accessible" ON storage.objects;
CREATE POLICY "Tournament banners are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tournament-banners');

-- Tournament organizers can upload banners
DROP POLICY IF EXISTS "Tournament organizers can upload banners" ON storage.objects;
CREATE POLICY "Tournament organizers can upload banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tournament-banners' AND
    EXISTS (
        SELECT 1 FROM tournaments 
        WHERE id::text = (storage.foldername(name))[1]
        AND organizer_id = auth.uid()
    )
);

-- Tournament organizers can update banners
DROP POLICY IF EXISTS "Tournament organizers can update banners" ON storage.objects;
CREATE POLICY "Tournament organizers can update banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tournament-banners' AND
    EXISTS (
        SELECT 1 FROM tournaments 
        WHERE id::text = (storage.foldername(name))[1]
        AND organizer_id = auth.uid()
    )
);
