import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Modal,
    ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../lib/constants";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface TournamentNotification {
    id: string;
    tournament_id: string;
    type: string;
    title: string;
    message: string;
    match_id: string | null;
    is_read: boolean;
    created_at: string;
}

interface Props {
    tournamentId: string;
    visible: boolean;
    onClose: () => void;
}

export default function TournamentNotifications({ tournamentId, visible, onClose }: Props) {
    const { user, profile } = useAuthStore();
    const [notifications, setNotifications] = useState<TournamentNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && profile?.id) {
            fetchNotifications();
            setupRealtime();
        }
    }, [visible, profile?.id]);

    const fetchNotifications = async () => {
        if (!profile?.id) return;

        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from("tournament_notifications") as any)
                .select("*")
                .eq("user_id", profile.id)
                .eq("tournament_id", tournamentId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (data) {
                setNotifications(data);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const setupRealtime = () => {
        if (!profile?.id) return;

        const channel = supabase
            .channel(`notifications_${tournamentId}_${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tournament_notifications',
                    filter: `user_id=eq.${profile.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as TournamentNotification;
                    if (newNotif.tournament_id === tournamentId) {
                        setNotifications(prev => [newNotif, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const markAsRead = async (notifId: string) => {
        try {
            await (supabase
                .from("tournament_notifications") as any)
                .update({ is_read: true })
                .eq("id", notifId);

            setNotifications(prev =>
                prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const markAllAsRead = async () => {
        if (!profile?.id) return;

        try {
            await (supabase
                .from("tournament_notifications") as any)
                .update({ is_read: true })
                .eq("user_id", profile.id)
                .eq("tournament_id", tournamentId)
                .eq("is_read", false);

            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'MATCH_UPCOMING':
                return { icon: 'schedule', color: '#3B82F6' };
            case 'MATCH_STARTED':
                return { icon: 'play-circle-filled', color: '#10B981' };
            case 'MATCH_COMPLETED':
                return { icon: 'check-circle', color: '#10B981' };
            case 'SCHEDULE_CHANGED':
                return { icon: 'update', color: '#F59E0B' };
            case 'BRACKET_GENERATED':
                return { icon: 'account-tree', color: '#8B5CF6' };
            case 'TOURNAMENT_STARTED':
                return { icon: 'emoji-events', color: '#F59E0B' };
            case 'TOURNAMENT_COMPLETED':
                return { icon: 'celebration', color: '#10B981' };
            case 'CHECK_IN_REMINDER':
                return { icon: 'qr-code-scanner', color: '#EF4444' };
            default:
                return { icon: 'notifications', color: Colors.primary };
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), {
                addSuffix: true,
                locale: idLocale,
            });
        } catch {
            return '';
        }
    };

    const renderNotification = ({ item }: { item: TournamentNotification }) => {
        const iconData = getNotificationIcon(item.type);

        return (
            <TouchableOpacity
                style={[
                    styles.notifItem,
                    !item.is_read && styles.notifUnread,
                ]}
                onPress={() => markAsRead(item.id)}
            >
                <View style={[styles.notifIcon, { backgroundColor: iconData.color + '20' }]}>
                    <MaterialIcons name={iconData.icon as any} size={22} color={iconData.color} />
                </View>
                <View style={styles.notifContent}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    {item.message && (
                        <Text style={styles.notifMessage} numberOfLines={2}>
                            {item.message}
                        </Text>
                    )}
                    <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Notifikasi</Text>
                        <View style={styles.headerActions}>
                            {unreadCount > 0 && (
                                <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
                                    <Text style={styles.markAllText}>Tandai Semua Dibaca</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose}>
                                <MaterialIcons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Content */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : notifications.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="notifications-off" size={48} color={Colors.muted} />
                            <Text style={styles.emptyText}>Belum ada notifikasi</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id}
                            renderItem={renderNotification}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

// Badge component for showing unread count
export function NotificationBadge({
    tournamentId,
    onPress,
}: {
    tournamentId: string;
    onPress: () => void;
}) {
    const { profile } = useAuthStore();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!profile?.id) return;

        // Fetch unread count
        const fetchCount = async () => {
            const { count } = await (supabase
                .from("tournament_notifications") as any)
                .select("*", { count: "exact", head: true })
                .eq("user_id", profile.id)
                .eq("tournament_id", tournamentId)
                .eq("is_read", false);

            setUnreadCount(count || 0);
        };

        fetchCount();

        // Subscribe to changes
        const channel = supabase
            .channel(`notif_badge_${tournamentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tournament_notifications',
                    filter: `user_id=eq.${profile.id}`,
                },
                () => fetchCount()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, tournamentId]);

    return (
        <TouchableOpacity style={styles.badgeContainer} onPress={onPress}>
            <MaterialIcons name="notifications" size={24} color={Colors.text} />
            {unreadCount > 0 && (
                <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "80%",
        minHeight: "50%",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    markAllBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#E0F2FE",
        borderRadius: 6,
    },
    markAllText: { fontSize: 12, color: "#0284C7", fontWeight: "500" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    emptyText: { marginTop: 12, fontSize: 14, color: Colors.muted },
    listContent: { padding: 16 },
    notifItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 12,
        borderRadius: 12,
        backgroundColor: Colors.card,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    notifUnread: {
        backgroundColor: "#F0F9FF",
        borderColor: "#BFDBFE",
    },
    notifIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    notifContent: { flex: 1 },
    notifTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 2 },
    notifMessage: { fontSize: 13, color: Colors.muted, marginBottom: 4 },
    notifTime: { fontSize: 11, color: Colors.muted },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        marginLeft: 8,
    },
    badgeContainer: { position: "relative" },
    badgeCount: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "#EF4444",
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    badgeCountText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});
