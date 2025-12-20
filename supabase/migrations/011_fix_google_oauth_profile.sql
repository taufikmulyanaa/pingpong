-- ============================================================
-- PingpongHub Fix Google OAuth Profile Creation
-- Migration: 011_fix_google_oauth_profile.sql
-- Description: Fixes profile creation trigger to properly extract 
--              name and avatar from Google OAuth metadata
-- ============================================================

-- Function to create profile when new user signs up
-- This version properly handles Google OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_avatar_url TEXT;
    v_username TEXT;
BEGIN
    -- Extract name: Google uses 'full_name' or 'name', regular signup uses 'name'
    v_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',  -- Google OAuth
        NEW.raw_user_meta_data->>'name',        -- Regular signup or other providers
        split_part(NEW.email, '@', 1)           -- Fallback to email prefix
    );
    
    -- Extract avatar URL: Google uses 'avatar_url' or 'picture'
    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',  -- Some providers
        NEW.raw_user_meta_data->>'picture'      -- Google OAuth
    );
    
    -- Generate username from name
    v_username := LOWER(REPLACE(v_name, ' ', '_')) || '_' || SUBSTRING(NEW.id::text, 1, 8);
    
    INSERT INTO public.profiles (id, email, name, username, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        v_name,
        v_username,
        v_avatar_url
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Also, update existing Google user profiles that have default values
-- This is a one-time fix for users who already signed up with Google
-- ============================================================

-- Update existing profiles that have 'User' or email prefix as name
-- by extracting the correct name from auth.users metadata
DO $$
DECLARE
    r RECORD;
    v_name TEXT;
    v_avatar_url TEXT;
    v_username TEXT;
BEGIN
    FOR r IN 
        SELECT 
            p.id,
            p.name,
            p.avatar_url,
            u.raw_user_meta_data,
            u.email
        FROM profiles p
        JOIN auth.users u ON p.id = u.id
        WHERE 
            (p.name = 'User' OR p.name LIKE '%@%' OR p.name = split_part(u.email, '@', 1))
            AND u.raw_user_meta_data IS NOT NULL
            AND (
                u.raw_user_meta_data->>'full_name' IS NOT NULL 
                OR u.raw_user_meta_data->>'name' IS NOT NULL
            )
    LOOP
        -- Extract correct name
        v_name := COALESCE(
            r.raw_user_meta_data->>'full_name',
            r.raw_user_meta_data->>'name',
            r.name
        );
        
        -- Extract avatar URL if not already set
        IF r.avatar_url IS NULL THEN
            v_avatar_url := COALESCE(
                r.raw_user_meta_data->>'avatar_url',
                r.raw_user_meta_data->>'picture'
            );
        ELSE
            v_avatar_url := r.avatar_url;
        END IF;
        
        -- Generate new username
        v_username := LOWER(REPLACE(v_name, ' ', '_')) || '_' || SUBSTRING(r.id::text, 1, 8);
        
        -- Update profile
        UPDATE profiles 
        SET 
            name = v_name,
            avatar_url = COALESCE(v_avatar_url, avatar_url),
            username = v_username,
            updated_at = NOW()
        WHERE id = r.id;
        
        RAISE NOTICE 'Updated profile for user %: name=%, avatar=%', r.id, v_name, v_avatar_url;
    END LOOP;
END $$;
