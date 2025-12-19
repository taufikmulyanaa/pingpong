-- Function to finish a match and update ratings/stats atomically
CREATE OR REPLACE FUNCTION finish_match(
    p_match_id UUID,
    p_winner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match matches%ROWTYPE;
    v_loser_id UUID;
    v_p1_rating INTEGER;
    v_p2_rating INTEGER;
    v_k_factor INTEGER := 32;
    v_expected_p1 NUMERIC;
    v_expected_p2 NUMERIC;
    v_actual_p1 NUMERIC;
    v_actual_p2 NUMERIC;
    v_change_p1 INTEGER;
    v_change_p2 INTEGER;
    v_new_rating_p1 INTEGER;
    v_new_rating_p2 INTEGER;
    v_xp_gain INTEGER := 50; -- Base XP per match
    v_xp_win_bonus INTEGER := 50; -- Bonus XP for winner
BEGIN
    -- 1. Get match details
    SELECT * INTO v_match FROM matches WHERE id = p_match_id;
    
    IF v_match IS NULL THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_match.status = 'COMPLETED' THEN
        RAISE EXCEPTION 'Match already completed';
    END IF;

    -- 2. Determine loser and current ratings
    IF v_match.player1_id = p_winner_id THEN
        v_loser_id := v_match.player2_id;
    ELSE
        v_loser_id := v_match.player1_id;
    END IF;

    v_p1_rating := COALESCE(v_match.player1_rating_before, 1000);
    v_p2_rating := COALESCE(v_match.player2_rating_before, 1000);

    -- 3. Calculate ELO Rating Changes
    -- Expected scores: 1 / (1 + 10^((opp_rating - my_rating) / 400))
    v_expected_p1 := 1.0 / (1.0 + power(10.0, (v_p2_rating - v_p1_rating) / 400.0));
    v_expected_p2 := 1.0 - v_expected_p1;

    -- Actual scores
    IF p_winner_id = v_match.player1_id THEN
        v_actual_p1 := 1.0;
        v_actual_p2 := 0.0;
    ELSE
        v_actual_p1 := 0.0;
        v_actual_p2 := 1.0;
    END IF;

    -- Calculate changes
    v_change_p1 := ROUND(v_k_factor * (v_actual_p1 - v_expected_p1));
    v_change_p2 := ROUND(v_k_factor * (v_actual_p2 - v_expected_p2));

    -- Apply changes
    v_new_rating_p1 := v_p1_rating + v_change_p1;
    v_new_rating_p2 := v_p2_rating + v_change_p2;

    -- 4. Update Match
    UPDATE matches
    SET 
        status = 'COMPLETED',
        winner_id = p_winner_id,
        player1_rating_change = v_change_p1,
        player2_rating_change = v_change_p2,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;

    -- 5. Update Player 1 Stats
    UPDATE profiles
    SET 
        rating_mr = rating_mr + v_change_p1,
        total_matches = total_matches + 1,
        wins = wins + (CASE WHEN id = p_winner_id THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN id = v_loser_id THEN 1 ELSE 0 END),
        xp = xp + v_xp_gain + (CASE WHEN id = p_winner_id THEN v_xp_win_bonus ELSE 0 END),
        -- Recalculate level based on new XP
        level = 1 + floor((xp + v_xp_gain + (CASE WHEN id = p_winner_id THEN v_xp_win_bonus ELSE 0 END)) / 1000),
        current_streak = (CASE WHEN id = p_winner_id THEN current_streak + 1 ELSE 0 END)
    WHERE id = v_match.player1_id;

    -- 6. Update Player 2 Stats
    UPDATE profiles
    SET 
        rating_mr = rating_mr + v_change_p2,
        total_matches = total_matches + 1,
        wins = wins + (CASE WHEN id = p_winner_id THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN id = v_loser_id THEN 1 ELSE 0 END),
        xp = xp + v_xp_gain + (CASE WHEN id = p_winner_id THEN v_xp_win_bonus ELSE 0 END),
        level = 1 + floor((xp + v_xp_gain + (CASE WHEN id = p_winner_id THEN v_xp_win_bonus ELSE 0 END)) / 1000),
        current_streak = (CASE WHEN id = p_winner_id THEN current_streak + 1 ELSE 0 END)
    WHERE id = v_match.player2_id;

    -- 7. Return result
    RETURN jsonb_build_object(
        'new_rating_p1', v_new_rating_p1,
        'new_rating_p2', v_new_rating_p2,
        'change_p1', v_change_p1,
        'change_p2', v_change_p2
    );
END;
$$;
