-- ============================================================
-- PingpongHub Database Schema
-- Migration: 001_create_tables.sql
-- Description: Creates all 12 tables with proper data types and constraints
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    city TEXT,
    province TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    grip_style TEXT NOT NULL DEFAULT 'SHAKEHAND' CHECK (grip_style IN ('SHAKEHAND', 'PENHOLD', 'SEEMILLER')),
    play_style TEXT NOT NULL DEFAULT 'ALLROUND' CHECK (play_style IN ('OFFENSIVE', 'DEFENSIVE', 'ALLROUND')),
    rating_mr INTEGER NOT NULL DEFAULT 1000,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    total_matches INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_active_at TIMESTAMPTZ,
    push_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. VENUES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone TEXT,
    table_count INTEGER NOT NULL DEFAULT 1,
    price_per_hour DECIMAL(10, 2),
    facilities TEXT[] DEFAULT '{}',
    opening_hours JSONB DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rating DECIMAL(2, 1) NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TOURNAMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    rules TEXT,
    banner_url TEXT,
    format TEXT NOT NULL CHECK (format IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'GROUP_STAGE')),
    category TEXT NOT NULL CHECK (category IN ('OPEN', 'MALE', 'FEMALE', 'DOUBLES', 'U17', 'U21', 'VETERAN_40', 'VETERAN_50')),
    max_participants INTEGER NOT NULL DEFAULT 16,
    current_participants INTEGER NOT NULL DEFAULT 0,
    registration_fee DECIMAL(10, 2),
    prize_pool DECIMAL(10, 2),
    registration_start TIMESTAMPTZ NOT NULL,
    registration_end TIMESTAMPTZ NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    is_ranked BOOLEAN NOT NULL DEFAULT TRUE,
    has_third_place BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. MATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('RANKED', 'FRIENDLY', 'TOURNAMENT')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
    best_of INTEGER NOT NULL DEFAULT 3 CHECK (best_of IN (1, 3, 5, 7)),
    player1_rating_before INTEGER,
    player2_rating_before INTEGER,
    player1_rating_change INTEGER,
    player2_rating_change INTEGER,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- ============================================================
-- 5. MATCH_SETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS match_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number >= 1 AND set_number <= 7),
    player1_score INTEGER NOT NULL DEFAULT 0 CHECK (player1_score >= 0),
    player2_score INTEGER NOT NULL DEFAULT 0 CHECK (player2_score >= 0),
    
    UNIQUE(match_id, set_number)
);

-- ============================================================
-- 6. CHALLENGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    challenged_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    match_type TEXT NOT NULL DEFAULT 'FRIENDLY' CHECK (match_type IN ('RANKED', 'FRIENDLY', 'TOURNAMENT')),
    best_of INTEGER NOT NULL DEFAULT 3 CHECK (best_of IN (1, 3, 5, 7)),
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT different_players_challenge CHECK (challenger_id != challenged_id)
);

-- ============================================================
-- 7. VENUE_REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(venue_id, user_id)
);

-- ============================================================
-- 8. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT different_users_message CHECK (sender_id != receiver_id)
);

-- ============================================================
-- 9. FRIENDSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'BLOCKED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    CONSTRAINT different_users_friendship CHECK (user_id != friend_id),
    UNIQUE(user_id, friend_id)
);

-- ============================================================
-- 10. BADGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('COMPETITION', 'PERFORMANCE', 'SOCIAL', 'SPECIAL')),
    requirement JSONB NOT NULL DEFAULT '{}',
    xp_reward INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- 11. USER_BADGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, badge_id)
);

-- ============================================================
-- 12. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'CHALLENGE_RECEIVED', 'CHALLENGE_ACCEPTED', 'CHALLENGE_DECLINED',
        'MATCH_REMINDER', 'MATCH_RESULT', 'FRIEND_REQUEST', 'FRIEND_ACCEPTED',
        'TOURNAMENT_REMINDER', 'LEVEL_UP', 'BADGE_EARNED', 'SYSTEM'
    )),
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TOURNAMENT_PARTICIPANTS TABLE (Junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seed INTEGER,
    status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'CHECKED_IN', 'ELIMINATED', 'WINNER')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(tournament_id, user_id)
);
