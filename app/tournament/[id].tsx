import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { Tournament, Profile } from "../../src/types/database";
import TournamentStats from "../../src/components/TournamentStats";
import TournamentNotifications, { NotificationBadge } from "../../src/components/TournamentNotifications";

interface TournamentWithVenue extends Tournament {
    venues?: {
        name: string;
        city: string;
    } | null;
    organizer?: {
        name: string;
    } | null;
}

interface TournamentParticipant {
    id: string;
    user_id: string;
    seed: number | null;
    status: string;
    registered_at: string;
    profiles: {
        id: string;
        name: string;
        avatar_url: string | null;
        rating_mr: number;
    };
}

export default function TournamentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, profile } = useAuthStore();

    // States
    const [tournament, setTournament] = useState<TournamentWithVenue | null>(null);
    const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
    const [activeTab, setActiveTab] = useState<"info" | "participants" | "bracket" | "schedule" | "stats">("info");
    const [bracketData, setBracketData] = useState<any[]>([]);
    const [scheduleItems, setScheduleItems] = useState<any[]>([]);
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);

    // Check if user is the organizer
    const isOrganizer = tournament?.organizer_id === user?.id;

    // Colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    // Fetch tournament data
    const fetchTournament = useCallback(async () => {
        if (!id) return;

        try {
            const { data, error: fetchError } = await supabase
                .from("tournaments")
                .select(`
                    *,
                    venues (name, city)
                `)
                .eq("id", id)
                .single() as { data: any, error: any };

            if (fetchError) {
                console.error("Error fetching tournament:", fetchError);
                setError("Turnamen tidak ditemukan");
                return;
            }

            // Fetch organizer separately to avoid foreign key issues
            if (data?.organizer_id) {
                const { data: organizerData } = await supabase
                    .from("profiles")
                    .select("name")
                    .eq("id", data.organizer_id)
                    .single();

                if (organizerData) {
                    (data as any).organizer = organizerData;
                }
            }

            setTournament(data as TournamentWithVenue);

            // Parse schedule from tournament data
            if ((data as any).schedule) {
                try {
                    const parsed = JSON.parse((data as any).schedule);
                    setScheduleItems(parsed);
                } catch {
                    setScheduleItems([]);
                }
            }

            setError(null);
        } catch (err) {
            console.error("Error:", err);
            setError("Terjadi kesalahan saat memuat data");
        }
    }, [id]);

    // Fetch participants
    const fetchParticipants = useCallback(async () => {
        if (!id) return;

        try {
            const { data, error: fetchError } = await supabase
                .from("tournament_participants")
                .select(`
                    id,
                    user_id,
                    seed,
                    status,
                    registered_at,
                    profiles (id, name, avatar_url, rating_mr)
                `)
                .eq("tournament_id", id)
                .order("seed", { ascending: true, nullsFirst: false });

            if (fetchError) {
                console.error("Error fetching participants:", fetchError);
                return;
            }

            setParticipants((data || []) as TournamentParticipant[]);
        } catch (err) {
            console.error("Error:", err);
        }
    }, [id]);

    // Fetch bracket data
    const fetchBracket = useCallback(async () => {
        if (!id) return;

        try {
            const { data, error: fetchError } = await supabase
                .from("tournament_matches")
                .select(`
                    id,
                    round,
                    match_number,
                    player1_id,
                    player2_id,
                    player1_score,
                    player2_score,
                    winner_id,
                    status
                `)
                .eq("tournament_id", id)
                .order("round", { ascending: true })
                .order("match_number", { ascending: true });

            if (fetchError) {
                console.error("Error fetching bracket:", fetchError);
                return;
            }

            // Get player names for display
            const matchesWithNames = await Promise.all((data || []).map(async (match: any) => {
                let player1_name = 'TBD';
                let player2_name = 'TBD';

                if (match.player1_id) {
                    const { data: p1 } = await supabase.from("profiles").select("name").eq("id", match.player1_id).single() as { data: { name: string } | null };
                    if (p1) player1_name = p1.name;
                }
                if (match.player2_id) {
                    const { data: p2 } = await supabase.from("profiles").select("name").eq("id", match.player2_id).single() as { data: { name: string } | null };
                    if (p2) player2_name = p2.name;
                }

                return { ...match, player1_name, player2_name };
            }));

            setBracketData(matchesWithNames);
        } catch (err) {
            console.error("Error:", err);
        }
    }, [id]);

    // Check if current user is registered
    const checkRegistration = useCallback(async () => {
        if (!id || !user?.id) {
            setIsRegistered(false);
            return;
        }

        try {
            const { data, error: checkError } = await supabase
                .from("tournament_participants")
                .select("id")
                .eq("tournament_id", id)
                .eq("user_id", user.id)
                .maybeSingle();

            if (checkError) {
                console.error("Error checking registration:", checkError);
                return;
            }

            setIsRegistered(!!data);
        } catch (err) {
            console.error("Error:", err);
        }
    }, [id, user?.id]);

    // Initial data load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchTournament(), fetchParticipants(), fetchBracket(), checkRegistration()]);
            setLoading(false);
        };

        loadData();
    }, [fetchTournament, fetchParticipants, fetchBracket, checkRegistration]);

    // Real-time subscription for participant updates
    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`tournament-${id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "tournament_participants",
                    filter: `tournament_id=eq.${id}`,
                },
                (payload) => {
                    console.log("Participant change:", payload);
                    // Refetch participants and tournament on any change
                    fetchParticipants();
                    fetchTournament();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, fetchParticipants, fetchTournament]);

    // Refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchTournament(), fetchParticipants(), checkRegistration()]);
        setRefreshing(false);
    };

    // Register for tournament
    const handleRegister = async () => {
        if (!user?.id || !tournament) {
            Alert.alert("Error", "Anda harus login untuk mendaftar");
            return;
        }

        // Check if registration is still open
        if (!["DRAFT", "REGISTRATION_OPEN"].includes(tournament.status)) {
            Alert.alert("Error", "Pendaftaran sudah ditutup");
            return;
        }

        // Check if max participants reached
        if (tournament.current_participants >= tournament.max_participants) {
            Alert.alert("Error", "Kuota peserta sudah penuh");
            return;
        }

        setRegistering(true);
        try {
            const { error: insertError } = await supabase
                .from("tournament_participants")
                .insert({
                    tournament_id: tournament.id,
                    user_id: user.id,
                    status: "REGISTERED",
                } as any);

            if (insertError) {
                if (insertError.code === "23505") {
                    Alert.alert("Info", "Anda sudah terdaftar di turnamen ini");
                    setIsRegistered(true);
                } else {
                    console.error("Registration error:", insertError);
                    Alert.alert("Error", "Gagal mendaftar. Silakan coba lagi.");
                }
                return;
            }

            setIsRegistered(true);
            Alert.alert("Berhasil!", "Anda berhasil mendaftar ke turnamen!");

            // Refetch data
            await Promise.all([fetchTournament(), fetchParticipants()]);
        } catch (err) {
            console.error("Error registering:", err);
            Alert.alert("Error", "Terjadi kesalahan saat mendaftar");
        } finally {
            setRegistering(false);
        }
    };

    // Unregister from tournament
    const handleUnregister = async () => {
        if (!user?.id || !tournament) return;

        // Check if unregistration is allowed
        const registrationEnd = new Date(tournament.registration_end);
        if (new Date() > registrationEnd) {
            Alert.alert("Error", "Tidak dapat membatalkan pendaftaran setelah batas waktu");
            return;
        }

        Alert.alert(
            "Batalkan Pendaftaran",
            "Apakah Anda yakin ingin membatalkan pendaftaran?",
            [
                { text: "Tidak", style: "cancel" },
                {
                    text: "Ya, Batalkan",
                    style: "destructive",
                    onPress: async () => {
                        setRegistering(true);
                        try {
                            const { error: deleteError } = await supabase
                                .from("tournament_participants")
                                .delete()
                                .eq("tournament_id", tournament.id)
                                .eq("user_id", user.id);

                            if (deleteError) {
                                console.error("Unregister error:", deleteError);
                                Alert.alert("Error", "Gagal membatalkan pendaftaran");
                                return;
                            }

                            setIsRegistered(false);
                            Alert.alert("Berhasil", "Pendaftaran berhasil dibatalkan");
                            await Promise.all([fetchTournament(), fetchParticipants()]);
                        } catch (err) {
                            console.error("Error:", err);
                            Alert.alert("Error", "Terjadi kesalahan");
                        } finally {
                            setRegistering(false);
                        }
                    },
                },
            ]
        );
    };

    // Helper functions
    const getStatusBadge = () => {
        if (!tournament) return { label: "", color: mutedColor, bg: "#F3F4F6" };

        switch (tournament.status) {
            case "REGISTRATION_OPEN":
                return { label: "Pendaftaran Dibuka", color: "#10B981", bg: "#D1FAE5" };
            case "REGISTRATION_CLOSED":
                return { label: "Pendaftaran Ditutup", color: "#F59E0B", bg: "#FEF3C7" };
            case "IN_PROGRESS":
                return { label: "Berlangsung", color: Colors.primary, bg: "#DBEAFE" };
            case "COMPLETED":
                return { label: "Selesai", color: mutedColor, bg: "#F3F4F6" };
            case "CANCELLED":
                return { label: "Dibatalkan", color: "#EF4444", bg: "#FEE2E2" };
            case "DRAFT":
                return { label: "Draf", color: mutedColor, bg: "#F3F4F6" };
            default:
                return { label: tournament.status, color: mutedColor, bg: "#F3F4F6" };
        }
    };

    const formatCurrency = (amount: number | null) => {
        if (!amount) return "Gratis";
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    const getFormatLabel = (format: string) => {
        const formats: Record<string, string> = {
            "SINGLE_ELIMINATION": "Sistem Gugur",
            "DOUBLE_ELIMINATION": "Sistem Gugur Ganda",
            "ROUND_ROBIN": "Round Robin",
            "GROUP_STAGE": "Fase Grup",
        };
        return formats[format] || format;
    };

    const getCategoryLabel = (category: string) => {
        const categories: Record<string, string> = {
            "OPEN": "Terbuka",
            "MALE": "Putra",
            "FEMALE": "Putri",
            "DOUBLES": "Ganda",
            "U17": "U-17",
            "U21": "U-21",
            "VETERAN_40": "Veteran 40+",
            "VETERAN_50": "Veteran 50+",
        };
        return categories[category] || category;
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.loadingText, { color: mutedColor }]}>Memuat turnamen...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (error || !tournament) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={64} color={mutedColor} />
                    <Text style={[styles.errorTitle, { color: textColor }]}>
                        {error || "Turnamen tidak ditemukan"}
                    </Text>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: Colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backBtnText}>Kembali</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const statusBadge = getStatusBadge();
    const canRegister = ["DRAFT", "REGISTRATION_OPEN"].includes(tournament.status) &&
        tournament.current_participants < tournament.max_participants;

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
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Banner */}
                    <View style={styles.bannerContainer}>
                        <Image
                            source={{
                                uri: tournament.banner_url ||
                                    `https://placehold.co/600x200/${Colors.secondary.replace("#", "")}/${Colors.accent.replace("#", "")}?text=${encodeURIComponent(tournament.name)}`
                            }}
                            style={styles.banner}
                        />
                        <View style={styles.bannerOverlay} />
                        <View style={styles.bannerContent}>
                            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                                <Text style={[styles.statusText, { color: statusBadge.color }]}>
                                    {statusBadge.label}
                                </Text>
                            </View>
                            <Text style={styles.tournamentName}>{tournament.name}</Text>
                            <Text style={styles.tournamentOrganizer}>
                                by {tournament.organizer?.name || "Organizer"}
                            </Text>
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
                                {tournament.venues?.name || "TBD"}
                            </Text>
                        </View>
                        <View style={styles.quickInfoItem}>
                            <MaterialIcons name="people" size={18} color={Colors.primary} />
                            <Text style={[styles.quickInfoText, { color: textColor }]}>
                                {tournament.current_participants}/{tournament.max_participants}
                            </Text>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        {canRegister && !isRegistered && (
                            <TouchableOpacity
                                style={[styles.registerBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleRegister}
                                disabled={registering}
                            >
                                {registering ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="how-to-reg" size={20} color="#fff" />
                                        <Text style={styles.registerBtnText}>
                                            Daftar - {formatCurrency(tournament.registration_fee)}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        {isRegistered && (
                            <TouchableOpacity
                                style={[styles.registeredBadge, { backgroundColor: "#D1FAE5" }]}
                                onPress={handleUnregister}
                                disabled={registering}
                            >
                                {registering ? (
                                    <ActivityIndicator size="small" color="#10B981" />
                                ) : (
                                    <>
                                        <MaterialIcons name="check-circle" size={20} color="#10B981" />
                                        <Text style={[styles.registeredText, { color: "#10B981" }]}>
                                            Terdaftar
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        {!canRegister && !isRegistered && tournament.status !== "COMPLETED" && (
                            <View style={[styles.registeredBadge, { backgroundColor: "#FEF3C7" }]}>
                                <MaterialIcons name="lock" size={20} color="#F59E0B" />
                                <Text style={[styles.registeredText, { color: "#F59E0B" }]}>
                                    {tournament.current_participants >= tournament.max_participants
                                        ? "Kuota Penuh"
                                        : "Pendaftaran Ditutup"}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.bracketBtn, { backgroundColor: Colors.accent }]}
                            onPress={() => router.push({ pathname: "/tournament/bracket", params: { tournamentId: tournament.id } })}
                        >
                            <MaterialIcons name="account-tree" size={20} color={Colors.secondary} />
                            <Text style={[styles.bracketBtnText, { color: Colors.secondary }]}>Bracket</Text>
                        </TouchableOpacity>
                        {isOrganizer && (
                            <TouchableOpacity
                                style={[styles.editBtn, { backgroundColor: Colors.secondary }]}
                                onPress={() => router.push(`/tournament/edit/${tournament.id}` as any)}
                            >
                                <MaterialIcons name="edit" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabs, { borderBottomColor: borderColor }]}>
                        {[
                            { key: "info", label: "Info" },
                            { key: "participants", label: `Peserta (${participants.length})` },
                            { key: "bracket", label: "Bracket" },
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
                                        {tournament.description || "Tidak ada deskripsi"}
                                    </Text>
                                </View>

                                {/* Details */}
                                <View style={[styles.detailsCard, { backgroundColor: cardColor, borderColor }]}>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Format</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>
                                            {getFormatLabel(tournament.format)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Kategori</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>
                                            {getCategoryLabel(tournament.category)}
                                        </Text>
                                    </View>
                                    {(tournament.prize_pool ?? 0) > 0 && (
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: mutedColor }]}>Hadiah</Text>
                                            <Text style={[styles.detailValue, { color: Colors.primary }]}>
                                                {formatCurrency(tournament.prize_pool)}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Biaya Daftar</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>
                                            {formatCurrency(tournament.registration_fee)}
                                        </Text>
                                    </View>
                                    <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                                        <Text style={[styles.detailLabel, { color: mutedColor }]}>Lokasi</Text>
                                        <Text style={[styles.detailValue, { color: textColor }]}>
                                            {tournament.venues?.name || "TBD"}{tournament.venues?.city ? `, ${tournament.venues.city}` : ""}
                                        </Text>
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

                                {participants.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <MaterialIcons name="people-outline" size={48} color={mutedColor} />
                                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                                            Belum ada peserta terdaftar
                                        </Text>
                                    </View>
                                ) : (
                                    participants.map((p, index) => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.participantCard, { backgroundColor: cardColor, borderColor }]}
                                            onPress={() => router.push({ pathname: "/player/[id]", params: { id: p.profiles.id } })}
                                        >
                                            <View style={[styles.seedBadge, { backgroundColor: index < 4 ? Colors.accent : Colors.blueLight }]}>
                                                <Text style={[styles.seedText, { color: index < 4 ? Colors.secondary : "#fff" }]}>
                                                    {p.seed || index + 1}
                                                </Text>
                                            </View>
                                            <Image
                                                source={{
                                                    uri: p.profiles.avatar_url ||
                                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(p.profiles.name)}&background=4169E1&color=fff`
                                                }}
                                                style={styles.participantAvatar}
                                            />
                                            <View style={styles.participantInfo}>
                                                <Text style={[styles.participantName, { color: textColor }]}>
                                                    {p.profiles.name}
                                                </Text>
                                                <Text style={[styles.participantMr, { color: mutedColor }]}>
                                                    MR {p.profiles.rating_mr}
                                                </Text>
                                            </View>
                                            <MaterialIcons name="chevron-right" size={20} color={mutedColor} />
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        {activeTab === "bracket" && (
                            <View>
                                {bracketData.length === 0 ? (
                                    <View style={[styles.emptyState, { backgroundColor: cardColor, borderColor }]}>
                                        <MaterialIcons name="account-tree" size={48} color={mutedColor} />
                                        <Text style={[styles.emptyTitle, { color: textColor }]}>
                                            Bracket Belum Tersedia
                                        </Text>
                                        <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                            Bracket akan dibuat setelah pendaftaran ditutup
                                        </Text>
                                        {isOrganizer && (
                                            <TouchableOpacity
                                                style={[styles.createBracketBtn, { backgroundColor: Colors.primary }]}
                                                onPress={() => router.push(`/tournament/bracket?tournamentId=${id}`)}
                                            >
                                                <MaterialIcons name="add" size={20} color="#fff" />
                                                <Text style={styles.createBracketBtnText}>Buat Bracket</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ) : (
                                    <View>
                                        <TouchableOpacity
                                            style={[styles.viewBracketBtn, { backgroundColor: Colors.primary }]}
                                            onPress={() => router.push(`/tournament/bracket?tournamentId=${id}`)}
                                        >
                                            <MaterialIcons name="account-tree" size={20} color="#fff" />
                                            <Text style={styles.viewBracketBtnText}>Lihat Bracket Lengkap</Text>
                                        </TouchableOpacity>

                                        {/* Bracket Preview */}
                                        <View style={[styles.bracketPreview, { backgroundColor: cardColor, borderColor }]}>
                                            <Text style={[styles.bracketPreviewTitle, { color: textColor }]}>
                                                Total {bracketData.length} Pertandingan
                                            </Text>
                                            {bracketData.slice(0, 3).map((match: any, index: number) => (
                                                <View key={match.id || index} style={[styles.matchPreview, { borderColor }]}>
                                                    <View style={styles.matchTeams}>
                                                        <Text style={[styles.matchTeam, { color: textColor }]}>
                                                            {match.player1_name || 'TBD'}
                                                        </Text>
                                                        <Text style={[styles.matchVs, { color: mutedColor }]}>vs</Text>
                                                        <Text style={[styles.matchTeam, { color: textColor }]}>
                                                            {match.player2_name || 'TBD'}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.matchRound, { color: mutedColor }]}>
                                                        Round {match.round || 1}
                                                    </Text>
                                                </View>
                                            ))}
                                            {bracketData.length > 3 && (
                                                <Text style={[styles.moreMatches, { color: Colors.primary }]}>
                                                    + {bracketData.length - 3} pertandingan lagi
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === "schedule" && (
                            <View>
                                {/* Organizer: Edit Schedule Button */}
                                {isOrganizer && (
                                    <TouchableOpacity
                                        style={[styles.viewBracketBtn, { backgroundColor: Colors.primary }]}
                                        onPress={() => router.push(`/tournament/schedule?tournamentId=${id}`)}
                                    >
                                        <MaterialIcons name="edit-calendar" size={20} color="#fff" />
                                        <Text style={styles.viewBracketBtnText}>Edit Jadwal</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Show schedule from database or default */}
                                {scheduleItems.length > 0 ? (
                                    // Group by day and render
                                    [...new Set(scheduleItems.map((item: any) => item.day || 1))].sort().map((day: number) => (
                                        <View key={day} style={[styles.scheduleCard, { backgroundColor: cardColor, borderColor, marginBottom: 12 }]}>
                                            <View style={styles.scheduleHeader}>
                                                <Text style={[styles.scheduleDate, { color: textColor }]}>
                                                    {formatDate(tournament.start_date)}
                                                </Text>
                                                <View style={[styles.scheduleBadge, { backgroundColor: Colors.primary }]}>
                                                    <Text style={styles.scheduleBadgeText}>Hari {day}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.scheduleItems}>
                                                {scheduleItems
                                                    .filter((item: any) => (item.day || 1) === day)
                                                    .sort((a: any, b: any) => a.time.localeCompare(b.time))
                                                    .map((item: any) => (
                                                        <View key={item.id} style={styles.scheduleItem}>
                                                            <Text style={[styles.scheduleTime, { color: Colors.primary }]}>{item.time}</Text>
                                                            <Text style={[styles.scheduleEvent, { color: textColor }]}>{item.event}</Text>
                                                        </View>
                                                    ))}
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    // Default schedule when none saved
                                    <View style={[styles.scheduleCard, { backgroundColor: cardColor, borderColor }]}>
                                        <View style={styles.scheduleHeader}>
                                            <Text style={[styles.scheduleDate, { color: textColor }]}>
                                                {formatDate(tournament.start_date)}
                                            </Text>
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
                                )}
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
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, fontSize: 14 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    errorTitle: { fontSize: 16, fontWeight: "500", marginTop: 16, textAlign: "center" },
    backBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
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
    editBtn: { width: 48, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    tabs: { flexDirection: "row", borderBottomWidth: 1, marginHorizontal: 16 },
    tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
    tabActive: { borderBottomWidth: 2 },
    tabText: { fontSize: 14, fontWeight: "600" },
    tabContent: { padding: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
    description: { fontSize: 14, lineHeight: 22 },
    detailsCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 20 },
    detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    detailLabel: { fontSize: 14 },
    detailValue: { fontSize: 14, fontWeight: "500", textAlign: "right", flex: 1, marginLeft: 20 },
    rulesCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
    rulesText: { fontSize: 14, lineHeight: 24 },
    participantCount: { fontSize: 13, marginBottom: 12 },
    emptyState: { padding: 40, alignItems: "center", borderRadius: 12, borderWidth: 1 },
    emptyTitle: { fontSize: 16, fontWeight: "600", marginTop: 12 },
    emptyDesc: { fontSize: 14, marginTop: 8, textAlign: "center" },
    emptyText: { marginTop: 12, fontSize: 14 },
    createBracketBtn: { flexDirection: "row", alignItems: "center", marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8 },
    createBracketBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    viewBracketBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 10, gap: 8, marginBottom: 16 },
    viewBracketBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    bracketPreview: { borderRadius: 12, borderWidth: 1, padding: 16 },
    bracketPreviewTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
    matchPreview: { paddingVertical: 12, borderBottomWidth: 1 },
    matchTeams: { flexDirection: "row", alignItems: "center", gap: 8 },
    matchTeam: { fontSize: 14, flex: 1 },
    matchVs: { fontSize: 12 },
    matchRound: { fontSize: 12, marginTop: 4 },
    moreMatches: { fontSize: 13, fontWeight: "500", marginTop: 12, textAlign: "center" },
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
