// usePushNotifications Hook
// Handle push notification registration and listeners

import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuthStore } from "../stores/authStore";
import {
    registerForPushNotificationsAsync,
    savePushToken,
    removePushToken,
    setBadgeCount,
    NotificationType,
} from "../lib/notifications";

interface NotificationData {
    type: NotificationType;
    matchId?: string;
    tournamentId?: string;
    [key: string]: any;
}

export function usePushNotifications() {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);

    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    // Register for push notifications
    useEffect(() => {
        // Skip on web
        if (Platform.OS === "web") return;
        if (!user) return;

        const registerPush = async () => {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                console.log("[Push Token]", token);
                setExpoPushToken(token);
                await savePushToken(user.id, token);
            }
        };

        registerPush();
    }, [user]);

    // Setup notification listeners
    useEffect(() => {
        // Skip on web
        if (Platform.OS === "web") return;

        // Foreground notification received
        notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
            setNotification(notif);
        });

        // User interacted with notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as NotificationData;
            handleNotificationTap(data);
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    // Handle notification tap and navigation
    const handleNotificationTap = useCallback(
        (data: NotificationData) => {
            switch (data.type) {
                case "CHALLENGE_RECEIVED":
                case "CHALLENGE_ACCEPTED":
                case "CHALLENGE_DECLINED":
                    router.push("/notifikasi" as any);
                    break;
                case "MATCH_REMINDER":
                case "MATCH_RESULT":
                    router.push("/app" as any);
                    break;
                case "FRIEND_REQUEST":
                    router.push("/cari" as any);
                    break;
                case "TOURNAMENT_REMINDER":
                    router.push("/app" as any);
                    break;
                case "BADGE_EARNED":
                    router.push("/badges");
                    break;
                case "LEVEL_UP":
                    router.push("/profil");
                    break;
                default:
                    router.push("/notifikasi" as any);
            }
        },
        [router]
    );

    // Clear push token on logout
    const clearPushToken = useCallback(async () => {
        if (user) {
            await removePushToken(user.id);
            setExpoPushToken(null);
        }
    }, [user]);

    // Update badge count
    const updateBadgeCount = useCallback(async (count: number) => {
        await setBadgeCount(count);
    }, []);

    return {
        expoPushToken,
        notification,
        clearPushToken,
        updateBadgeCount,
    };
}

// Re-export for convenience
export { NotificationType };
