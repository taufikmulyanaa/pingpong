// usePlayerStats Hook
// Real-time player statistics with level/rating calculations

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Profile, Badge } from "../types/database";
import {
    getPlayerStats,
    getRatingTier,
    getLevelTitle,
} from "../lib/game";

interface PlayerStatsData {
    profile: Profile | null;
    stats: ReturnType<typeof getPlayerStats> | null;
    badges: (Badge & { earned_at?: string })[];
    allBadges: Badge[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function usePlayerStats(userId: string): PlayerStatsData {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [badges, setBadges] = useState<(Badge & { earned_at?: string })[]>([]);
    const [allBadges, setAllBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (profileError) throw profileError;
            setProfile(profileData as Profile);

            // Fetch user's earned badges
            const { data: userBadges, error: badgesError } = await supabase
                .from("user_badges")
                .select(`
                    earned_at,
                    badge:badges(*)
                `)
                .eq("user_id", userId);

            if (badgesError) throw badgesError;

            const earnedBadges = (userBadges || []).map((ub: any) => ({
                ...(ub.badge as Badge),
                earned_at: ub.earned_at,
            }));
            setBadges(earnedBadges);

            // Fetch all badges for progress tracking
            const { data: allBadgesData, error: allBadgesError } = await supabase
                .from("badges")
                .select("*")
                .order("category", { ascending: true });

            if (allBadgesError) throw allBadgesError;
            setAllBadges((allBadgesData || []) as Badge[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Subscribe to profile changes
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`player-stats:${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "profiles",
                    filter: `id=eq.${userId}`,
                },
                (payload) => {
                    setProfile(payload.new as Profile);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "user_badges",
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    // Fetch the new badge details
                    const { data: badge } = await supabase
                        .from("badges")
                        .select("*")
                        .eq("id", (payload.new as any).badge_id)
                        .single();

                    if (badge) {
                        setBadges((prev) => [
                            ...prev,
                            { ...(badge as Badge), earned_at: (payload.new as any).earned_at },
                        ]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const stats = profile ? getPlayerStats(profile) : null;

    return {
        profile,
        stats,
        badges,
        allBadges,
        loading,
        error,
        refresh: fetchData,
    };
}

// ============================================================
// useLeaderboard Hook
// ============================================================

interface LeaderboardEntry {
    rank: number;
    profile: Profile;
    tier: ReturnType<typeof getRatingTier>;
    title: string;
}

export function useLeaderboard(limit: number = 100) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from("profiles")
                    .select("*")
                    .order("rating_mr", { ascending: false })
                    .limit(limit);

                if (fetchError) throw fetchError;

                const entries: LeaderboardEntry[] = ((data || []) as Profile[]).map(
                    (profile, index) => ({
                        rank: index + 1,
                        profile,
                        tier: getRatingTier(profile.rating_mr),
                        title: getLevelTitle(profile.level),
                    })
                );

                setLeaderboard(entries);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [limit]);

    return { leaderboard, loading, error };
}

// ============================================================
// useMatchHistory Hook
// ============================================================

interface MatchHistoryEntry {
    match: any;
    opponent: Profile;
    isWin: boolean;
    ratingChange: number;
}

export function useMatchHistory(userId: string, limit: number = 20) {
    const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;

        const fetchMatches = async () => {
            setLoading(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!player1_id(id, name, username, avatar_url, rating_mr),
                        player2:profiles!player2_id(id, name, username, avatar_url, rating_mr),
                        sets:match_sets(*)
                    `)
                    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
                    .eq("status", "COMPLETED")
                    .order("completed_at", { ascending: false })
                    .limit(limit);

                if (fetchError) throw fetchError;

                const entries: MatchHistoryEntry[] = (data || []).map((match: any) => {
                    const isPlayer1 = match.player1_id === userId;
                    const opponent = isPlayer1 ? match.player2 : match.player1;
                    const isWin = match.winner_id === userId;
                    const ratingChange = isPlayer1
                        ? match.player1_rating_change || 0
                        : match.player2_rating_change || 0;

                    return { match, opponent, isWin, ratingChange };
                });

                setMatches(entries);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMatches();
    }, [userId, limit]);

    return { matches, loading, error };
}
