import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors } from "../lib/constants";
import { supabase } from "../lib/supabase";

interface TournamentStatsData {
    totalMatches: number;
    completedMatches: number;
    pendingMatches: number;
    inProgressMatches: number;
    totalParticipants: number;
    checkedInParticipants: number;
    avgScore: number;
    highestScore: number;
    longestMatch: { player1: string; player2: string; score: string } | null;
    biggestUpset: { winner: string; loser: string; winnerMR: number; loserMR: number } | null;
}

interface Props {
    tournamentId: string;
}

export default function TournamentStats({ tournamentId }: Props) {
    const [stats, setStats] = useState<TournamentStatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [tournamentId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch matches
            const { data: matches } = await (supabase
                .from("tournament_matches") as any)
                .select(`
                    id, status, player1_score, player2_score, winner_id,
                    player1:player1_id (name, rating_mr),
                    player2:player2_id (name, rating_mr)
                `)
                .eq("tournament_id", tournamentId);

            // Fetch participants
            const { data: participants } = await (supabase
                .from("tournament_participants") as any)
                .select("id, check_in_status")
                .eq("tournament_id", tournamentId);

            if (matches && participants) {
                const completedMatches = matches.filter((m: any) => m.status === 'COMPLETED' && !m.is_bye);
                const scores = completedMatches.flatMap((m: any) => [m.player1_score, m.player2_score]);
                const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
                const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

                // Find longest match (most total sets/games)
                let longestMatch: { player1: string; player2: string; score: string } | null = null;
                let maxTotalScore = 0;
                completedMatches.forEach((m: any) => {
                    const total = m.player1_score + m.player2_score;
                    if (total > maxTotalScore) {
                        maxTotalScore = total;
                        longestMatch = {
                            player1: m.player1?.name || 'Unknown',
                            player2: m.player2?.name || 'Unknown',
                            score: `${m.player1_score} - ${m.player2_score}`,
                        };
                    }
                });

                // Find biggest upset (biggest MR difference where lower MR won)
                let biggestUpset: { winner: string; loser: string; winnerMR: number; loserMR: number } | null = null;
                let maxMRDiff = 0;
                completedMatches.forEach((m: any) => {
                    if (m.winner_id && m.player1 && m.player2) {
                        const winner = m.winner_id === m.player1_id ? m.player1 : m.player2;
                        const loser = m.winner_id === m.player1_id ? m.player2 : m.player1;
                        const mrDiff = loser.rating_mr - winner.rating_mr;

                        if (mrDiff > maxMRDiff) {
                            maxMRDiff = mrDiff;
                            biggestUpset = {
                                winner: winner.name,
                                loser: loser.name,
                                winnerMR: winner.rating_mr,
                                loserMR: loser.rating_mr,
                            };
                        }
                    }
                });

                setStats({
                    totalMatches: matches.filter((m: any) => !m.is_bye).length,
                    completedMatches: completedMatches.length,
                    pendingMatches: matches.filter((m: any) => m.status === 'PENDING' && !m.is_bye).length,
                    inProgressMatches: matches.filter((m: any) => m.status === 'IN_PROGRESS').length,
                    totalParticipants: participants.length,
                    checkedInParticipants: participants.filter((p: any) => p.check_in_status === 'CHECKED_IN').length,
                    avgScore: Math.round(avgScore * 10) / 10,
                    highestScore,
                    longestMatch,
                    biggestUpset: maxMRDiff > 100 ? biggestUpset : null, // Only show if MR diff > 100
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <View style={styles.container}>
                <Text style={styles.loading}>Memuat statistik...</Text>
            </View>
        );
    }

    const progress = stats.totalMatches > 0
        ? Math.round((stats.completedMatches / stats.totalMatches) * 100)
        : 0;

    return (
        <View style={styles.container}>
            {/* Progress Bar */}
            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress Turnamen</Text>
                    <Text style={styles.progressPercent}>{progress}%</Text>
                </View>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressSubtext}>
                    {stats.completedMatches} dari {stats.totalMatches} pertandingan selesai
                </Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <MaterialIcons name="sports-tennis" size={24} color={Colors.primary} />
                    <Text style={styles.statValue}>{stats.totalMatches}</Text>
                    <Text style={styles.statLabel}>Total Match</Text>
                </View>
                <View style={styles.statCard}>
                    <MaterialIcons name="check-circle" size={24} color="#10B981" />
                    <Text style={styles.statValue}>{stats.completedMatches}</Text>
                    <Text style={styles.statLabel}>Selesai</Text>
                </View>
                <View style={styles.statCard}>
                    <MaterialIcons name="play-circle" size={24} color="#3B82F6" />
                    <Text style={styles.statValue}>{stats.inProgressMatches}</Text>
                    <Text style={styles.statLabel}>Berlangsung</Text>
                </View>
                <View style={styles.statCard}>
                    <MaterialIcons name="schedule" size={24} color="#F59E0B" />
                    <Text style={styles.statValue}>{stats.pendingMatches}</Text>
                    <Text style={styles.statLabel}>Menunggu</Text>
                </View>
            </View>

            {/* Score Stats */}
            <View style={styles.scoreStats}>
                <View style={styles.scoreStatItem}>
                    <Text style={styles.scoreStatLabel}>Rata-rata Skor</Text>
                    <Text style={styles.scoreStatValue}>{stats.avgScore}</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreStatItem}>
                    <Text style={styles.scoreStatLabel}>Skor Tertinggi</Text>
                    <Text style={styles.scoreStatValue}>{stats.highestScore}</Text>
                </View>
            </View>

            {/* Highlights */}
            {stats.longestMatch && (
                <View style={[styles.highlightCard, { backgroundColor: "#EFF6FF" }]}>
                    <MaterialIcons name="hourglass-full" size={20} color="#3B82F6" />
                    <View style={styles.highlightContent}>
                        <Text style={styles.highlightTitle}>Pertandingan Terlama</Text>
                        <Text style={styles.highlightText}>
                            {stats.longestMatch.player1} vs {stats.longestMatch.player2}
                        </Text>
                        <Text style={styles.highlightScore}>{stats.longestMatch.score}</Text>
                    </View>
                </View>
            )}

            {stats.biggestUpset && (
                <View style={[styles.highlightCard, { backgroundColor: "#FEF3C7" }]}>
                    <MaterialIcons name="trending-up" size={20} color="#D97706" />
                    <View style={styles.highlightContent}>
                        <Text style={styles.highlightTitle}>Upset Terbesar</Text>
                        <Text style={styles.highlightText}>
                            {stats.biggestUpset.winner} (MR {stats.biggestUpset.winnerMR}) mengalahkan
                        </Text>
                        <Text style={styles.highlightText}>
                            {stats.biggestUpset.loser} (MR {stats.biggestUpset.loserMR})
                        </Text>
                    </View>
                </View>
            )}

            {/* Participation */}
            <View style={styles.participationCard}>
                <MaterialIcons name="people" size={24} color={Colors.primary} />
                <View style={styles.participationInfo}>
                    <Text style={styles.participationTitle}>Kehadiran</Text>
                    <Text style={styles.participationValue}>
                        {stats.checkedInParticipants}/{stats.totalParticipants} check-in
                    </Text>
                </View>
                <View style={styles.participationBadge}>
                    <Text style={styles.participationPercent}>
                        {stats.totalParticipants > 0
                            ? Math.round((stats.checkedInParticipants / stats.totalParticipants) * 100)
                            : 0}%
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    loading: { color: Colors.muted, textAlign: "center", padding: 20 },
    progressSection: { marginBottom: 20 },
    progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    progressLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
    progressPercent: { fontSize: 14, fontWeight: "bold", color: Colors.primary },
    progressBar: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: Colors.primary,
        borderRadius: 4,
    },
    progressSubtext: { fontSize: 12, color: Colors.muted, marginTop: 4 },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        width: "47%",
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statValue: { fontSize: 24, fontWeight: "bold", color: Colors.text, marginTop: 8 },
    statLabel: { fontSize: 12, color: Colors.muted, marginTop: 4 },
    scoreStats: {
        flexDirection: "row",
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    scoreStatItem: { flex: 1, alignItems: "center" },
    scoreStatLabel: { fontSize: 12, color: Colors.muted },
    scoreStatValue: { fontSize: 20, fontWeight: "bold", color: Colors.primary, marginTop: 4 },
    scoreDivider: { width: 1, backgroundColor: "#E5E7EB" },
    highlightCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        marginBottom: 12,
    },
    highlightContent: { flex: 1 },
    highlightTitle: { fontSize: 13, fontWeight: "600", color: Colors.text },
    highlightText: { fontSize: 12, color: Colors.muted, marginTop: 2 },
    highlightScore: { fontSize: 14, fontWeight: "bold", color: Colors.text, marginTop: 4 },
    participationCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    participationInfo: { flex: 1 },
    participationTitle: { fontSize: 12, color: Colors.muted },
    participationValue: { fontSize: 14, fontWeight: "600", color: Colors.text, marginTop: 2 },
    participationBadge: {
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    participationPercent: { fontSize: 14, fontWeight: "bold", color: "#059669" },
});
