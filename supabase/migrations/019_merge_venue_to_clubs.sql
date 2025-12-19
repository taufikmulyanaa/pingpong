-- ============================================================
-- Merge Venue Functionality into Club PTM
-- Migration: 019_merge_venue_to_clubs.sql
-- ============================================================

-- ============================================================
-- 1. ADD VENUE COLUMNS TO CLUBS TABLE
-- ============================================================
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS facilities TEXT[];
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS table_count INTEGER DEFAULT 0;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS price_per_hour INTEGER DEFAULT 0;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- ============================================================
-- 2. CREATE CLUB REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS club_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(club_id, user_id)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_club_reviews_club ON club_reviews(club_id);
CREATE INDEX IF NOT EXISTS idx_club_reviews_user ON club_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_clubs_rating ON clubs(rating);
CREATE INDEX IF NOT EXISTS idx_clubs_facilities ON clubs USING GIN(facilities);

-- ============================================================
-- 4. RLS POLICIES FOR CLUB REVIEWS
-- ============================================================
ALTER TABLE club_reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
DROP POLICY IF EXISTS "club_reviews_select" ON club_reviews;
CREATE POLICY "club_reviews_select" ON club_reviews
    FOR SELECT TO authenticated
    USING (true);

-- Users can insert their own reviews
DROP POLICY IF EXISTS "club_reviews_insert" ON club_reviews;
CREATE POLICY "club_reviews_insert" ON club_reviews
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own reviews
DROP POLICY IF EXISTS "club_reviews_update" ON club_reviews;
CREATE POLICY "club_reviews_update" ON club_reviews
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own reviews
DROP POLICY IF EXISTS "club_reviews_delete" ON club_reviews;
CREATE POLICY "club_reviews_delete" ON club_reviews
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- ============================================================
-- 5. TRIGGER: Update club rating when review changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_club_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(2,1);
    v_review_count INTEGER;
BEGIN
    SELECT 
        COALESCE(AVG(rating)::DECIMAL(2,1), 0),
        COUNT(*)
    INTO v_avg_rating, v_review_count
    FROM club_reviews
    WHERE club_id = COALESCE(NEW.club_id, OLD.club_id);
    
    UPDATE clubs
    SET 
        rating = v_avg_rating,
        review_count = v_review_count,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.club_id, OLD.club_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_club_review_change ON club_reviews;
CREATE TRIGGER on_club_review_change
    AFTER INSERT OR UPDATE OR DELETE ON club_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_club_rating();

-- ============================================================
-- 6. CREATE CLUB BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS club_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. INDEXES FOR BOOKINGS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_club_bookings_club ON club_bookings(club_id);
CREATE INDEX IF NOT EXISTS idx_club_bookings_user ON club_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_club_bookings_date ON club_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_club_bookings_status ON club_bookings(status);

-- ============================================================
-- 8. RLS POLICIES FOR CLUB BOOKINGS
-- ============================================================
ALTER TABLE club_bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings and club owners can view all bookings for their club
DROP POLICY IF EXISTS "club_bookings_select" ON club_bookings;
CREATE POLICY "club_bookings_select" ON club_bookings
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM clubs c WHERE c.id = club_bookings.club_id AND c.owner_id = auth.uid()
        )
    );

-- Users can create bookings
DROP POLICY IF EXISTS "club_bookings_insert" ON club_bookings;
CREATE POLICY "club_bookings_insert" ON club_bookings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their pending bookings, club owners can update any booking for their club
DROP POLICY IF EXISTS "club_bookings_update" ON club_bookings;
CREATE POLICY "club_bookings_update" ON club_bookings
    FOR UPDATE TO authenticated
    USING (
        (user_id = auth.uid() AND status = 'PENDING')
        OR EXISTS (
            SELECT 1 FROM clubs c WHERE c.id = club_bookings.club_id AND c.owner_id = auth.uid()
        )
    );

-- Users can delete their pending bookings
DROP POLICY IF EXISTS "club_bookings_delete" ON club_bookings;
CREATE POLICY "club_bookings_delete" ON club_bookings
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() AND status = 'PENDING');
