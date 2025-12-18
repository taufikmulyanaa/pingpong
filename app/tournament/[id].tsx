import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";

interface Tournament {
    id: string;
    name: string;
    description: string;
    rules?: string;
    start_date: string;
    end_date: string;
    max_participants: number;
    current_participants: number;
    entry_fee: number;
    prize_pool: number;
    format: string;
    status: string;
    venue_name: string;
    city: string;
    categories: string[];
    organizer: string;
    banner_url?: string;
}

interface Participant {
    id: string;
    name: string;
    avatar_url?: string;
    rating_mr: number;
    seed?: number;
}

// Mock data removed

export default function TournamentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [activeTab, setActiveTab] = useState<"info" | "participants" | "schedule">("info");
    const [isRegistered, setIsRegistered] = useState(false);

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    useEffect(() => {
        // In real app, fetch from Supabase based on id
        setTournament(null);
    }, [id]);

    if (!tournament) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <MaterialIcons name="error-outline" size={48} color={mutedColor} />
                    <Text style={{ color: textColor, marginTop: 12 }}>Turnamen tidak ditemukan</Text>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <Text style={{ color: Colors.primary }}>Kembali</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const getStatusBadge = () => {
        switch (tournament.status) {
            case "REGISTRATION":
                return { label: "Pendaftaran", color: Colors.primary, bg: "#DBEAFE" };
            case "ONGOING":
                return { label: "Berlangsung", color: "#10B981", bg: "#D1FAE5" };
            case "COMPLETED":
                return { label: "Selesai", color: mutedColor, bg: "#F3F4F6" };
            default:
                return { label: tournament.status, color: mutedColor, bg: "#F3F4F6" };
        }
    };

    const statusBadge = getStatusBadge();

    const handleRegister = () => {
        setIsRegistered(true);
        alert("Berhasil mendaftar ke turnamen!");
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "",
                    headerTransparent: true,
                    headerTintColor: "#fff",
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Banner */}
                    <View style={styles.bannerContainer}>
                        <Image
                            source={{ uri: tournament.banner_url || `https://placehold.co/600x200/${Colors.secondary.replace("#", "")}/${Colors.accent.replace("#", "")}?text=${encodeURIComponent(tournament.name)}` }}
                            style={styles.banner}
                        />
                        <View style={styles.bannerOverlay} />
                        <View style={styles.bannerContent}>
                            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                                <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                            </View>
                            <Text style={styles.tournamentName}>{tournament.name}</Text>
                            <Text style={styles.tournamentOrganizer}>by {tournament.organizer}</Text>
                        </View>
                    </View>

                    {/* Quick Info */}
                    <View style={[styles.quickInfo, { backgroundColor: cardColor }]}>
                        <View style={styles.quickInfoItem}>
                            <MaterialIcons name="calendar-today" size={18} color={Colors.primary} />
                            <Text style={[styles.quickInfoText, { color: textColor }]}>
                                {formatDate(tournament.start_date)}
                            </Text>
                        </View>
                        <View style={styles.quickInfoItem}>
                            <MaterialIcons name="place" size={18} color={Colors.primary} />
                            <Text style={[styles.quickInfoText, { color: textColor }]}>
                                {tournament.venue_name}
                            </Text>
                        </View>
                        <View style={styles.quickInfoItem}>
                            <MaterialIcons name="people" size={18} color={Colors.primary} />
                            <Text style={[styles.quickInfoText, { color: textColor }]}>
                                {tournament.current_participants}/{tournament.max_participants} Peserta
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        {tournament.status === "REGISTRATION" && !isRegistered && (
                            <TouchableOpacity
                                style={[styles.registerBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleRegister}
                            >
                                <MaterialIcons name="how-to-reg" size={20} color="#fff" />
                                <Text style={styles.registerBtnText}>
                                    Daftar - {formatCurrency(tournament.entry_fee)}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {isRegistered && (
                            <View style={[styles.registeredBadge, { backgroundColor: "#D1FAE5" }]}>
                                <MaterialIcons name="check-circle" size={20} color="#10B981" />
                                <Text style={[styles.registeredText, { color: "#10B981" }]}>Terdaftar</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.bracketBtn, { backgroundColor: Colors.accent }]}
                            onPress={() => router.push({ pathname: "/tournament/bracket", params: { tournamentId: tournament.id } })}
                        >
                            <MaterialIcons name="account-tree" size={20} color={Colors.secondary} />
                            <Text style={[styles.bracketBtnText, { color: Colors.secondary }]}>Lihat Bracket</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
                        {[
                            { key: "info", label: "Info" },
                            { key: "participants", label: "Peserta" },
                            { key: "schedule", label: "Jadwal" },
                        ].map((tab) => (
                            <TouchableOpacity
                                key={tab.key}
                                style={[
                                    styles.tab,
                                    activeTab === tab.key && [styles.tabActive, { borderBottomColor: Colors.primary }]
                                ]}
                                onPress={() => setActiveTab(tab.key as any)}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: activeTab === tab.key ? Colors.primary : mutedColor }
                                ]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Tab Content */}
                    <View style={styles.tabContent}>
                        {activeTab === "info" && (
                            <View>
                                {/* Description */}
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Tentang Turnamen</Text>
                                    <Text style={[styles.description, { color: textColor }]}>
                                        {tournament.description}
                                    </Text>
                                </View>

                                {/* Details */}
                                <View style={[styles.detailsCard, { backgroundColor: cardColor, borderColor }]}>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Format</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>{tournament.format}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Kategori</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>{tournament.categories.join(", ")}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Hadiah</Text>
                                        <Text style={[styles.detailValue, { color: Colors.primary }]}>{formatCurrency(tournament.prize_pool)}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Lokasi</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>{tournament.venue_name}, {tournament.city}</Text>
                                    </View>
                                </View>

                                {/* Rules */}
                                {tournament.rules && (
                                    <View style={styles.section}>
                                        <Text style={[styles.sectionTitle, { color: textColor }]}>Peraturan</Text>
                                        <View style={[styles.rulesCard, { backgroundColor: cardColor, borderColor }]}>
                                            <Text style={[styles.rulesText, { color: textColor }]}>
                                                {tournament.rules}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === "participants" && (
                            <View>
                                <Text style={[styles.participantCount, { color: mutedColor }]}>
                                    {tournament.current_participants} dari {tournament.max_participants} slot terisi
                                </Text>
                                {[].map((p: any, index) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.participantCard, { backgroundColor: cardColor, borderColor }]}
                                        onPress={() => router.push({ pathname: "/player/[id]", params: { id: p.id } })}
                                    >
                                        <View style={[styles.seedBadge, { backgroundColor: index < 4 ? Colors.accent : Colors.blueLight }]}>
                                            <Text style={[styles.seedText, { color: index < 4 ? Colors.secondary : "#fff" }]}>{p.seed}</Text>
                                        </View>
                                        <Image
                                            source={{ uri: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=4169E1&color=fff` }}
                                            style={styles.participantAvatar}
                                        />
                                        <View style={styles.participantInfo}>
                                            <Text style={[styles.participantName, { color: textColor }]}>{p.name}</Text>
                                            <Text style={[styles.participantMr, { color: mutedColor }]}>MR {p.rating_mr}</Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={20} color={mutedColor} />
                                    </TouchableOpacity>
                                ))}
                                {/* Empty state for participants */}
                                <View style={{ padding: 20, alignItems: "center" }}>
                                    <Text style={{ color: mutedColor }}>Belum ada peserta</Text>
                                </View>
                            </View>
                        )}

                        {activeTab === "schedule" && (
                            <View>
                                <View style={[styles.scheduleCard, { backgroundColor: cardColor, borderColor }]}>
                                    <View style={styles.scheduleHeader}>
                                        <Text style={[styles.scheduleDate, { color: textColor }]}>{formatDate(tournament.start_date)}</Text>
                                        <View style={[styles.scheduleBadge, { backgroundColor: Colors.primary }]}>
                                            <Text style={styles.scheduleBadgeText}>Hari 1</Text>
                                        </View>
                                    </View>
                                    <View style={styles.scheduleItems}>
                                        <View style={styles.scheduleItem}>
                                            <Text style={[styles.scheduleTime, { color: Colors.primary }]}>08:00</Text>
                                            <Text style={[styles.scheduleEvent, { color: textColor }]}>Registrasi & Check-in</Text>
                                        </View>
                                        <View style={styles.scheduleItem}>
                                            <Text style={[styles.scheduleTime, { color: Colors.primary }]}>09:00</Text>
                                            <Text style={[styles.scheduleEvent, { color: textColor }]}>Babak Penyisihan Round 1</Text>
                                        </View>
                                        <View style={styles.scheduleItem}>
                                            <Text style={[styles.scheduleTime, { color: Colors.primary }]}>12:00</Text>
                                            <Text style={[styles.scheduleEvent, { color: textColor }]}>Istirahat</Text>
                                        </View>
                                        <View style={styles.scheduleItem}>
                                            <Text style={[styles.scheduleTime, { color: Colors.primary }]}>13:00</Text>
                                            <Text style={[styles.scheduleEvent, { color: textColor }]}>Quarter Final</Text>
                                        </View>
                                        <View style={styles.scheduleItem}>
                                            <Text style={[styles.scheduleTime, { color: Colors.primary }]}>15:00</Text>
                                            <Text style={[styles.scheduleEvent, { color: textColor }]}>Semi Final</Text>
                                        </View>
                                        <View style={styles.scheduleItem}>
                                            <Text style={[styles.scheduleTime, { color: Colors.primary }]}>17:00</Text>
                                            <Text style={[styles.scheduleEvent, { color: textColor }]}>Final & Perebutan Juara 3</Text>
                                        </View>
                                    </View>
                                </View>
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
    scrollView: { flex: 1 },
    bannerContainer: { height: 220, position: "relative" },
    banner: { width: "100%", height: "100%" },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
    bannerContent: { position: "absolute", bottom: 20, left: 20, right: 20 },
    statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
    statusText: { fontSize: 12, fontWeight: "600" },
    tournamentName: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
    tournamentOrganizer: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
    quickInfo: { flexDirection: "row", justifyContent: "space-around", padding: 16, marginTop: -20, marginHorizontal: 16, borderRadius: 12 },
    quickInfoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    quickInfoText: { fontSize: 12 },
    actionButtons: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    registerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 10, gap: 8 },
    registerBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    registeredBadge: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 10, gap: 8 },
    registeredText: { fontSize: 15, fontWeight: "600" },
    bracketBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, gap: 6 },
    bracketBtnText: { fontSize: 14, fontWeight: "600" },
    tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16 },
    tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
    tabActive: { borderBottomWidth: 2 },
    tabText: { fontSize: 14, fontWeight: "600" },
    tabContent: { padding: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
    description: { fontSize: 14, lineHeight: 22 },
    detailsCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
    detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    detailLabel: { fontSize: 14 },
    detailValue: { fontSize: 14, fontWeight: "500", textAlign: "right", flex: 1, marginLeft: 20 },
    rulesCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
    rulesText: { fontSize: 14, lineHeight: 24 },
    participantCount: { fontSize: 13, marginBottom: 12 },
    participantCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 12 },
    seedBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    seedText: { fontSize: 12, fontWeight: "bold" },
    participantAvatar: { width: 40, height: 40, borderRadius: 20 },
    participantInfo: { flex: 1 },
    participantName: { fontSize: 15, fontWeight: "500" },
    participantMr: { fontSize: 12, marginTop: 2 },
    scheduleCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
    scheduleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    scheduleDate: { fontSize: 16, fontWeight: "600" },
    scheduleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    scheduleBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    scheduleItems: { gap: 12 },
    scheduleItem: { flexDirection: "row", gap: 16 },
    scheduleTime: { fontSize: 14, fontWeight: "600", width: 50 },
    scheduleEvent: { fontSize: 14, flex: 1 },
});
