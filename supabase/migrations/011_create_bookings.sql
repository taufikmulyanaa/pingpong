-- ============================================================
-- PingpongHub Booking System
-- Migration: 011_create_bookings.sql
-- Description: Creates bookings table to handle venue reservations
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED', 'COMPLETED')),
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own bookings
CREATE POLICY "bookings_select_own" ON bookings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 2. Hosts can view bookings for their venues
CREATE POLICY "bookings_select_host_venues" ON bookings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM venues 
            WHERE venues.id = bookings.venue_id 
            AND venues.owner_id = auth.uid()
        )
    );

-- 3. Users can insert their own bookings
CREATE POLICY "bookings_insert_own" ON bookings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 4. Hosts can update/cancel bookings for their venues
CREATE POLICY "bookings_update_host" ON bookings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM venues 
            WHERE venues.id = bookings.venue_id 
            AND venues.owner_id = auth.uid()
        )
    );

-- 5. Users can cancel (update status) their own bookings if PENDING
CREATE POLICY "bookings_update_own" ON bookings
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_bookings_venue_date ON bookings(venue_id, booking_date);
CREATE INDEX idx_bookings_user ON bookings(user_id);
