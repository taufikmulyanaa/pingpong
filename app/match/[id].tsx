import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    Alert,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";
import { useMatchStore } from "../../src/stores/matchStore";
import { supabase } from "../../src/lib/supabase";

export default function MatchScoringScreen() {
    const router = useRouter();
    const { id: matchId } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { currentMatch, fetchMatch, updateMatchScore, completeMatch } = useMatchStore();

    const [currentSet, setCurrentSet] = useState(1);
    const [player1Score, setPlayer1Score] = useState(0);
    const [player2Score, setPlayer2Score] = useState(0);
    const [player1Sets, setPlayer1Sets] = useState(0);
    const [player2Sets, setPlayer2Sets] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const bestOf = currentMatch?.best_of || 5;
    const setsToWin = Math.ceil(bestOf / 2);

    useEffect(() => {
        if (matchId) {
            fetchMatch(matchId);
        }
    }, [matchId]);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!matchId) return;

        const channel = supabase
            .channel(`match:${matchId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "match_sets",
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    // Refresh match data on changes
                    fetchMatch(matchId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]);

    const handleScoreChange = async (player: 1 | 2, delta: number) => {
        if (player === 1) {
            const newScore = Math.max(0, player1Score + delta);
            setPlayer1Score(newScore);
        } else {
            const newScore = Math.max(0, player2Score + delta);
            setPlayer2Score(newScore);
        }
    };

    const checkSetWinner = () => {
        const minScore = 11;
        const scoreDiff = Math.abs(player1Score - player2Score);

        if ((player1Score >= minScore || player2Score >= minScore) && scoreDiff >= 2) {
            if (player1Score > player2Score) {
                return 1;
            } else {
                return 2;
            }
        }
        return null;
    };

    const handleEndSet = async () => {
        const winner = checkSetWinner();
        if (!winner) {
            Alert.alert("Set Belum Selesai", "Minimal 11 poin dengan selisih 2 untuk menang set");
            return;
        }

        setIsLoading(true);

        // Save set score
        await updateMatchScore(matchId!, currentSet, player1Score, player2Score);

        // Update set counts
        const newP1Sets = winner === 1 ? player1Sets + 1 : player1Sets;
        const newP2Sets = winner === 2 ? player2Sets + 1 : player2Sets;

        setPlayer1Sets(newP1Sets);
        setPlayer2Sets(newP2Sets);

        // Check for match winner
        if (newP1Sets >= setsToWin || newP2Sets >= setsToWin) {
            const matchWinnerId = newP1Sets >= setsToWin
                ? currentMatch?.player1_id
                : currentMatch?.player2_id;

            await completeMatch(matchId!, matchWinnerId!);

            Alert.alert(
                "Pertandingan Selesai!",
                `${newP1Sets >= setsToWin ? (currentMatch?.player1 as any)?.name : (currentMatch?.player2 as any)?.name} menang!`,
                [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
            );
        } else {
            // Next set
            setCurrentSet(currentSet + 1);
            setPlayer1Score(0);
            setPlayer2Score(0);
        }

        setIsLoading(false);
    };

    const player1 = currentMatch?.player1 as any;
    const player2 = currentMatch?.player2 as any;

    if (!currentMatch) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Text style={[styles.loadingText, { color: textColor }]}>Loading match...</Text>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: `Set ${currentSet}`,
                    headerStyle: { backgroundColor: Colors.navyDeep },
                    headerTintColor: "#fff",
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                {/* Match Type Badge */}
                <View style={styles.matchTypeBadge}>
                    <MaterialIcons
                        name={currentMatch.type === "RANKED" ? "emoji-events" : "sports-tennis"}
                        size={16}
                        color="#fff"
                    />
                    <Text style={styles.matchTypeText}>
                        {currentMatch.type === "RANKED" ? "Ranked Match" : "Friendly Match"} • Best of {bestOf}
                    </Text>
                </View>

                {/* Set Score */}
                <View style={styles.setScore}>
                    <View style={styles.setScoreItem}>
                        <Text style={[styles.setScoreNumber, player1Sets > player2Sets && styles.setScoreWinning]}>
                            {player1Sets}
                        </Text>
                    </View>
                    <Text style={styles.setScoreSeparator}>:</Text>
                    <View style={styles.setScoreItem}>
                        <Text style={[styles.setScoreNumber, player2Sets > player1Sets && styles.setScoreWinning]}>
                            {player2Sets}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.setLabel, { color: mutedColor }]}>Set Score</Text>

                {/* Score Cards */}
                <View style={styles.scoreCards}>
                    {/* Player 1 */}
                    <View style={[styles.scoreCard, { backgroundColor: cardColor }]}>
                        <Image
                            source={{ uri: player1?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player1?.name || "P1")}&background=009688&color=fff` }}
                            style={styles.playerAvatar}
                        />
                        <Text style={[styles.playerName, { color: textColor }]} numberOfLines={1}>
                            {player1?.name || "Player 1"}
                        </Text>
                        <Text style={[styles.playerMr, { color: mutedColor }]}>
                            MR {player1?.rating_mr || 1000}
                        </Text>

                        <View style={styles.scoreContainer}>
                            <TouchableOpacity
                                style={styles.scoreBtn}
                                onPress={() => handleScoreChange(1, -1)}
                            >
                                <MaterialIcons name="remove" size={24} color={Colors.primary} />
                            </TouchableOpacity>

                            <Text style={[styles.scoreNumber, { color: Colors.primary }]}>
                                {player1Score}
                            </Text>

                            <TouchableOpacity
                                style={[styles.scoreBtn, styles.scoreBtnAdd]}
                                onPress={() => handleScoreChange(1, 1)}
                            >
                                <MaterialIcons name="add" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* VS Divider */}
                    <View style={styles.vsDivider}>
                        <Text style={styles.vsText}>VS</Text>
                    </View>

                    {/* Player 2 */}
                    <View style={[styles.scoreCard, { backgroundColor: cardColor }]}>
                        <Image
                            source={{ uri: player2?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player2?.name || "P2")}&background=random` }}
                            style={styles.playerAvatar}
                        />
                        <Text style={[styles.playerName, { color: textColor }]} numberOfLines={1}>
                            {player2?.name || "Player 2"}
                        </Text>
                        <Text style={[styles.playerMr, { color: mutedColor }]}>
                            MR {player2?.rating_mr || 1000}
                        </Text>

                        <View style={styles.scoreContainer}>
                            <TouchableOpacity
                                style={styles.scoreBtn}
                                onPress={() => handleScoreChange(2, -1)}
                            >
                                <MaterialIcons name="remove" size={24} color={Colors.secondary} />
                            </TouchableOpacity>

                            <Text style={[styles.scoreNumber, { color: Colors.secondary }]}>
                                {player2Score}
                            </Text>

                            <TouchableOpacity
                                style={[styles.scoreBtn, styles.scoreBtnAdd, { backgroundColor: Colors.secondary }]}
                                onPress={() => handleScoreChange(2, 1)}
                            >
                                <MaterialIcons name="add" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* End Set Button */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.endSetBtn, isLoading && styles.endSetBtnDisabled]}
                        onPress={handleEndSet}
                        disabled={isLoading}
                    >
                        <MaterialIcons name="check-circle" size={20} color="#fff" />
                        <Text style={styles.endSetBtnText}>
                            {isLoading ? "Menyimpan..." : "Akhiri Set"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Scoring Info */}
                <View style={[styles.infoCard, { backgroundColor: `${Colors.blueMid}10` }]}>
                    <MaterialIcons name="info" size={16} color={Colors.blueMid} />
                    <Text style={[styles.infoText, { color: mutedColor }]}>
                        Menang set: 11 poin (atau lebih) dengan selisih minimal 2 poin
                    </Text>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingText: {
        textAlign: "center",
        marginTop: 100,
        fontSize: 16,
    },
    matchTypeBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.navyDeep,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    matchTypeText: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 14,
        fontWeight: "500",
    },
    setScore: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 24,
    },
    setScoreItem: {
        width: 48,
        alignItems: "center",
    },
    setScoreNumber: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#9CA3AF",
    },
    setScoreWinning: {
        color: Colors.primary,
    },
    setScoreSeparator: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#9CA3AF",
        marginHorizontal: 8,
    },
    setLabel: {
        textAlign: "center",
        fontSize: 12,
        marginTop: -12,
        marginBottom: 24,
    },
    scoreCards: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
    },
    scoreCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    playerAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 12,
    },
    playerName: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    playerMr: {
        fontSize: 12,
        marginBottom: 16,
    },
    scoreContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    scoreBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.05)",
        justifyContent: "center",
        alignItems: "center",
    },
    scoreBtnAdd: {
        backgroundColor: Colors.primary,
    },
    scoreNumber: {
        fontSize: 48,
        fontWeight: "bold",
        minWidth: 60,
        textAlign: "center",
    },
    vsDivider: {
        justifyContent: "center",
        alignItems: "center",
    },
    vsText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#9CA3AF",
    },
    actions: {
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    endSetBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
    },
    endSetBtnDisabled: {
        opacity: 0.7,
    },
    endSetBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginHorizontal: 20,
        padding: 12,
        borderRadius: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
    },
});
