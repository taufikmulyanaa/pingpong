-- Add explicit Foreign Key from bookings.user_id to profiles.id
-- This allows Supabase to join bookings with profiles using "user:profiles(...)"

ALTER TABLE bookings
ADD CONSTRAINT bookings_user_id_fkey_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles(id);
