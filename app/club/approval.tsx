import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface PendingRequest {
    id: string;
    club_id: string;
    club_name: string;
    club_logo: string | null;
    user: {
        id: string;
        name: string;
        avatar_url: string | null;
        rating_mr: number;
        level: number;
        city: string | null;
    };
    created_at: string;
}

export default function MemberApprovalScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();

    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const fetchPendingRequests = async () => {
        if (!profile?.id) return;

        try {
            // Get owned clubs
            const { data: ownedClubs } = await (supabase
                .from('clubs') as any)
                .select('id, name, logo_url')
                .eq('owner_id', profile.id);

            if (!ownedClubs || ownedClubs.length === 0) {
                setRequests([]);
                return;
            }

            const clubIds = (ownedClubs as any[]).map(c => c.id);
            const clubMap = new Map<string, { name: string; logo: string | null }>((ownedClubs as any[]).map(c => [c.id, { name: c.name, logo: c.logo_url }]));

            // Get pending requests
            const { data, error } = await (supabase
                .from('club_members') as any)
                .select(`
                    id,
                    club_id,
                    created_at,
                    user:profiles!user_id(
                        id,
                        name,
                        avatar_url,
                        rating_mr,
                        level,
                        city
                    )
                `)
                .in('club_id', clubIds)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedRequests: PendingRequest[] = (data || []).map((item: any) => ({
                id: item.id,
                club_id: item.club_id,
                club_name: clubMap.get(item.club_id)?.name || 'Unknown',
                club_logo: clubMap.get(item.club_id)?.logo || null,
                user: item.user,
                created_at: item.created_at,
            }));

            setRequests(formattedRequests);
        } catch (error) {
            console.error("Error fetching pending requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, [profile?.id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPendingRequests();
        setRefreshing(false);
    };

    const handleApprove = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            const { error } = await (supabase
                .from('club_members') as any)
                .update({ status: 'APPROVED' })
                .eq('id', requestId);

            if (error) throw error;

            // Remove from local state
            setRequests(prev => prev.filter(r => r.id !== requestId));
            Alert.alert("Sukses", "Anggota berhasil disetujui");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Gagal menyetujui anggota");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId: string) => {
        Alert.alert(
            "Tolak Permintaan",
            "Apakah Anda yakin ingin menolak permintaan ini?",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Tolak",
                    style: "destructive",
                    onPress: async () => {
                        setProcessingId(requestId);
                        try {
                            const { error } = await (supabase
                                .from('club_members') as any)
                                .update({ status: 'REJECTED' })
                                .eq('id', requestId);

                            if (error) throw error;

                            setRequests(prev => prev.filter(r => r.id !== requestId));
                            Alert.alert("Sukses", "Permintaan ditolak");
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Gagal menolak permintaan");
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.primary }]} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Permintaan Bergabung</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={[styles.content, { backgroundColor: bgColor }]}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : requests.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="check-circle" size={64} color={Colors.muted} />
                            <Text style={[styles.emptyText, { color: mutedColor }]}>
                                Tidak ada permintaan bergabung
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.requestList}>
                            {requests.map((request) => (
                                <View
                                    key={request.id}
                                    style={[styles.requestCard, { backgroundColor: cardColor }]}
                                >
                                    {/* Club Badge */}
                                    <View style={styles.clubBadge}>
                                        {request.club_logo ? (
                                            <Image source={{ uri: request.club_logo }} style={styles.clubLogo} />
                                        ) : (
                                            <View style={[styles.clubLogo, { backgroundColor: Colors.primary }]}>
                                                <MaterialIcons name="groups" size={12} color="#fff" />
                                            </View>
                                        )}
                                        <Text style={[styles.clubName, { color: mutedColor }]} numberOfLines={1}>
                                            {request.club_name}
                                        </Text>
                                    </View>

                                    {/* User Info */}
                                    <View style={styles.userRow}>
                                        {request.user.avatar_url ? (
                                            <Image source={{ uri: request.user.avatar_url }} style={styles.avatar} />
                                        ) : (
                                            <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
                                                <Text style={styles.avatarText}>
                                                    {request.user.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.userInfo}>
                                            <Text style={[styles.userName, { color: textColor }]}>
                                                {request.user.name}
                                            </Text>
                                            <View style={styles.userStats}>
                                                <Text style={[styles.userMr, { color: Colors.primary }]}>
                                                    MR {request.user.rating_mr}
                                                </Text>
                                                <Text style={[styles.userLevel, { color: mutedColor }]}>
                                                    • Lvl {request.user.level}
                                                </Text>
                                                {request.user.city && (
                                                    <Text style={[styles.userCity, { color: mutedColor }]}>
                                                        • {request.user.city}
                                                    </Text>
                                                )}
                                            </View>
                                            <Text style={[styles.requestDate, { color: mutedColor }]}>
                                                Mengajukan: {formatDate(request.created_at)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.rejectBtn, { borderColor: "#EF4444" }]}
                                            onPress={() => handleReject(request.id)}
                                            disabled={processingId === request.id}
                                        >
                                            {processingId === request.id ? (
                                                <ActivityIndicator size="small" color="#EF4444" />
                                            ) : (
                                                <>
                                                    <MaterialIcons name="close" size={18} color="#EF4444" />
                                                    <Text style={[styles.rejectBtnText, { color: "#EF4444" }]}>Tolak</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.approveBtn, { backgroundColor: Colors.primary }]}
                                            onPress={() => handleApprove(request.id)}
                                            disabled={processingId === request.id}
                                        >
                                            {processingId === request.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <MaterialIcons name="check" size={18} color="#fff" />
                                                    <Text style={styles.approveBtnText}>Terima</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    headerBtn: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    content: {
        flex: 1,
        marginTop: -20,
        paddingTop: 30,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        textAlign: "center",
    },
    requestList: {
        padding: 20,
        gap: 16,
    },
    requestCard: {
        borderRadius: 16,
        padding: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    clubBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    clubLogo: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    clubName: {
        fontSize: 12,
        fontWeight: "500",
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: "600",
    },
    userStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },
    userMr: {
        fontSize: 13,
        fontWeight: "600",
    },
    userLevel: {
        fontSize: 12,
    },
    userCity: {
        fontSize: 12,
    },
    requestDate: {
        fontSize: 11,
        marginTop: 4,
    },
    actionRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 4,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    rejectBtnText: {
        fontSize: 14,
        fontWeight: "600",
    },
    approveBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    approveBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
});
