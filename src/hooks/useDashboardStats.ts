// useDashboardStats Hook
// Fetch platform-wide statistics for admin dashboard

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

interface DailyStat {
    stat_date: string;
    total_users: number;
    active_users: number;
    new_users: number;
    total_matches: number;
    completed_matches: number;
    ranked_matches: number;
    friendly_matches: number;
    total_challenges: number;
    accepted_challenges: number;
    total_messages: number;
    total_badges_earned: number;
}

interface DashboardStats {
    total_users: number;
    total_matches: number;
    active_today: number;
    matches_today: number;
    daily_stats: DailyStat[];
}

export function useDashboardStats(days: number = 7) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error: rpcError } = await supabase.rpc(
                "get_dashboard_stats" as any,
                { p_days: days } as any
            );

            if (rpcError) throw rpcError;
            setStats(data as DashboardStats);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Calculate trends
    const getTrends = useCallback(() => {
        if (!stats?.daily_stats || stats.daily_stats.length < 2) {
            return null;
        }

        const today = stats.daily_stats[0];
        const yesterday = stats.daily_stats[1];

        return {
            activeUsersTrend: calculateTrend(
                yesterday.active_users,
                today.active_users
            ),
            matchesTrend: calculateTrend(
                yesterday.completed_matches,
                today.completed_matches
            ),
            newUsersTrend: calculateTrend(
                yesterday.new_users,
                today.new_users
            ),
        };
    }, [stats]);

    return { stats, loading, error, refresh: fetchStats, getTrends };
}

function calculateTrend(previous: number, current: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

// Export types
export type { DashboardStats, DailyStat };
