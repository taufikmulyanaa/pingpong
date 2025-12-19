import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    Modal,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";

interface Tournament {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    max_participants: number;
    current_participants: number;
    registration_fee: number;
    prize_pool: number;
    format: string;
    status: string;
    venue_id: string | null;
    banner_url: string | null;
    venues?: { name: string; city: string } | null;
}

export default function TournamentListScreen() {
    const router = useRouter();

    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"upcoming" | "ongoing" | "past">("upcoming");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTournament, setNewTournament] = useState({ name: "", venue: "", date: "" });

    // Fetch tournaments from Supabase
    const fetchTournaments = async () => {
        try {
            const { data, error } = await supabase
                .from("tournaments")
                .select(`
                    *,
                    venues (name, city)
                `)
                .order("start_date", { ascending: true });

            if (error) {
                console.error("Error fetching tournaments:", error);
                setTournaments([]);
            } else {
                setTournaments(data || []);
            }
        } catch (error) {
            console.error("Error:", error);
            setTournaments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    // Map database status to filter categories
    const filteredTournaments = tournaments.filter(t => {
        if (filter === "upcoming") return ["DRAFT", "REGISTRATION_OPEN"].includes(t.status);
        if (filter === "ongoing") return ["REGISTRATION_CLOSED", "IN_PROGRESS"].includes(t.status);
        return ["COMPLETED", "CANCELLED"].includes(t.status);
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTournaments();
        setRefreshing(false);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "REGISTRATION_OPEN": return "#10B981";
            case "IN_PROGRESS": return Colors.primary;
            case "COMPLETED": return "#6B7280";
            case "CANCELLED": return "#EF4444";
            default: return mutedColor;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "DRAFT": return "Draf";
            case "REGISTRATION_OPEN": return "Pendaftaran";
            case "REGISTRATION_CLOSED": return "Pendaftaran Tutup";
            case "IN_PROGRESS": return "Berlangsung";
            case "COMPLETED": return "Selesai";
            case "CANCELLED": return "Dibatalkan";
            default: return status;
        }
    };

    const handleCreateTournament = () => {
        if (newTournament.name && newTournament.venue) {
            // In a real app, this would submit to the backend
            alert("Fitur pembuatan turnamen akan segera tersedia!");
            setShowCreateModal(false);
            setNewTournament({ name: "", venue: "", date: "" });
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Custom Navy Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Turnamen</Text>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push("/tournament/create")}
                    >
                        <MaterialIcons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View style={[styles.filterTabs, { borderBottomColor: borderColor }]}>
                    {[
                        { key: "upcoming", label: "Akan Datang" },
                        { key: "ongoing", label: "Berlangsung" },
                        { key: "past", label: "Selesai" },
                    ].map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterTab,
                                filter === f.key && [styles.filterTabActive, { borderBottomColor: Colors.primary }]
                            ]}
                            onPress={() => setFilter(f.key as any)}
                        >
                            <Text style={[
                                styles.filterTabText,
                                { color: filter === f.key ? Colors.primary : mutedColor }
                            ]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {filteredTournaments.map((tournament) => (
                        <TouchableOpacity
                            key={tournament.id}
                            style={[styles.tournamentCard, { backgroundColor: cardColor }]}
                            onPress={() => router.push({ pathname: "/tournament/[id]", params: { id: tournament.id } })}
                        >
                            <Image
                                source={
                                    tournament.banner_url
                                        ? { uri: tournament.banner_url }
                                        : { uri: `https://placehold.co/320x120/${Colors.secondary.replace("#", "")}/${Colors.accent.replace("#", "")}?text=${encodeURIComponent(tournament.name)}` }
                                }
                                style={styles.tournamentImage}
                            />
                            <View style={styles.tournamentContent}>
                                <View style={styles.tournamentHeader}>
                                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(tournament.status)}20` }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(tournament.status) }]}>
                                            {getStatusLabel(tournament.status)}
                                        </Text>
                                    </View>
                                    <Text style={[styles.formatBadge, { color: mutedColor }]}>
                                        {tournament.format}
                                    </Text>
                                </View>
                                <Text style={[styles.tournamentName, { color: textColor }]}>
                                    {tournament.name}
                                </Text>
                                <View style={styles.tournamentMeta}>
                                    <MaterialIcons name="place" size={14} color={mutedColor} />
                                    <Text style={[styles.metaText, { color: mutedColor }]}>
                                        {tournament.venues?.name || "Lokasi TBD"}{tournament.venues?.city ? `, ${tournament.venues.city}` : ""}
                                    </Text>
                                </View>
                                <View style={styles.tournamentMeta}>
                                    <MaterialIcons name="event" size={14} color={mutedColor} />
                                    <Text style={[styles.metaText, { color: mutedColor }]}>
                                        {formatDate(tournament.start_date)}
                                    </Text>
                                </View>
                                <View style={styles.tournamentFooter}>
                                    <View style={styles.participantsInfo}>
                                        <MaterialIcons name="people" size={16} color={Colors.primary} />
                                        <Text style={[styles.participantsText, { color: textColor }]}>
                                            {tournament.current_participants}/{tournament.max_participants}
                                        </Text>
                                    </View>
                                    {tournament.prize_pool > 0 && (
                                        <View style={styles.prizeInfo}>
                                            <MaterialIcons name="emoji-events" size={16} color="#F59E0B" />
                                            <Text style={styles.prizeText}>
                                                Rp {(tournament.prize_pool / 1000000).toFixed(0)}jt
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {filteredTournaments.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="emoji-events" size={48} color={mutedColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                Tidak ada turnamen
                            </Text>
                            <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                {filter === "upcoming" ? "Belum ada turnamen yang dijadwalkan" :
                                    filter === "ongoing" ? "Tidak ada turnamen yang sedang berlangsung" :
                                        "Belum ada riwayat turnamen"}
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>

                {/* Create Tournament Modal */}
                <Modal visible={showCreateModal} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: textColor }]}>Buat Turnamen</Text>
                                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                    <MaterialIcons name="close" size={24} color={mutedColor} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Nama Turnamen</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Contoh: Jakarta Open 2024"
                                    placeholderTextColor={mutedColor}
                                    value={newTournament.name}
                                    onChangeText={(text) => setNewTournament({ ...newTournament, name: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Venue</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Contoh: GOR Bulungan"
                                    placeholderTextColor={mutedColor}
                                    value={newTournament.venue}
                                    onChangeText={(text) => setNewTournament({ ...newTournament, venue: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: textColor }]}>Tanggal (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="2024-12-28"
                                    placeholderTextColor={mutedColor}
                                    value={newTournament.date}
                                    onChangeText={(text) => setNewTournament({ ...newTournament, date: text })}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleCreateTournament}
                            >
                                <Text style={styles.submitBtnText}>Buat Turnamen</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: Colors.secondary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    filterTabs: {
        flexDirection: "row",
        borderBottomWidth: 1,
    },
    filterTab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 14,
    },
    filterTabActive: {
        borderBottomWidth: 2,
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    tournamentCard: {
        borderRadius: 12,
        marginBottom: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    tournamentImage: {
        width: "100%",
        height: 100,
        backgroundColor: "#E5E7EB",
    },
    tournamentContent: {
        padding: 14,
    },
    tournamentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: "600",
    },
    formatBadge: {
        fontSize: 12,
        fontWeight: "500",
    },
    tournamentName: {
        fontSize: 17,
        fontWeight: "bold",
        marginBottom: 8,
    },
    tournamentMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
    },
    metaText: {
        fontSize: 13,
    },
    tournamentFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
    },
    participantsInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    participantsText: {
        fontSize: 14,
        fontWeight: "600",
    },
    prizeInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    prizeText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#F59E0B",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 16,
    },
    emptyDesc: {
        fontSize: 13,
        textAlign: "center",
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
    },
    submitBtn: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
