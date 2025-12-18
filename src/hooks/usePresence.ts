// Presence Hook
// Track online/offline status using Supabase Presence

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AppState, AppStateStatus } from "react-native";

interface PresenceState {
    user_id: string;
    online_at: string;
    status: "online" | "away" | "offline";
}

interface UsePresenceReturn {
    onlineUsers: Map<string, PresenceState>;
    isOnline: (userId: string) => boolean;
    setStatus: (status: "online" | "away") => void;
}

export function usePresence(currentUserId: string): UsePresenceReturn {
    const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(
        new Map()
    );
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);

    // Update online status in database
    const updateDatabaseStatus = useCallback(
        async (isOnline: boolean) => {
            if (!currentUserId) return;

            await supabase
                .from("profiles")
                .update({
                    is_online: isOnline,
                    last_active_at: new Date().toISOString(),
                })
                .eq("id", currentUserId);
        },
        [currentUserId]
    );

    // Set user status
    const setStatus = useCallback(
        (status: "online" | "away") => {
            if (!channelRef.current || !currentUserId) return;

            channelRef.current.track({
                user_id: currentUserId,
                online_at: new Date().toISOString(),
                status,
            });
        },
        [currentUserId]
    );

    // Initialize presence channel
    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase.channel("presence:global", {
            config: {
                presence: {
                    key: currentUserId,
                },
            },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState<PresenceState>();
                const newOnlineUsers = new Map<string, PresenceState>();

                Object.entries(state).forEach(([key, presences]) => {
                    if (presences.length > 0) {
                        newOnlineUsers.set(key, presences[0] as unknown as PresenceState);
                    }
                });

                setOnlineUsers(newOnlineUsers);
            })
            .on("presence", { event: "join" }, ({ key, newPresences }) => {
                if (newPresences.length > 0) {
                    setOnlineUsers((prev) => {
                        const updated = new Map(prev);
                        updated.set(key, newPresences[0] as PresenceState);
                        return updated;
                    });
                }
            })
            .on("presence", { event: "leave" }, ({ key }) => {
                setOnlineUsers((prev) => {
                    const updated = new Map(prev);
                    updated.delete(key);
                    return updated;
                });
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    // Track own presence
                    await channel.track({
                        user_id: currentUserId,
                        online_at: new Date().toISOString(),
                        status: "online",
                    });

                    // Update database
                    await updateDatabaseStatus(true);
                }
            });

        channelRef.current = channel;

        // Handle app state changes (background/foreground)
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === "active"
            ) {
                // App came to foreground
                setStatus("online");
                await updateDatabaseStatus(true);
            } else if (nextAppState.match(/inactive|background/)) {
                // App went to background
                setStatus("away");
                await updateDatabaseStatus(false);
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener(
            "change",
            handleAppStateChange
        );

        // Cleanup
        return () => {
            subscription.remove();
            if (channelRef.current) {
                channelRef.current.untrack();
                supabase.removeChannel(channelRef.current);
            }
            updateDatabaseStatus(false);
        };
    }, [currentUserId, updateDatabaseStatus, setStatus]);

    const isOnline = useCallback(
        (userId: string): boolean => {
            const presence = onlineUsers.get(userId);
            return presence?.status === "online" || false;
        },
        [onlineUsers]
    );

    return { onlineUsers, isOnline, setStatus };
}
