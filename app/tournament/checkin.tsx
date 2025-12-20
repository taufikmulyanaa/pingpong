import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface Participant {
    id: string;
    user_id: string;
    check_in_status: 'PENDING' | 'CHECKED_IN' | 'NO_SHOW';
    checked_in_at: string | null;
    profiles: {
        id: string;
        name: string;
        avatar_url: string | null;
        rating_mr: number;
    };
}

export default function CheckInScreen() {
    const router = useRouter();
    const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
    const { profile } = useAuthStore();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [tournamentName, setTournamentName] = useState("");
    const [myParticipant, setMyParticipant] = useState<Participant | null>(null);

    // Colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    useEffect(() => {
        loadData();
    }, [tournamentId]);

    const loadData = async () => {
        if (!tournamentId) return;

        setLoading(true);
        try {
            // Get tournament info
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("name, organizer_id")
                .eq("id", tournamentId)
                .single();

            if (tournament) {
                setTournamentName((tournament as any).name);
                setIsOrganizer((tournament as any).organizer_id === profile?.id);
            }

            // Fetch participants with check-in status
            const { data: participantsData, error } = await (supabase
                .from("tournament_participants") as any)
                .select(`
                    id,
                    user_id,
                    check_in_status,
                    checked_in_at,
                    profiles:user_id (id, name, avatar_url, rating_mr)
                `)
                .eq("tournament_id", tournamentId)
                .order("checked_in_at", { ascending: true, nullsFirst: false });

            if (participantsData) {
                setParticipants(participantsData);

                // Find current user's participant record
                const myRecord = participantsData.find(
                    (p: Participant) => p.user_id === profile?.id
                );
                setMyParticipant(myRecord || null);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // User checks themselves in
    const handleSelfCheckIn = async () => {
        if (!myParticipant) return;

        try {
            const { error } = await (supabase
                .from("tournament_participants") as any)
                .update({
                    check_in_status: 'CHECKED_IN',
                    checked_in_at: new Date().toISOString(),
                })
                .eq("id", myParticipant.id);

            if (error) throw error;

            Alert.alert("Berhasil", "Anda telah check-in!");
            loadData();
        } catch (error) {
            console.error("Check-in error:", error);
            Alert.alert("Error", "Gagal melakukan check-in");
        }
    };

    // Organizer checks in a participant
    const handleOrganizerCheckIn = async (participantId: string, status: 'CHECKED_IN' | 'NO_SHOW') => {
        try {
            const { error } = await (supabase
                .from("tournament_participants") as any)
                .update({
                    check_in_status: status,
                    checked_in_at: status === 'CHECKED_IN' ? new Date().toISOString() : null,
                })
                .eq("id", participantId);

            if (error) throw error;

            Alert.alert("Berhasil", "Status check-in berhasil diperbarui");
            loadData();
        } catch (error) {
            console.error("Update error:", error);
            Alert.alert("Error", "Gagal memperbarui status");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CHECKED_IN':
                return { text: 'Check-in ✓', bg: '#D1FAE5', color: '#059669' };
            case 'NO_SHOW':
                return { text: 'Tidak Hadir', bg: '#FEE2E2', color: '#DC2626' };
            default:
                return { text: 'Menunggu', bg: '#FEF3C7', color: '#D97706' };
        }
    };

    const checkedInCount = participants.filter(p => p.check_in_status === 'CHECKED_IN').length;
    const totalCount = participants.length;

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ color: mutedColor, marginTop: 12 }}>Memuat data check-in...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Check-in Peserta",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {/* Stats Card */}
                    <View style={[styles.statsCard, { backgroundColor: cardColor }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: Colors.primary }]}>{checkedInCount}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Check-in</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: textColor }]}>{totalCount}</Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Total Peserta</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: "#F59E0B" }]}>
                                {totalCount - checkedInCount}
                            </Text>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Menunggu</Text>
                        </View>
                    </View>

                    {/* Self Check-in Button (for participants) */}
                    {myParticipant && myParticipant.check_in_status === 'PENDING' && (
                        <TouchableOpacity
                            style={[styles.selfCheckInBtn, { backgroundColor: Colors.primary }]}
                            onPress={handleSelfCheckIn}
                        >
                            <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
                            <Text style={styles.selfCheckInText}>Check-in Sekarang</Text>
                        </TouchableOpacity>
                    )}

                    {myParticipant && myParticipant.check_in_status === 'CHECKED_IN' && (
                        <View style={[styles.checkedInCard, { backgroundColor: "#D1FAE5" }]}>
                            <MaterialIcons name="check-circle" size={24} color="#059669" />
                            <Text style={styles.checkedInText}>Anda sudah check-in!</Text>
                        </View>
                    )}

                    {/* QR Code Section (for organizer) */}
                    {isOrganizer && (
                        <View style={[styles.qrSection, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="qr-code-2" size={120} color={Colors.primary} />
                            <Text style={[styles.qrTitle, { color: textColor }]}>{tournamentName}</Text>
                            <Text style={[styles.qrSubtitle, { color: mutedColor }]}>
                                Peserta dapat scan QR code ini untuk check-in
                            </Text>
                        </View>
                    )}

                    {/* Participants List */}
                    <View style={styles.listSection}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            Daftar Peserta
                        </Text>

                        {participants.map((participant) => {
                            const badge = getStatusBadge(participant.check_in_status);

                            return (
                                <View
                                    key={participant.id}
                                    style={[styles.participantCard, { backgroundColor: cardColor }]}
                                >
                                    <Image
                                        source={{
                                            uri: participant.profiles.avatar_url ||
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.profiles.name)}&background=random`
                                        }}
                                        style={styles.avatar}
                                    />
                                    <View style={styles.participantInfo}>
                                        <Text style={[styles.participantName, { color: textColor }]}>
                                            {participant.profiles.name}
                                        </Text>
                                        <Text style={[styles.participantMr, { color: mutedColor }]}>
                                            MR {participant.profiles.rating_mr}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                        <Text style={[styles.statusText, { color: badge.color }]}>
                                            {badge.text}
                                        </Text>
                                    </View>

                                    {/* Organizer actions */}
                                    {isOrganizer && participant.check_in_status === 'PENDING' && (
                                        <View style={styles.organizerActions}>
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => handleOrganizerCheckIn(participant.id, 'CHECKED_IN')}
                                            >
                                                <MaterialIcons name="check" size={20} color="#059669" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => handleOrganizerCheckIn(participant.id, 'NO_SHOW')}
                                            >
                                                <MaterialIcons name="close" size={20} color="#DC2626" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {participants.length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="people-outline" size={48} color={mutedColor} />
                                <Text style={[styles.emptyText, { color: mutedColor }]}>
                                    Belum ada peserta terdaftar
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    statsCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statItem: { flex: 1, alignItems: "center" },
    statValue: { fontSize: 28, fontWeight: "bold" },
    statLabel: { fontSize: 12, marginTop: 4 },
    statDivider: { width: 1, height: 40, backgroundColor: "#E5E7EB" },
    selfCheckInBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    selfCheckInText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    checkedInCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    checkedInText: { color: "#059669", fontSize: 16, fontWeight: "600" },
    qrSection: {
        alignItems: "center",
        padding: 24,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    qrTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    qrSubtitle: { fontSize: 13, marginTop: 4, textAlign: "center" },
    listSection: { marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    participantCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    participantInfo: { flex: 1, marginLeft: 12 },
    participantName: { fontSize: 14, fontWeight: "500" },
    participantMr: { fontSize: 12, marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: { fontSize: 12, fontWeight: "600" },
    organizerActions: { flexDirection: "row", gap: 8, marginLeft: 8 },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: { alignItems: "center", padding: 40 },
    emptyText: { marginTop: 12, fontSize: 14 },
});
