// Real-time Notifications Hook
// Subscribes to notifications and challenges tables for instant updates

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Notification, Challenge } from "../types/database";

interface UseRealtimeNotificationsReturn {
    notifications: Notification[];
    challenges: Challenge[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    respondToChallenge: (
        challengeId: string,
        accept: boolean
    ) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useRealtimeNotifications(
    userId: string
): UseRealtimeNotificationsReturn {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Calculate unread count
    const unreadCount =
        notifications.filter((n) => !n.is_read).length +
        challenges.filter((c) => c.status === "PENDING").length;

    // Fetch initial data
    const fetchData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        try {
            // Fetch notifications
            const { data: notifData, error: notifError } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (notifError) throw notifError;
            setNotifications(notifData || []);

            // Fetch pending challenges
            const { data: challengeData, error: challengeError } = await supabase
                .from("challenges")
                .select(
                    `
          *,
          challenger:profiles!challenger_id(id, name, username, avatar_url, rating_mr)
        `
                )
                .eq("challenged_id", userId)
                .eq("status", "PENDING")
                .order("created_at", { ascending: false });

            if (challengeError) throw challengeError;
            setChallenges(challengeData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`notifications:${userId}`)
            // New notification
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setNotifications((prev) => [payload.new as Notification, ...prev]);
                }
            )
            // Notification read status update
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setNotifications((prev) =>
                        prev.map((n) =>
                            n.id === payload.new.id ? (payload.new as Notification) : n
                        )
                    );
                }
            )
            // New challenge received
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "challenges",
                    filter: `challenged_id=eq.${userId}`,
                },
                async (payload) => {
                    // Fetch challenger profile
                    const { data: challenger } = await supabase
                        .from("profiles")
                        .select("id, name, username, avatar_url, rating_mr")
                        .eq("id", payload.new.challenger_id)
                        .single();

                    const newChallenge: Challenge = {
                        ...(payload.new as Challenge),
                        challenger: challenger || undefined,
                    };
                    setChallenges((prev) => [newChallenge, ...prev]);
                }
            )
            // Challenge status update
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "challenges",
                    filter: `challenged_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.new.status !== "PENDING") {
                        // Remove from pending list
                        setChallenges((prev) =>
                            prev.filter((c) => c.id !== payload.new.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const markAsRead = useCallback(async (notificationId: string) => {
        await supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", notificationId);
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;

        await supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("user_id", userId)
            .eq("is_read", false);

        setNotifications((prev) =>
            prev.map((n) => ({
                ...n,
                is_read: true,
                read_at: n.read_at || new Date().toISOString(),
            }))
        );
    }, [userId]);

    const respondToChallenge = useCallback(
        async (challengeId: string, accept: boolean) => {
            const newStatus = accept ? "ACCEPTED" : "DECLINED";

            const { error: updateError } = await supabase
                .from("challenges")
                .update({
                    status: newStatus,
                    responded_at: new Date().toISOString(),
                })
                .eq("id", challengeId);

            if (updateError) {
                setError(updateError.message);
                return;
            }

            // If accepted, create a match
            if (accept) {
                const challenge = challenges.find((c) => c.id === challengeId);
                if (challenge) {
                    await supabase.from("matches").insert({
                        player1_id: challenge.challenger_id,
                        player2_id: challenge.challenged_id,
                        type: challenge.match_type,
                        best_of: challenge.best_of,
                        status: "PENDING",
                    });
                }
            }

            // Remove from local state
            setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
        },
        [challenges]
    );

    return {
        notifications,
        challenges,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        respondToChallenge,
        refresh: fetchData,
    };
}
