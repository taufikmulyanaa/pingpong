import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Switch,
    Alert,
    ActivityIndicator,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { useTournamentStore } from "../../src/stores/tournamentStore";

type BracketFormat = "SINGLE_ELIM" | "DOUBLE_ELIM";

interface Participant {
    id: string;
    name: string;
    seed?: number;
    avatar_url?: string | null;
    rating_mr?: number;
}

interface BracketMatch {
    id: string;
    round: number;
    matchNumber: number;
    player1: Participant | null;
    player2: Participant | null;
    winner: Participant | null;
    score1: number;
    score2: number;
    nextMatchId?: string;
    nextMatchSlot?: number;
    isBye: boolean;
}

export default function BracketGeneratorScreen() {
    const router = useRouter();
    const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
    const { user } = useAuthStore();
    const { participants: storeParticipants, fetchParticipants, fetchMatches, matches: storeMatches, saveBracket: storeSaveBracket } = useTournamentStore();

    // States
    const [format, setFormat] = useState<BracketFormat>("SINGLE_ELIM");
    const [slotCount, setSlotCount] = useState(8);
    const [thirdPlaceMatch, setThirdPlaceMatch] = useState(false);
    const [randomize, setRandomize] = useState(true);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [newParticipantName, setNewParticipantName] = useState("");
    const [bracket, setBracket] = useState<BracketMatch[][]>([]);
    const [isGenerated, setIsGenerated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

    // Colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const SLOT_OPTIONS = [4, 8, 16, 32, 64];

    // Load existing data
    useEffect(() => {
        const loadData = async () => {
            if (!tournamentId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Check if user is organizer
                const { data: tournament } = await supabase
                    .from("tournaments")
                    .select("organizer_id, max_participants")
                    .eq("id", tournamentId)
                    .single();

                if (tournament) {
                    setIsOrganizer((tournament as any).organizer_id === user?.id);
                    // Set slot count based on tournament max participants
                    const validSlots = SLOT_OPTIONS.find(s => s >= (tournament as any).max_participants) || 16;
                    setSlotCount(validSlots);
                }

                // Fetch participants
                await fetchParticipants(tournamentId);

                // Fetch existing matches
                await fetchMatches(tournamentId);
            } catch (err) {
                console.error("Error loading data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [tournamentId, user?.id]);

    // Convert store participants to local format
    useEffect(() => {
        if (storeParticipants.length > 0) {
            const converted = storeParticipants.map((p, index) => ({
                id: p.profiles.id,
                name: p.profiles.name,
                seed: p.seed || index + 1,
                avatar_url: p.profiles.avatar_url,
                rating_mr: p.profiles.rating_mr,
            }));
            setParticipants(converted);
        }
    }, [storeParticipants]);

    // Load bracket from store matches
    useEffect(() => {
        if (storeMatches.length > 0) {
            const bracketData = reconstructBracket(storeMatches);
            if (bracketData.length > 0) {
                setBracket(bracketData);
                setIsGenerated(true);
            }
        }
    }, [storeMatches]);

    // Reconstruct bracket from database matches
    const reconstructBracket = (matches: typeof storeMatches): BracketMatch[][] => {
        if (matches.length === 0) return [];

        const maxRound = Math.max(...matches.map(m => m.round));
        const bracketRounds: BracketMatch[][] = [];

        for (let r = 1; r <= maxRound; r++) {
            const roundMatches = matches
                .filter(m => m.round === r)
                .sort((a, b) => a.match_number - b.match_number)
                .map(m => ({
                    id: m.id,
                    round: m.round,
                    matchNumber: m.match_number,
                    player1: m.player1 ? { id: m.player1.id, name: m.player1.name, avatar_url: m.player1.avatar_url, rating_mr: m.player1.rating_mr } : null,
                    player2: m.player2 ? { id: m.player2.id, name: m.player2.name, avatar_url: m.player2.avatar_url, rating_mr: m.player2.rating_mr } : null,
                    winner: m.winner_id ? (m.player1?.id === m.winner_id ? { id: m.player1.id, name: m.player1.name } : { id: m.player2!.id, name: m.player2!.name }) : null,
                    score1: m.player1_score,
                    score2: m.player2_score,
                    nextMatchId: m.next_match_id || undefined,
                    nextMatchSlot: m.next_match_slot || undefined,
                    isBye: m.is_bye,
                }));

            bracketRounds.push(roundMatches);
        }

        return bracketRounds;
    };

    // Add participant manually
    const addParticipant = () => {
        if (!newParticipantName.trim()) return;

        const newParticipant: Participant = {
            id: `manual-${Date.now()}`,
            name: newParticipantName.trim(),
            seed: participants.length + 1,
        };

        setParticipants([...participants, newParticipant]);
        setNewParticipantName("");
    };

    const removeParticipant = (id: string) => {
        setParticipants(participants.filter(p => p.id !== id));
    };

    // Generate bracket
    const generateBracket = () => {
        if (participants.length < 2) {
            Alert.alert("Error", "Minimal 2 peserta diperlukan!");
            return;
        }

        let paddedParticipants = [...participants];
        if (randomize) {
            paddedParticipants = paddedParticipants.sort(() => Math.random() - 0.5);
        }

        // Fill with BYE
        while (paddedParticipants.length < slotCount) {
            paddedParticipants.push({ id: `bye-${paddedParticipants.length}`, name: "BYE" });
        }

        const totalRounds = Math.log2(slotCount);
        const newBracket: BracketMatch[][] = [];

        // First round
        const firstRound: BracketMatch[] = [];
        for (let i = 0; i < slotCount / 2; i++) {
            const p1 = paddedParticipants[i * 2];
            const p2 = paddedParticipants[i * 2 + 1];
            const isBye = p1.id.startsWith("bye-") || p2.id.startsWith("bye-");

            firstRound.push({
                id: `r1-m${i + 1}`,
                round: 1,
                matchNumber: i + 1,
                player1: p1.id.startsWith("bye-") ? null : p1,
                player2: p2.id.startsWith("bye-") ? null : p2,
                winner: isBye ? (p1.id.startsWith("bye-") ? p2 : p1) : null,
                score1: 0,
                score2: 0,
                isBye,
            });
        }
        newBracket.push(firstRound);

        // Subsequent rounds
        for (let r = 2; r <= totalRounds; r++) {
            const matchesInRound = slotCount / Math.pow(2, r);
            const round: BracketMatch[] = [];
            for (let i = 0; i < matchesInRound; i++) {
                round.push({
                    id: `r${r}-m${i + 1}`,
                    round: r,
                    matchNumber: i + 1,
                    player1: null,
                    player2: null,
                    winner: null,
                    score1: 0,
                    score2: 0,
                    isBye: false,
                });
            }
            newBracket.push(round);
        }

        // Link matches
        for (let r = 0; r < newBracket.length - 1; r++) {
            for (let m = 0; m < newBracket[r].length; m++) {
                const nextMatchIndex = Math.floor(m / 2);
                const nextMatchSlot = (m % 2) + 1;
                newBracket[r][m].nextMatchId = newBracket[r + 1][nextMatchIndex]?.id;
                newBracket[r][m].nextMatchSlot = nextMatchSlot;

                // Propagate BYE winners
                if (newBracket[r][m].isBye && newBracket[r][m].winner) {
                    const nextMatch = newBracket[r + 1][nextMatchIndex];
                    if (nextMatch) {
                        if (nextMatchSlot === 1) {
                            nextMatch.player1 = newBracket[r][m].winner;
                        } else {
                            nextMatch.player2 = newBracket[r][m].winner;
                        }
                    }
                }
            }
        }

        setBracket(newBracket);
        setIsGenerated(true);
    };

    // Save bracket to database
    const handleSaveBracket = async () => {
        if (!tournamentId || !isOrganizer) {
            Alert.alert("Error", "Anda tidak memiliki akses untuk menyimpan bracket");
            return;
        }

        setSaving(true);
        try {
            const matchData = bracket.flatMap(round =>
                round.map(m => ({
                    tournament_id: tournamentId,
                    round: m.round,
                    match_number: m.matchNumber,
                    player1_id: m.player1?.id?.startsWith("bye-") ? null : m.player1?.id || null,
                    player2_id: m.player2?.id?.startsWith("bye-") ? null : m.player2?.id || null,
                    winner_id: m.winner?.id || null,
                    player1_score: m.score1,
                    player2_score: m.score2,
                    status: m.isBye ? "BYE" : (m.winner ? "COMPLETED" : "PENDING"),
                    is_bye: m.isBye,
                    is_third_place: false,
                    next_match_id: null, // Will be linked after insert
                    next_match_slot: m.nextMatchSlot || null,
                }))
            );

            const { error } = await storeSaveBracket(tournamentId, matchData as any);

            if (error) {
                Alert.alert("Error", "Gagal menyimpan bracket");
            } else {
                Alert.alert("Berhasil", "Bracket berhasil disimpan!");
            }
        } catch (err) {
            console.error("Save error:", err);
            Alert.alert("Error", "Terjadi kesalahan saat menyimpan");
        } finally {
            setSaving(false);
        }
    };

    // Update match result
    const handleUpdateMatch = async (match: BracketMatch, winnerId: string, score1: number, score2: number) => {
        if (!tournamentId) return;

        try {
            const { error } = await supabase
                .from("tournament_matches")
                .update({
                    winner_id: winnerId,
                    player1_score: score1,
                    player2_score: score2,
                    status: "COMPLETED",
                    completed_at: new Date().toISOString(),
                } as any)
                .eq("id", match.id);

            if (error) throw error;

            // Refresh matches
            await fetchMatches(tournamentId);
            Alert.alert("Berhasil", "Hasil pertandingan berhasil disimpan!");
        } catch (err) {
            console.error("Update error:", err);
            Alert.alert("Error", "Gagal menyimpan hasil");
        }
    };

    const getRoundName = (round: number, totalRounds: number): string => {
        if (round === totalRounds) return "Final";
        if (round === totalRounds - 1) return "Semi Final";
        if (round === totalRounds - 2) return "Quarter Final";
        return `Round ${round}`;
    };

    // Render bracket view
    const renderBracket = () => {
        const totalRounds = bracket.length;

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.bracketContainer}>
                    {bracket.map((round, roundIndex) => (
                        <View key={roundIndex} style={styles.roundColumn}>
                            <Text style={[styles.roundTitle, { color: textColor }]}>
                                {getRoundName(roundIndex + 1, totalRounds)}
                            </Text>
                            <View style={styles.matchesColumn}>
                                {round.map((match) => (
                                    <TouchableOpacity
                                        key={match.id}
                                        style={[styles.matchCard, { backgroundColor: cardColor, borderColor }]}
                                        onPress={() => isOrganizer && !match.isBye && setSelectedMatch(match)}
                                        disabled={!isOrganizer || match.isBye}
                                    >
                                        <View style={[styles.matchPlayer, { borderBottomColor: borderColor }]}>
                                            <Text style={[
                                                styles.playerName,
                                                { color: !match.player1 || match.isBye ? mutedColor : textColor },
                                                match.winner?.id === match.player1?.id && styles.winnerText
                                            ]}>
                                                {match.player1?.name || "TBD"}
                                            </Text>
                                            <Text style={[styles.playerScore, { color: textColor }]}>
                                                {match.score1 || 0}
                                            </Text>
                                        </View>
                                        <View style={styles.matchPlayer}>
                                            <Text style={[
                                                styles.playerName,
                                                { color: !match.player2 || match.isBye ? mutedColor : textColor },
                                                match.winner?.id === match.player2?.id && styles.winnerText
                                            ]}>
                                                {match.player2?.name || "TBD"}
                                            </Text>
                                            <Text style={[styles.playerScore, { color: textColor }]}>
                                                {match.score2 || 0}
                                            </Text>
                                        </View>
                                        {match.isBye && (
                                            <View style={styles.byeBadge}>
                                                <Text style={styles.byeText}>BYE</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.loadingText, { color: mutedColor }]}>Memuat bracket...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Bracket Generator",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                {!isGenerated ? (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Format Selection */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Format Bracket</Text>
                            <View style={styles.formatButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.formatBtn,
                                        { backgroundColor: format === "SINGLE_ELIM" ? Colors.primary : cardColor, borderColor: format === "SINGLE_ELIM" ? Colors.primary : borderColor }
                                    ]}
                                    onPress={() => setFormat("SINGLE_ELIM")}
                                >
                                    <MaterialIcons name="format-list-numbered" size={20} color={format === "SINGLE_ELIM" ? "#fff" : textColor} />
                                    <Text style={[styles.formatBtnText, { color: format === "SINGLE_ELIM" ? "#fff" : textColor }]}>Sistem Gugur</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.formatBtn,
                                        { backgroundColor: format === "DOUBLE_ELIM" ? Colors.primary : cardColor, borderColor: format === "DOUBLE_ELIM" ? Colors.primary : borderColor }
                                    ]}
                                    onPress={() => setFormat("DOUBLE_ELIM")}
                                >
                                    <MaterialIcons name="account-tree" size={20} color={format === "DOUBLE_ELIM" ? "#fff" : textColor} />
                                    <Text style={[styles.formatBtnText, { color: format === "DOUBLE_ELIM" ? "#fff" : textColor }]}>Kompetisi Penuh</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Slot Count */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Jumlah Slot</Text>
                            <View style={styles.slotButtons}>
                                {SLOT_OPTIONS.map(num => (
                                    <TouchableOpacity
                                        key={num}
                                        style={[
                                            styles.slotBtn,
                                            { backgroundColor: slotCount === num ? Colors.primary : cardColor, borderColor: slotCount === num ? Colors.primary : borderColor }
                                        ]}
                                        onPress={() => setSlotCount(num)}
                                    >
                                        <Text style={[styles.slotBtnText, { color: slotCount === num ? "#fff" : textColor }]}>{num}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Options */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Opsi</Text>
                            <View style={[styles.optionRow, { borderBottomColor: borderColor }]}>
                                <View style={styles.optionInfo}>
                                    <MaterialIcons name="emoji-events" size={20} color={Colors.primary} />
                                    <Text style={[styles.optionLabel, { color: textColor }]}>Perebutan Juara 3</Text>
                                </View>
                                <Switch value={thirdPlaceMatch} onValueChange={setThirdPlaceMatch} trackColor={{ false: "#E5E7EB", true: Colors.primary }} />
                            </View>
                            <View style={[styles.optionRow, { borderBottomColor: borderColor }]}>
                                <View style={styles.optionInfo}>
                                    <MaterialIcons name="shuffle" size={20} color={Colors.primary} />
                                    <Text style={[styles.optionLabel, { color: textColor }]}>Acak Posisi Peserta</Text>
                                </View>
                                <Switch value={randomize} onValueChange={setRandomize} trackColor={{ false: "#E5E7EB", true: Colors.primary }} />
                            </View>
                        </View>

                        {/* Participants */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Peserta ({participants.length}/{slotCount})</Text>
                            </View>

                            {isOrganizer && (
                                <View style={styles.addParticipant}>
                                    <TextInput
                                        style={[styles.addInput, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                        placeholder="Tambah peserta manual"
                                        placeholderTextColor={mutedColor}
                                        value={newParticipantName}
                                        onChangeText={setNewParticipantName}
                                    />
                                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: Colors.primary }]} onPress={addParticipant}>
                                        <MaterialIcons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.participantsList}>
                                {participants.map((p, index) => (
                                    <View key={p.id} style={[styles.participantItem, { backgroundColor: cardColor, borderColor }]}>
                                        <View style={[styles.seedBadge, { backgroundColor: Colors.blueLight }]}>
                                            <Text style={styles.seedText}>{index + 1}</Text>
                                        </View>
                                        {p.avatar_url ? (
                                            <Image source={{ uri: p.avatar_url }} style={styles.participantAvatar} />
                                        ) : (
                                            <View style={[styles.participantAvatar, { backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" }]}>
                                                <Text style={{ color: "#fff", fontWeight: "bold" }}>{p.name.charAt(0)}</Text>
                                            </View>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.participantName, { color: textColor }]}>{p.name}</Text>
                                            {p.rating_mr && <Text style={{ color: mutedColor, fontSize: 12 }}>MR {p.rating_mr}</Text>}
                                        </View>
                                        {isOrganizer && p.id.startsWith("manual-") && (
                                            <TouchableOpacity onPress={() => removeParticipant(p.id)}>
                                                <MaterialIcons name="close" size={20} color={mutedColor} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                ) : (
                    <View style={styles.bracketView}>
                        <View style={styles.bracketHeader}>
                            <TouchableOpacity onPress={() => setIsGenerated(false)}>
                                <MaterialIcons name="edit" size={24} color={Colors.primary} />
                            </TouchableOpacity>
                            <Text style={[styles.bracketTitle, { color: textColor }]}>
                                Bracket ({slotCount} peserta)
                            </Text>
                            {isOrganizer && (
                                <TouchableOpacity onPress={handleSaveBracket} disabled={saving}>
                                    {saving ? (
                                        <ActivityIndicator size="small" color={Colors.primary} />
                                    ) : (
                                        <MaterialIcons name="save" size={24} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                        {renderBracket()}
                    </View>
                )}

                {/* Generate Button */}
                {!isGenerated && (
                    <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                        <TouchableOpacity
                            style={[styles.generateBtn, { backgroundColor: participants.length >= 2 ? Colors.primary : Colors.muted }]}
                            onPress={generateBracket}
                            disabled={participants.length < 2}
                        >
                            <MaterialIcons name="casino" size={20} color="#fff" />
                            <Text style={styles.generateBtnText}>Generate Bracket</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    content: { padding: 20 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, fontSize: 14 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    formatButtons: { flexDirection: "row", gap: 12 },
    formatBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 10, borderWidth: 1, gap: 8 },
    formatBtnText: { fontSize: 13, fontWeight: "600" },
    slotButtons: { flexDirection: "row", gap: 8 },
    slotBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: "center" },
    slotBtnText: { fontSize: 16, fontWeight: "bold" },
    optionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
    optionInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    optionLabel: { fontSize: 15 },
    addParticipant: { flexDirection: "row", gap: 10, marginBottom: 12 },
    addInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    addBtn: { width: 48, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    participantsList: { gap: 8 },
    participantItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, gap: 12 },
    seedBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    seedText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
    participantAvatar: { width: 36, height: 36, borderRadius: 18 },
    participantName: { fontSize: 15 },
    bottomAction: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
    generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
    generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    bracketView: { flex: 1 },
    bracketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    bracketTitle: { fontSize: 16, fontWeight: "600" },
    bracketContainer: { flexDirection: "row", padding: 16 },
    roundColumn: { marginRight: 20, minWidth: 150 },
    roundTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12, textAlign: "center" },
    matchesColumn: { gap: 20 },
    matchCard: { borderRadius: 8, borderWidth: 1, overflow: "hidden", position: "relative" },
    matchPlayer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderBottomWidth: 1 },
    playerName: { fontSize: 13, flex: 1 },
    playerScore: { fontSize: 14, fontWeight: "bold", marginLeft: 8, minWidth: 20, textAlign: "center" },
    winnerText: { fontWeight: "bold", color: "#10B981" },
    byeBadge: { position: "absolute", top: 2, right: 2, backgroundColor: "#F59E0B", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
    byeText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
});
