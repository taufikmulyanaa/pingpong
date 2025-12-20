-- Migration: 028_tournament_extras.sql
-- Tournament extras: photos, prize payments

-- ============================================
-- PART 1: TOURNAMENT PHOTOS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tournament_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES profiles(id),
    photo_url TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_photos_tournament ON tournament_photos(tournament_id);

-- RLS for tournament_photos
ALTER TABLE tournament_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_photos_select_public" ON tournament_photos;
CREATE POLICY "tournament_photos_select_public" ON tournament_photos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournament_photos_insert" ON tournament_photos;
CREATE POLICY "tournament_photos_insert" ON tournament_photos
    FOR INSERT WITH CHECK (
        uploader_id = auth.uid() AND (
            -- Organizer or participant can upload
            EXISTS (
                SELECT 1 FROM tournaments 
                WHERE id = tournament_id AND organizer_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM tournament_participants 
                WHERE tournament_id = tournament_photos.tournament_id 
                AND user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "tournament_photos_delete_organizer" ON tournament_photos;
CREATE POLICY "tournament_photos_delete_organizer" ON tournament_photos
    FOR DELETE USING (
        uploader_id = auth.uid() OR EXISTS (
            SELECT 1 FROM tournaments 
            WHERE id = tournament_id AND organizer_id = auth.uid()
        )
    );

-- ============================================
-- PART 2: PRIZE PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tournament_prize_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id),
    placement INTEGER NOT NULL, -- 1st, 2nd, 3rd place
    prize_type VARCHAR(20) DEFAULT 'CASH' CHECK (prize_type IN ('CASH', 'VOUCHER', 'TROPHY', 'OTHER')),
    amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'IDR',
    description TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'CLAIMED')),
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, placement, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_prize_payments_tournament ON tournament_prize_payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_prize_payments_recipient ON tournament_prize_payments(recipient_id);

-- RLS for tournament_prize_payments
ALTER TABLE tournament_prize_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_prize_select" ON tournament_prize_payments;
CREATE POLICY "tournament_prize_select" ON tournament_prize_payments
    FOR SELECT USING (
        recipient_id = auth.uid() OR EXISTS (
            SELECT 1 FROM tournaments 
            WHERE id = tournament_id AND organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tournament_prize_insert_organizer" ON tournament_prize_payments;
CREATE POLICY "tournament_prize_insert_organizer" ON tournament_prize_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE id = tournament_id AND organizer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tournament_prize_update_organizer" ON tournament_prize_payments;
CREATE POLICY "tournament_prize_update_organizer" ON tournament_prize_payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE id = tournament_id AND organizer_id = auth.uid()
        )
    );

-- ============================================
-- PART 3: ADD SEEDING OVERRIDE TO PARTICIPANTS
-- ============================================

ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS custom_seed INTEGER;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tournament_photos_updated_at ON tournament_photos;
CREATE TRIGGER update_tournament_photos_updated_at
    BEFORE UPDATE ON tournament_photos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS update_tournament_prize_payments_updated_at ON tournament_prize_payments;
CREATE TRIGGER update_tournament_prize_payments_updated_at
    BEFORE UPDATE ON tournament_prize_payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Comments
COMMENT ON TABLE tournament_photos IS 'Photo gallery for tournaments';
COMMENT ON TABLE tournament_prize_payments IS 'Prize payment tracking for tournament winners';
COMMENT ON COLUMN tournament_participants.custom_seed IS 'Custom seeding override set by organizer';
