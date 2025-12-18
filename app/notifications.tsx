import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../src/lib/constants";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/authStore";

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    data: any;
    is_read: boolean;
    created_at: string;
}

// Mock notifications for demo
const mockNotifications: Notification[] = [
    {
        id: "1",
        type: "CHALLENGE",
        title: "Tantangan Baru!",
        body: "Budi Santoso mengajak kamu bermain Ranked Match",
        data: { challengeId: "123" },
        is_read: false,
        created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
        id: "2",
        type: "MATCH_RESULT",
        title: "Pertandingan Selesai",
        body: "Kamu menang melawan Alex Wijaya! +25 MR",
        data: { matchId: "456" },
        is_read: false,
        created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    },
    {
        id: "3",
        type: "BADGE",
        title: "Lencana Baru! 🎉",
        body: "Kamu mendapatkan lencana 'Hot Streak' - Menang 5 berturut-turut!",
        data: { badgeCode: "streak_5" },
        is_read: true,
        created_at: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    },
    {
        id: "4",
        type: "TOURNAMENT",
        title: "Turnamen Dimulai",
        body: "Turnamen Bulungan Open dimulai besok. Siap tempur!",
        data: { tournamentId: "789" },
        is_read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
    },
    {
        id: "5",
        type: "BOOKING",
        title: "Booking Dikonfirmasi",
        body: "Booking meja di GOR Bulungan untuk 15 Des 2024 jam 14:00 dikonfirmasi.",
        data: { bookingId: "abc" },
        is_read: true,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
    },
];

export default function NotificationsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();

    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [refreshing, setRefreshing] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const fetchNotifications = async () => {
        if (!profile?.id) return;

        const { data } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(50);

        if (data && data.length > 0) {
            setNotifications(data);
        }
        setRefreshing(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, [profile?.id]);

    const markAsRead = async (notifId: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
        );

        const query = supabase.from("notifications");
        // @ts-ignore
        await query.update({ is_read: true }).eq("id", notifId);
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        if (profile?.id) {
            const query = supabase.from("notifications");
            // @ts-ignore
            await query.update({ is_read: true }).eq("user_id", profile.id);
        }
    };

    const handleNotificationPress = (notif: Notification) => {
        markAsRead(notif.id);

        switch (notif.type) {
            case "CHALLENGE":
                router.push({ pathname: "/challenge/[id]", params: { id: notif.data?.challengeId } } as any);
                break;
            case "MATCH_RESULT":
                router.push({ pathname: "/match/[id]", params: { id: notif.data?.matchId } });
                break;
            case "TOURNAMENT":
                router.push({ pathname: "/tournament/[id]", params: { id: notif.data?.tournamentId } });
                break;
            case "BADGE":
                router.push("/badges");
                break;
            default:
                break;
        }
    };

    const getNotificationIcon = (type: string): keyof typeof MaterialIcons.glyphMap => {
        switch (type) {
            case "CHALLENGE": return "sports-tennis";
            case "MATCH_RESULT": return "emoji-events";
            case "BADGE": return "workspace-premium";
            case "TOURNAMENT": return "military-tech";
            case "BOOKING": return "event-available";
            case "CHAT": return "chat";
            default: return "notifications";
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case "CHALLENGE": return Colors.primary;
            case "MATCH_RESULT": return "#10B981";
            case "BADGE": return "#F59E0B";
            case "TOURNAMENT": return "#8B5CF6";
            case "BOOKING": return "#3B82F6";
            default: return mutedColor;
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Baru saja";
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} jam lalu`;
        return `${Math.floor(diffMins / 1440)} hari lalu`;
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Notifikasi",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                    headerRight: () => unreadCount > 0 ? (
                        <TouchableOpacity onPress={markAllAsRead} style={{ marginRight: 16 }}>
                            <Text style={{ color: Colors.primary, fontWeight: "600" }}>Tandai Semua</Text>
                        </TouchableOpacity>
                    ) : null,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />
                    }
                >
                    {notifications.map((notif) => (
                        <TouchableOpacity
                            key={notif.id}
                            style={[
                                styles.notifCard,
                                { backgroundColor: notif.is_read ? cardColor : `${Colors.primary}10` }
                            ]}
                            onPress={() => handleNotificationPress(notif)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: `${getNotificationColor(notif.type)}20` }]}>
                                <MaterialIcons
                                    name={getNotificationIcon(notif.type)}
                                    size={22}
                                    color={getNotificationColor(notif.type)}
                                />
                            </View>
                            <View style={styles.notifContent}>
                                <View style={styles.notifHeader}>
                                    <Text style={[styles.notifTitle, { color: textColor }]} numberOfLines={1}>
                                        {notif.title}
                                    </Text>
                                    {!notif.is_read && <View style={styles.unreadDot} />}
                                </View>
                                <Text style={[styles.notifMessage, { color: mutedColor }]} numberOfLines={2}>
                                    {notif.body}
                                </Text>
                                <Text style={[styles.notifTime, { color: mutedColor }]}>
                                    {formatTime(notif.created_at)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {notifications.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="notifications-none" size={48} color={mutedColor} />
                            <Text style={[styles.emptyText, { color: mutedColor }]}>
                                Belum ada notifikasi
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    notifCard: {
        flexDirection: "row",
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    notifContent: {
        flex: 1,
    },
    notifHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    notifTitle: {
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    notifMessage: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    notifTime: {
        fontSize: 11,
        marginTop: 6,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12,
    },
});
