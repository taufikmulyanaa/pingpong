import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface Player {
    id: string;
    name: string;
    avatar_url: string;
    rating_mr: number;
    level: number;
    wins: number;
    losses: number;
    total_matches: number;
}

interface H2HMatch {
    id: string;
    date: string;
    winner_id: string;
    player1_score: number;
    player2_score: number;
    match_type: string;
}

export default function HeadToHeadScreen() {
    const router = useRouter();
    const { opponentId } = useLocalSearchParams<{ opponentId: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();

    const [opponent, setOpponent] = useState<Player | null>(null);
    const [h2hMatches, setH2hMatches] = useState<H2HMatch[]>([]);
    const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    useEffect(() => {
        const fetchData = async () => {
            if (!opponentId || !profile?.id) return;

            // Fetch opponent profile
            const { data: opponentData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", opponentId)
                .single();

            if (opponentData) setOpponent(opponentData);

            // Fetch H2H matches
            const { data: matchData } = await supabase
                .from("matches")
                .select("*")
                .or(`and(player1_id.eq.${profile.id},player2_id.eq.${opponentId}),and(player1_id.eq.${opponentId},player2_id.eq.${profile.id})`)
                .order("created_at", { ascending: false })
                .limit(20);

            if (matchData) {
                setH2hMatches(matchData as any);

                // Calculate stats
                let wins = 0, losses = 0;
                matchData.forEach((m: any) => {
                    if (m.winner_id === profile.id) wins++;
                    else if (m.winner_id === opponentId) losses++;
                });
                setStats({ wins, losses, draws: matchData.length - wins - losses });
            }
        };

        fetchData();
    }, [opponentId, profile?.id]);

    // Demo data if no real matches
    const demoStats = { wins: 3, losses: 2, draws: 0 };
    const displayStats = h2hMatches.length > 0 ? stats : demoStats;
    const totalMatches = displayStats.wins + displayStats.losses + displayStats.draws;
    const winRate = totalMatches > 0 ? Math.round((displayStats.wins / totalMatches) * 100) : 0;

    // Demo opponent if not loaded
    const displayOpponent = opponent || {
        id: opponentId || "demo",
        name: "Budi Santoso",
        avatar_url: "",
        rating_mr: 1450,
        level: 12,
        wins: 45,
        losses: 23,
        total_matches: 68,
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Head-to-Head",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Players Comparison */}
                    <View style={[styles.vsCard, { backgroundColor: cardColor }]}>
                        {/* Player 1 (Me) */}
                        <View style={styles.playerSide}>
                            <Image
                                source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "You")}&background=random` }}
                                style={styles.playerAvatar}
                            />
                            <Text style={[styles.playerName, { color: textColor }]} numberOfLines={1}>
                                {profile?.name || "Kamu"}
                            </Text>
                            <Text style={[styles.playerMr, { color: mutedColor }]}>
                                {profile?.rating_mr || 1000} MR
                            </Text>
                        </View>

                        {/* VS */}
                        <View style={styles.vsCenter}>
                            <View style={styles.vsBadge}>
                                <Text style={styles.vsText}>VS</Text>
                            </View>
                            <Text style={[styles.totalMatches, { color: mutedColor }]}>
                                {totalMatches} pertandingan
                            </Text>
                        </View>

                        {/* Player 2 (Opponent) */}
                        <View style={styles.playerSide}>
                            <Image
                                source={{ uri: displayOpponent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayOpponent.name)}&background=random` }}
                                style={styles.playerAvatar}
                            />
                            <Text style={[styles.playerName, { color: textColor }]} numberOfLines={1}>
                                {displayOpponent.name}
                            </Text>
                            <Text style={[styles.playerMr, { color: mutedColor }]}>
                                {displayOpponent.rating_mr} MR
                            </Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={[styles.statsCard, { backgroundColor: cardColor }]}>
                        <Text style={[styles.statsTitle, { color: textColor }]}>Statistik H2H</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: "#10B981" }]}>{displayStats.wins}</Text>
                                <Text style={[styles.statLabel, { color: mutedColor }]}>Menang</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: "#6B7280" }]}>{displayStats.draws}</Text>
                                <Text style={[styles.statLabel, { color: mutedColor }]}>Seri</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: "#EF4444" }]}>{displayStats.losses}</Text>
                                <Text style={[styles.statLabel, { color: mutedColor }]}>Kalah</Text>
                            </View>
                        </View>

                        {/* Win Rate Bar */}
                        <View style={styles.winRateSection}>
                            <View style={styles.winRateHeader}>
                                <Text style={[styles.winRateLabel, { color: textColor }]}>Win Rate</Text>
                                <Text style={[styles.winRateValue, { color: Colors.primary }]}>{winRate}%</Text>
                            </View>
                            <View style={[styles.winRateBar, { backgroundColor: "#EF4444" }]}>
                                <View style={[styles.winRateFill, { width: `${winRate}%`, backgroundColor: "#10B981" }]} />
                            </View>
                        </View>
                    </View>

                    {/* Recent Matches */}
                    <View style={[styles.historyCard, { backgroundColor: cardColor }]}>
                        <Text style={[styles.historyTitle, { color: textColor }]}>Riwayat Pertandingan</Text>

                        {/* Demo matches */}
                        {[1, 2, 3, 4, 5].map((i) => {
                            const isWin = i % 2 === 1;
                            return (
                                <View key={i} style={styles.matchRow}>
                                    <View style={[styles.resultBadge, { backgroundColor: isWin ? "#10B98120" : "#EF444420" }]}>
                                        <MaterialIcons
                                            name={isWin ? "emoji-events" : "close"}
                                            size={16}
                                            color={isWin ? "#10B981" : "#EF4444"}
                                        />
                                    </View>
                                    <View style={styles.matchInfo}>
                                        <Text style={[styles.matchScore, { color: textColor }]}>
                                            {isWin ? "3" : "1"} - {isWin ? "1" : "3"}
                                        </Text>
                                        <Text style={[styles.matchType, { color: mutedColor }]}>
                                            Ranked • Best of 5
                                        </Text>
                                    </View>
                                    <Text style={[styles.matchDate, { color: mutedColor }]}>
                                        {i} hari lalu
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Challenge Button */}
                    <TouchableOpacity
                        style={styles.challengeBtn}
                        onPress={() => router.push({ pathname: "/challenge/new", params: { opponentId: displayOpponent.id } })}
                    >
                        <MaterialIcons name="sports-tennis" size={20} color="#fff" />
                        <Text style={styles.challengeBtnText}>Tantang Lagi</Text>
                    </TouchableOpacity>

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
    content: {
        padding: 20,
    },
    vsCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    playerSide: {
        flex: 1,
        alignItems: "center",
    },
    playerAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        marginBottom: 10,
    },
    playerName: {
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    playerMr: {
        fontSize: 12,
        marginTop: 2,
    },
    vsCenter: {
        alignItems: "center",
        marginHorizontal: 16,
    },
    vsBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    vsText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    totalMatches: {
        fontSize: 11,
        marginTop: 8,
    },
    statsCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 20,
    },
    statItem: {
        alignItems: "center",
    },
    statValue: {
        fontSize: 32,
        fontWeight: "bold",
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    winRateSection: {
        marginTop: 4,
    },
    winRateHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    winRateLabel: {
        fontSize: 14,
        fontWeight: "500",
    },
    winRateValue: {
        fontSize: 14,
        fontWeight: "bold",
    },
    winRateBar: {
        height: 8,
        borderRadius: 4,
        overflow: "hidden",
    },
    winRateFill: {
        height: "100%",
        borderRadius: 4,
    },
    historyCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 12,
    },
    matchRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.05)",
    },
    resultBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    matchInfo: {
        flex: 1,
    },
    matchScore: {
        fontSize: 16,
        fontWeight: "bold",
    },
    matchType: {
        fontSize: 12,
        marginTop: 2,
    },
    matchDate: {
        fontSize: 12,
    },
    challengeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
    },
    challengeBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});
