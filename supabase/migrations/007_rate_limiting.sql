-- ============================================================
-- PingpongHub Rate Limiting & Security Constraints
-- Migration: 007_rate_limiting.sql
-- Description: Database-level rate limiting and security
-- ============================================================

-- ============================================================
-- 1. CHALLENGE COOLDOWN (1 per hour to same player)
-- ============================================================

-- Function to check challenge cooldown
CREATE OR REPLACE FUNCTION check_challenge_cooldown()
RETURNS TRIGGER AS $$
DECLARE
    v_last_challenge TIMESTAMP;
    v_cooldown_hours INTEGER := 1;
BEGIN
    -- Check if there's a recent challenge to the same player
    SELECT created_at INTO v_last_challenge
    FROM challenges
    WHERE challenger_id = NEW.challenger_id
    AND challenged_id = NEW.challenged_id
    AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_last_challenge IS NOT NULL THEN
        RAISE EXCEPTION 'Challenge cooldown active. Please wait before challenging this player again.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS enforce_challenge_cooldown ON challenges;
CREATE TRIGGER enforce_challenge_cooldown
    BEFORE INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION check_challenge_cooldown();

-- ============================================================
-- 2. MESSAGE FLOOD PROTECTION (max 10 per minute)
-- ============================================================

-- Function to check message rate limit
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_message_count INTEGER;
    v_max_messages INTEGER := 10;
    v_window_minutes INTEGER := 1;
BEGIN
    -- Count recent messages from this sender
    SELECT COUNT(*) INTO v_message_count
    FROM messages
    WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
    IF v_message_count >= v_max_messages THEN
        RAISE EXCEPTION 'Message rate limit exceeded. Please wait before sending more messages.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS enforce_message_rate_limit ON messages;
CREATE TRIGGER enforce_message_rate_limit
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION check_message_rate_limit();

-- ============================================================
-- 3. PREVENT SELF-CHALLENGE
-- ============================================================

-- Function to prevent self-challenge
CREATE OR REPLACE FUNCTION prevent_self_challenge()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.challenger_id = NEW.challenged_id THEN
        RAISE EXCEPTION 'Cannot challenge yourself.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS prevent_self_challenge_trigger ON challenges;
CREATE TRIGGER prevent_self_challenge_trigger
    BEFORE INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_challenge();

-- ============================================================
-- 4. PREVENT DUPLICATE PENDING CHALLENGES
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_duplicate_pending_challenge()
RETURNS TRIGGER AS $$
DECLARE
    v_existing INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_existing
    FROM challenges
    WHERE challenger_id = NEW.challenger_id
    AND challenged_id = NEW.challenged_id
    AND status = 'PENDING';
    
    IF v_existing > 0 THEN
        RAISE EXCEPTION 'You already have a pending challenge to this player.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_duplicate_challenge ON challenges;
CREATE TRIGGER prevent_duplicate_challenge
    BEFORE INSERT ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_pending_challenge();

-- ============================================================
-- 5. MESSAGE CONTENT VALIDATION (prevent empty messages)
-- ============================================================

CREATE OR REPLACE FUNCTION validate_message_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Trim whitespace
    NEW.content := TRIM(NEW.content);
    
    -- Check for empty message
    IF NEW.content = '' OR NEW.content IS NULL THEN
        RAISE EXCEPTION 'Message content cannot be empty.';
    END IF;
    
    -- Limit message length
    IF LENGTH(NEW.content) > 2000 THEN
        RAISE EXCEPTION 'Message too long. Maximum 2000 characters allowed.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_message_trigger ON messages;
CREATE TRIGGER validate_message_trigger
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION validate_message_content();

-- ============================================================
-- 6. MATCH VALIDATION
-- ============================================================

CREATE OR REPLACE FUNCTION validate_match()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent self-match
    IF NEW.player1_id = NEW.player2_id THEN
        RAISE EXCEPTION 'Cannot create a match with yourself.';
    END IF;
    
    -- Validate best_of is odd number
    IF NEW.best_of % 2 = 0 THEN
        RAISE EXCEPTION 'best_of must be an odd number (1, 3, 5, 7).';
    END IF;
    
    -- Validate best_of range
    IF NEW.best_of < 1 OR NEW.best_of > 7 THEN
        RAISE EXCEPTION 'best_of must be between 1 and 7.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_match_trigger ON matches;
CREATE TRIGGER validate_match_trigger
    BEFORE INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION validate_match();
