-- ============================================================
-- PingpongHub Notification Triggers
-- Migration: 017_notification_triggers.sql
-- Description: Auto-create notifications when events happen
-- ============================================================

-- ============================================================
-- 1. CREATE NOTIFICATION ON NEW CHALLENGE
-- ============================================================
CREATE OR REPLACE FUNCTION create_challenge_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for the challenged user
    INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        data,
        is_read
    ) VALUES (
        NEW.challenged_id,
        'CHALLENGE_RECEIVED',
        'Tantangan Baru!',
        COALESCE(NEW.message, 'Seseorang mengajak kamu bertanding!'),
        jsonb_build_object(
            'challengeId', NEW.id,
            'challengerId', NEW.challenger_id,
            'matchType', NEW.match_type,
            'bestOf', NEW.best_of
        ),
        false
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_challenge_created ON challenges;
CREATE TRIGGER on_challenge_created
    AFTER INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION create_challenge_notification();

-- ============================================================
-- 2. CREATE NOTIFICATION ON CHALLENGE ACCEPTED/DECLINED
-- ============================================================
CREATE OR REPLACE FUNCTION create_challenge_response_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire when status changes to ACCEPTED or DECLINED
    IF OLD.status = 'PENDING' AND NEW.status IN ('ACCEPTED', 'DECLINED') THEN
        INSERT INTO notifications (
            user_id,
            type,
            title,
            body,
            data,
            is_read
        ) VALUES (
            NEW.challenger_id,
            CASE 
                WHEN NEW.status = 'ACCEPTED' THEN 'CHALLENGE_ACCEPTED'
                ELSE 'CHALLENGE_DECLINED'
            END,
            CASE 
                WHEN NEW.status = 'ACCEPTED' THEN 'Tantangan Diterima!'
                ELSE 'Tantangan Ditolak'
            END,
            CASE 
                WHEN NEW.status = 'ACCEPTED' THEN 'Lawanmu menerima tantangan. Siap bertanding!'
                ELSE 'Lawanmu menolak tantangan.'
            END,
            jsonb_build_object(
                'challengeId', NEW.id,
                'challengedId', NEW.challenged_id,
                'status', NEW.status
            ),
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_challenge_response ON challenges;
CREATE TRIGGER on_challenge_response
    AFTER UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION create_challenge_response_notification();

-- ============================================================
-- 3. CREATE NOTIFICATION ON NEW MESSAGE
-- ============================================================
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
BEGIN
    -- Get sender name
    SELECT name INTO v_sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
    
    -- Create notification for the receiver
    INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        data,
        is_read
    ) VALUES (
        NEW.receiver_id,
        'CHAT',
        COALESCE(v_sender_name, 'Seseorang') || ' mengirim pesan',
        LEFT(NEW.content, 100),
        jsonb_build_object(
            'messageId', NEW.id,
            'senderId', NEW.sender_id
        ),
        false
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification();

-- ============================================================
-- 4. CREATE NOTIFICATION ON MATCH COMPLETED
-- ============================================================
CREATE OR REPLACE FUNCTION create_match_result_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_winner_name TEXT;
    v_loser_id UUID;
BEGIN
    -- Only fire when match status changes to COMPLETED
    IF OLD.status != 'COMPLETED' AND NEW.status = 'COMPLETED' AND NEW.winner_id IS NOT NULL THEN
        -- Get winner name
        SELECT name INTO v_winner_name
        FROM profiles
        WHERE id = NEW.winner_id;
        
        -- Determine loser
        v_loser_id := CASE 
            WHEN NEW.winner_id = NEW.player1_id THEN NEW.player2_id
            ELSE NEW.player1_id
        END;
        
        -- Notification for winner
        INSERT INTO notifications (
            user_id, type, title, body, data, is_read
        ) VALUES (
            NEW.winner_id,
            'MATCH_RESULT',
            'Selamat! Kamu Menang! 🎉',
            'Rating MR kamu naik.',
            jsonb_build_object('matchId', NEW.id, 'result', 'WIN'),
            false
        );
        
        -- Notification for loser
        INSERT INTO notifications (
            user_id, type, title, body, data, is_read
        ) VALUES (
            v_loser_id,
            'MATCH_RESULT',
            'Pertandingan Selesai',
            'Jangan menyerah! Terus berlatih.',
            jsonb_build_object('matchId', NEW.id, 'result', 'LOSE'),
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_completed ON matches;
CREATE TRIGGER on_match_completed
    AFTER UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION create_match_result_notification();
