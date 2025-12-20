/**
 * Push Notification Service
 * Handles tournament notifications: match reminders, results, schedule changes
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface NotificationPayload {
    title: string;
    body: string;
    data?: Record<string, any>;
}

/**
 * Register device for push notifications
 * Returns the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
    }

    // Get Expo push token
    try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        console.log('Push token:', token);
        return token;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }
}

/**
 * Save push token to user profile
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
    try {
        await (supabase.from('profiles') as any).update({ push_token: token }).eq('id', userId);
    } catch (error) {
        console.error('Error saving push token:', error);
    }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
    payload: NotificationPayload,
    trigger: Notifications.NotificationTriggerInput
): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
            sound: true,
        },
        trigger,
    });
    return id;
}

/**
 * Send immediate local notification
 */
export async function sendLocalNotification(payload: NotificationPayload): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
            sound: true,
        },
        trigger: null, // Immediate
    });
    return id;
}

/**
 * Schedule match reminder notification
 * Reminds user 15 minutes before their match
 */
export async function scheduleMatchReminder(
    matchId: string,
    matchTime: Date,
    opponentName: string,
    tableNumber?: number
): Promise<string | null> {
    const reminderTime = new Date(matchTime.getTime() - 15 * 60 * 1000); // 15 min before

    if (reminderTime <= new Date()) {
        console.log('Match time is too soon for reminder');
        return null;
    }

    const body = tableNumber
        ? `Pertandingan vs ${opponentName} dimulai 15 menit lagi di Meja ${tableNumber}`
        : `Pertandingan vs ${opponentName} dimulai 15 menit lagi`;

    return scheduleLocalNotification(
        {
            title: '🏓 Match Reminder',
            body,
            data: { type: 'match_reminder', matchId },
        },
        { type: 'date', date: reminderTime } as any
    );
}

/**
 * Send match result notification
 */
export async function sendMatchResultNotification(
    matchId: string,
    opponentName: string,
    yourScore: number,
    opponentScore: number,
    isWin: boolean
): Promise<string> {
    const emoji = isWin ? '🏆' : '😔';
    const resultText = isWin ? 'Anda menang!' : 'Anda kalah';

    return sendLocalNotification({
        title: `${emoji} Hasil Pertandingan`,
        body: `${resultText} vs ${opponentName} (${yourScore}-${opponentScore})`,
        data: { type: 'match_result', matchId },
    });
}

/**
 * Send tournament update notification
 */
export async function sendTournamentUpdateNotification(
    tournamentId: string,
    tournamentName: string,
    message: string
): Promise<string> {
    return sendLocalNotification({
        title: `📢 ${tournamentName}`,
        body: message,
        data: { type: 'tournament_update', tournamentId },
    });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel specific notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Set up notification response handler
 * Call this in your app root to handle notification taps
 */
export function setupNotificationResponseHandler(
    onNotificationTap: (data: Record<string, any>) => void
): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        onNotificationTap(data);
    });
}

/**
 * Set up notification received handler
 * Call this to handle foreground notifications
 */
export function setupNotificationReceivedHandler(
    onNotificationReceived: (notification: Notifications.Notification) => void
): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(onNotificationReceived);
}
