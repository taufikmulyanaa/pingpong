// Push Notifications Utility
// Expo Push setup, token management, and notification handlers

import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import Constants from "expo-constants";

// Notification types
export type NotificationType =
    | "CHALLENGE_RECEIVED"
    | "CHALLENGE_ACCEPTED"
    | "CHALLENGE_DECLINED"
    | "MATCH_REMINDER"
    | "MATCH_RESULT"
    | "FRIEND_REQUEST"
    | "TOURNAMENT_REMINDER"
    | "BADGE_EARNED"
    | "LEVEL_UP"
    | "GENERAL";

// Conditionally import expo-notifications only on native platforms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: any = null;

if (Platform.OS !== 'web') {
    Notifications = require("expo-notifications");

    // Configure notification behavior (only on native)
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

/**
 * Register for push notifications and get token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Skip on web
    if (Platform.OS === 'web' || !Notifications) {
        return null;
    }

    let token: string | null = null;

    // Must be physical device
    if (!Device.isDevice) {
        console.warn("Push notifications only work on physical devices");
        return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.warn("Push notification permissions not granted");
        return null;
    }

    // Get Expo push token
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const pushToken = await Notifications.getExpoPushTokenAsync({
            projectId,
        });
        token = pushToken.data;
    } catch (error) {
        console.error("Error getting push token:", error);
        return null;
    }

    // Android-specific channel setup
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#F7B32B",
        });

        await Notifications.setNotificationChannelAsync("matches", {
            name: "Matches",
            description: "Match updates and reminders",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
        });

        await Notifications.setNotificationChannelAsync("social", {
            name: "Social",
            description: "Friend requests and challenges",
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }

    return token;
}

/**
 * Save push token to user profile
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any)
        .update({ push_token: token })
        .eq("id", userId);

    if (error) {
        console.error("Error saving push token:", error);
    }
}

/**
 * Remove push token on logout
 */
export async function removePushToken(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any)
        .update({ push_token: null })
        .eq("id", userId);

    if (error) {
        console.error("Error removing push token:", error);
    }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trigger: any,
    data?: Record<string, unknown>
): Promise<string | null> {
    // Skip on web
    if (Platform.OS === 'web' || !Notifications) {
        return null;
    }

    return await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            sound: true,
        },
        trigger,
    });
}

/**
 * Schedule match reminder (30 minutes before)
 */
export async function scheduleMatchReminder(
    matchId: string,
    opponentName: string,
    scheduledTime: Date
): Promise<string | null> {
    // Skip on web
    if (Platform.OS === 'web' || !Notifications) {
        return null;
    }

    const reminderTime = new Date(scheduledTime.getTime() - 30 * 60 * 1000);

    if (reminderTime <= new Date()) {
        return null; // Too late to schedule
    }

    // Use seconds from now for the trigger
    const secondsFromNow = Math.floor((reminderTime.getTime() - Date.now()) / 1000);

    return await Notifications.scheduleNotificationAsync({
        content: {
            title: "Match Reminder 🏓",
            body: `Match melawan ${opponentName} dalam 30 menit!`,
            data: { type: "MATCH_REMINDER", matchId },
            sound: true,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        trigger: { seconds: secondsFromNow, repeats: false } as any,
    });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
    // Skip on web
    if (Platform.OS === 'web' || !Notifications) {
        return;
    }
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    // Skip on web
    if (Platform.OS === 'web' || !Notifications) {
        return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get notification content based on type
 */
export function getNotificationContent(
    type: NotificationType,
    data?: Record<string, unknown>
): { title: string; body: string; emoji: string } {
    switch (type) {
        case "CHALLENGE_RECEIVED":
            return {
                title: "Tantangan Baru! ⚔️",
                body: `${data?.challengerName || "Seseorang"} menantang kamu bermain!`,
                emoji: "⚔️",
            };
        case "CHALLENGE_ACCEPTED":
            return {
                title: "Tantangan Diterima! ✅",
                body: `${data?.opponentName || "Lawan"} menerima tantanganmu!`,
                emoji: "✅",
            };
        case "CHALLENGE_DECLINED":
            return {
                title: "Tantangan Ditolak 😔",
                body: `${data?.opponentName || "Lawan"} menolak tantanganmu`,
                emoji: "😔",
            };
        case "MATCH_REMINDER":
            return {
                title: "Match Reminder 🏓",
                body: `Match melawan ${data?.opponentName || "lawan"} segera dimulai!`,
                emoji: "🏓",
            };
        case "MATCH_RESULT":
            const isWin = data?.isWin;
            return {
                title: isWin ? "Selamat! 🎉" : "Match Selesai",
                body: isWin
                    ? `Kamu menang! Rating +${data?.ratingChange || 0}`
                    : `Match selesai. Rating ${data?.ratingChange || 0}`,
                emoji: isWin ? "🎉" : "📊",
            };
        case "FRIEND_REQUEST":
            return {
                title: "Permintaan Pertemanan 👋",
                body: `${data?.senderName || "Seseorang"} ingin berteman denganmu`,
                emoji: "👋",
            };
        case "TOURNAMENT_REMINDER":
            return {
                title: "Tournament Reminder 🏆",
                body: `${data?.tournamentName || "Turnamen"} akan segera dimulai!`,
                emoji: "🏆",
            };
        case "BADGE_EARNED":
            return {
                title: "Badge Baru! 🏅",
                body: `Kamu mendapatkan badge: ${data?.badgeName || "Achievement"}`,
                emoji: "🏅",
            };
        case "LEVEL_UP":
            return {
                title: "Level Up! 🚀",
                body: `Selamat! Kamu naik ke Level ${data?.newLevel || "?"}!`,
                emoji: "🚀",
            };
        default:
            return {
                title: (data?.title as string) || "PingpongHub",
                body: (data?.body as string) || "Kamu punya notifikasi baru",
                emoji: "📬",
            };
    }
}

/**
 * Set badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
    // Skip on web
    if (Platform.OS === 'web' || !Notifications) {
        return;
    }
    await Notifications.setBadgeCountAsync(count);
}
