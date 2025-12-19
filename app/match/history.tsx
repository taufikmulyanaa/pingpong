import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface MatchHistory {
    id: string;
    opponent: string;
    opponentAvatar: string;
    date: string;
    result: "WIN" | "LOSS";
    score: string;
    duration: string;
    mrChange: string;
    location: string;
    type: string;
}

export default function MatchHistoryScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();
    const [filter, setFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [matches, setMatches] = useState<MatchHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMatches = async () => {
        if (!profile) return;

        try {
            // Fetch matches where user is player1 or player2
            const { data, error } = await supabase
                .from("matches")
                .select(`
                    *,
                    player1:profiles!matches_player1_id_fkey(id, name, avatar_url),
                    player2:profiles!matches_player2_id_fkey(id, name, avatar_url),
                    venue:venues(name)
                `)
                .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
                .eq("status", "COMPLETED")
                .order("completed_at", { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error fetching matches:", error);
                setMatches([]);
            } else if (data) {
                const processedMatches: MatchHistory[] = data.map((match: any) => {
                    const isPlayer1 = match.player1_id === profile.id;
                    const opponent = isPlayer1 ? match.player2 : match.player1;
                    const won = match.winner_id === profile.id;
                    const ratingChange = isPlayer1 ? match.player1_rating_change : match.player2_rating_change;

                    return {
                        id: match.id,
                        opponent: opponent?.name || "Unknown",
                        opponentAvatar: opponent?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponent?.name || "U")}&background=random`,
                        date: match.completed_at ? new Date(match.completed_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                        }) : "-",
                        result: won ? "WIN" : "LOSS",
                        score: "3-1", // TODO: Calculate from match_sets
                        duration: "25 min", // TODO: Calculate from started_at/completed_at
                        mrChange: ratingChange ? (ratingChange > 0 ? `+${ratingChange}` : `${ratingChange}`) : "-",
                        location: match.venue?.name || "Online",
                        type: match.type,
                    };
                });
                setMatches(processedMatches);
            }
        } catch (error) {
            console.error("Error:", error);
            setMatches([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, [profile]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMatches();
        setRefreshing(false);
    };

    const filteredData = matches.filter(item => {
        const matchesFilter = filter === "ALL" || item.result === filter;
        const matchesSearch = item.opponent.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={[styles.historyCard, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
                <View style={styles.opponentInfo}>
                    <Image source={{ uri: item.opponentAvatar }} style={styles.avatar} />
                    <View>
                        <Text style={[styles.opponentName, { color: textColor }]}>{item.opponent}</Text>
                        <Text style={[styles.matchDate, { color: mutedColor }]}>{item.date}</Text>
                    </View>
                </View>
                <View style={[
                    styles.resultBadge,
                    { backgroundColor: item.result === "WIN" ? "#DCFCE7" : "#FEE2E2" }
                ]}>
                    <Text style={[
                        styles.resultText,
                        { color: item.result === "WIN" ? "#166534" : "#991B1B" }
                    ]}>
                        {item.result}
                    </Text>
                </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.matchStats}>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Score</Text>
                    <Text style={[styles.statValue, { color: textColor }]}>{item.score}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Durasi</Text>
                    <Text style={[styles.statValue, { color: textColor }]}>{item.duration}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: mutedColor }]}>Rating</Text>
                    <Text style={[
                        styles.statValue,
                        { color: item.result === "WIN" ? "#10B981" : "#EF4444" }
                    ]}>
                        {item.mrChange}
                    </Text>
                </View>
            </View>

            <View style={[styles.locationTag, { backgroundColor: "rgba(0,0,0,0.03)" }]}>
                <MaterialIcons name="place" size={14} color={mutedColor} />
                <Text style={[styles.locationText, { color: mutedColor }]}>{item.location}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Riwayat Pertandingan</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Filters */}
                <View style={styles.filterSection}>
                    <View style={[styles.searchBar, { backgroundColor: cardColor, borderColor: "rgba(0,0,0,0.05)" }]}>
                        <MaterialIcons name="search" size={20} color={mutedColor} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder="Cari lawan..."
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.filterTabs}>
                        {["ALL", "WIN", "LOSS"].map((f) => (
                            <TouchableOpacity
                                key={f}
                                style={[
                                    styles.filterTab,
                                    filter === f && styles.filterTabActive,
                                    { borderColor: filter === f ? Colors.primary : "rgba(0,0,0,0.05)" }
                                ]}
                                onPress={() => setFilter(f)}
                            >
                                <Text style={[
                                    styles.filterText,
                                    { color: filter === f ? Colors.primary : mutedColor }
                                ]}>
                                    {f === "ALL" ? "Semua" : f === "WIN" ? "Menang" : "Kalah"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* List */}
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialIcons name="history" size={48} color={mutedColor} />
                            <Text style={[styles.emptyText, { color: mutedColor }]}>
                                Tidak ada riwayat pertandingan
                            </Text>
                        </View>
                    }
                />
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
    filterSection: {
        padding: 20,
        gap: 16,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
    },
    filterTabs: {
        flexDirection: "row",
        gap: 12,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: "transparent",
    },
    filterTabActive: {
        backgroundColor: "rgba(59, 130, 246, 0.1)",
    },
    filterText: {
        fontSize: 12,
        fontWeight: "600",
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
    },
    historyCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    opponentInfo: {
        flexDirection: "row",
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E5E7EB",
    },
    opponentName: {
        fontSize: 16,
        fontWeight: "bold",
    },
    matchDate: {
        fontSize: 12,
        marginTop: 2,
    },
    resultBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    resultText: {
        fontSize: 10,
        fontWeight: "bold",
    },
    cardDivider: {
        height: 1,
        backgroundColor: "rgba(0,0,0,0.05)",
        marginVertical: 12,
    },
    matchStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "bold",
    },
    locationTag: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    locationText: {
        fontSize: 11,
    },
    emptyState: {
        alignItems: "center",
        marginTop: 60,
        gap: 16,
    },
    emptyText: {
        fontSize: 14,
    }
});
