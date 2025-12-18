// API Helper for Edge Functions
// Centralized functions to call Supabase Edge Functions

import { supabase } from "./supabase";

// Types
interface EloResult {
    player1_old_rating: number;
    player1_new_rating: number;
    player1_change: number;
    player2_old_rating: number;
    player2_new_rating: number;
    player2_change: number;
}

interface Badge {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon_url: string | null;
    category: string;
    xp_reward: number;
}

interface BadgeResult {
    awarded_badge_ids: string[];
    awarded_badges: Badge[];
}

interface NotificationResult {
    success: boolean;
    pushed: boolean;
    message?: string;
    push_result?: any;
}

interface MatchOpponent {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
    rating_mr: number;
    level: number;
    city: string | null;
    is_online: boolean;
    match_score: number;
    distance_km: number | null;
}

interface MatchMakingResult {
    player_rating: number;
    search_params: {
        rating_range: number;
        max_distance_km: number;
        match_type: string;
    };
    opponents: MatchOpponent[];
    challenge_created: any | null;
}

/**
 * Calculate ELO rating changes after match completion
 */
export async function calculateElo(
    matchId: string,
    winnerId: string
): Promise<{ data: EloResult | null; error: Error | null }> {
    try {
        const { data, error } = await supabase.functions.invoke<{
            success: boolean;
            result: EloResult;
        }>("calculate-elo", {
            body: { match_id: matchId, winner_id: winnerId },
        });

        if (error) throw error;
        return { data: data?.result || null, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
}

/**
 * Check and award badges for a user
 */
export async function awardBadge(
    userId: string
): Promise<{ data: BadgeResult | null; error: Error | null }> {
    try {
        const { data, error } = await supabase.functions.invoke<BadgeResult>(
            "award-badge",
            {
                body: { user_id: userId },
            }
        );

        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
}

/**
 * Send push notification to a user
 */
export async function sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<{ data: NotificationResult | null; error: Error | null }> {
    try {
        const { data: result, error } =
            await supabase.functions.invoke<NotificationResult>("send-notification", {
                body: { user_id: userId, title, body, data },
            });

        if (error) throw error;
        return { data: result, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
}

/**
 * Find suitable match opponents
 */
export async function findMatch(
    userId: string,
    options?: {
        ratingRange?: number;
        maxDistanceKm?: number;
        matchType?: "RANKED" | "FRIENDLY";
        autoCreateChallenge?: boolean;
    }
): Promise<{ data: MatchMakingResult | null; error: Error | null }> {
    try {
        const { data, error } = await supabase.functions.invoke<MatchMakingResult>(
            "match-making",
            {
                body: {
                    user_id: userId,
                    rating_range: options?.ratingRange,
                    max_distance_km: options?.maxDistanceKm,
                    match_type: options?.matchType,
                    auto_create_challenge: options?.autoCreateChallenge,
                },
            }
        );

        if (error) throw error;
        return { data, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
}

/**
 * Quick match - find opponents and auto-create challenge
 */
export async function quickMatch(
    userId: string,
    matchType: "RANKED" | "FRIENDLY" = "RANKED"
): Promise<{ data: MatchMakingResult | null; error: Error | null }> {
    return findMatch(userId, {
        ratingRange: 150, // Wider range for quick match
        maxDistanceKm: 50, // Larger area
        matchType,
        autoCreateChallenge: true,
    });
}
