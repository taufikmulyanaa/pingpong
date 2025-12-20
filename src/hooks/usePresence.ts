// Presence Hook
// Track online/offline status using Supabase Presence
// Also updates user location when online

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as Location from "expo-location";

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
    const locationUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Update user location in database
    const updateUserLocation = useCallback(async () => {
        if (!currentUserId) return;

        try {
            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // Update profile with location
            const { error } = await (supabase
                .from("profiles") as any)
                .update({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                })
                .eq("id", currentUserId);

            if (error) {
                console.error("Error updating location:", error);
            } else {
                console.log("Location updated:", location.coords.latitude, location.coords.longitude);
            }
        } catch (error) {
            console.error("Error getting location:", error);
        }
    }, [currentUserId]);

    // Update online status in database
    const updateDatabaseStatus = useCallback(
        async (isOnline: boolean) => {
            if (!currentUserId) return;

            await (supabase
                .from("profiles") as any)
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
                        updated.set(key, newPresences[0] as unknown as PresenceState);
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

                    // Update location when coming online (native only)
                    if (Platform.OS !== 'web') {
                        await updateUserLocation();

                        // Set up periodic location updates every 2 minutes
                        // Balance between accuracy and battery consumption
                        locationUpdateIntervalRef.current = setInterval(() => {
                            updateUserLocation();
                        }, 2 * 60 * 1000); // 2 minutes
                    }
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

                // Update location when coming back to foreground
                if (Platform.OS !== 'web') {
                    await updateUserLocation();
                }
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

            // Clear location update interval
            if (locationUpdateIntervalRef.current) {
                clearInterval(locationUpdateIntervalRef.current);
                locationUpdateIntervalRef.current = null;
            }

            if (channelRef.current) {
                channelRef.current.untrack();
                supabase.removeChannel(channelRef.current);
            }
            updateDatabaseStatus(false);
        };
    }, [currentUserId, updateDatabaseStatus, setStatus, updateUserLocation]);

    const isOnline = useCallback(
        (userId: string): boolean => {
            const presence = onlineUsers.get(userId);
            return presence?.status === "online" || false;
        },
        [onlineUsers]
    );

    return { onlineUsers, isOnline, setStatus };
}

