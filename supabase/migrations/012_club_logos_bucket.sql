-- Create storage bucket for club logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'club-logos',
    'club-logos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for club-logos bucket
-- Anyone can view club logos
CREATE POLICY "Anyone can view club logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-logos');

-- Only authenticated users can upload club logos
CREATE POLICY "Authenticated users can upload club logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'club-logos');

-- Users can update their own club logos
CREATE POLICY "Users can update club logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'club-logos');

-- Users can delete their own club logos
CREATE POLICY "Users can delete club logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'club-logos');
