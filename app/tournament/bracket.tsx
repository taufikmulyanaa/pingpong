import React, { useState, useEffect, useCallback, useRef } from "react";
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
    Modal,
    Platform,
    Animated,
    Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { useTournamentStore } from "../../src/stores/tournamentStore";
import {
    generateSingleElimBracket,
    generateDoubleElimBracket,
    generateRoundRobinMatches,
    BracketMatch as GeneratedBracketMatch,
    Participant as GeneratedParticipant,
} from "../../src/lib/bracketGeneration";

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
    bracketSide?: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
    scheduledAt?: string;
    tableNumber?: number;
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
    const [losersBracket, setLosersBracket] = useState<BracketMatch[][]>([]);
    const [grandFinal, setGrandFinal] = useState<BracketMatch | null>(null);
    const [isGenerated, setIsGenerated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

    // Match edit modal states
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [editScore1, setEditScore1] = useState("0");
    const [editScore2, setEditScore2] = useState("0");
    const [editScheduledTime, setEditScheduledTime] = useState("");
    const [editTableNumber, setEditTableNumber] = useState("");
    const [editRefereeId, setEditRefereeId] = useState("");
    const [referees, setReferees] = useState<Participant[]>([]);
    const [updatingMatch, setUpdatingMatch] = useState(false);

    // Double elim bracket tab
    const [bracketTab, setBracketTab] = useState<'winners' | 'losers' | 'grand'>('winners');

    // Live match pulse animation
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.start();
        return () => pulseAnimation.stop();
    }, []);

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

    // Realtime subscription for live score updates
    useEffect(() => {
        if (!tournamentId) return;

        const channel = supabase
            .channel(`tournament_matches_${tournamentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tournament_matches',
                    filter: `tournament_id=eq.${tournamentId}`,
                },
                async (payload) => {
                    console.log('Realtime update:', payload);
                    // Refresh matches when any change occurs
                    await fetchMatches(tournamentId);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tournamentId]);

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
            const { error } = await (supabase
                .from("tournament_matches") as any)
                .update({
                    winner_id: winnerId,
                    player1_score: score1,
                    player2_score: score2,
                    status: "COMPLETED",
                    completed_at: new Date().toISOString(),
                })
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

    // Open match edit modal
    const openMatchEditModal = (match: BracketMatch) => {
        setSelectedMatch(match);
        setEditScore1(String(match.score1 || 0));
        setEditScore2(String(match.score2 || 0));
        setEditScheduledTime(match.scheduledAt || "");
        setEditTableNumber(String(match.tableNumber || ""));
        setEditRefereeId("");
        setShowMatchModal(true);
    };

    // Save match details (schedule, referee, score)
    const handleSaveMatchDetails = async () => {
        if (!selectedMatch || !tournamentId) return;

        setUpdatingMatch(true);
        try {
            const score1 = parseInt(editScore1) || 0;
            const score2 = parseInt(editScore2) || 0;
            const winnerId = score1 > score2 ? selectedMatch.player1?.id :
                score2 > score1 ? selectedMatch.player2?.id : null;

            const updateData: any = {
                player1_score: score1,
                player2_score: score2,
                table_number: editTableNumber ? parseInt(editTableNumber) : null,
            };

            // Only set winner if scores are different
            if (winnerId && score1 !== score2) {
                updateData.winner_id = winnerId;
                updateData.status = "COMPLETED";
                updateData.completed_at = new Date().toISOString();
            }

            // Set scheduled time
            if (editScheduledTime) {
                updateData.scheduled_at = editScheduledTime;
            }

            // Set referee
            if (editRefereeId) {
                updateData.referee_id = editRefereeId;
            }

            const { error } = await (supabase
                .from("tournament_matches") as any)
                .update(updateData)
                .eq("id", selectedMatch.id);

            if (error) throw error;

            await fetchMatches(tournamentId);
            setShowMatchModal(false);
            Alert.alert("Berhasil", "Detail pertandingan berhasil diperbarui!");
        } catch (err) {
            console.error("Save error:", err);
            Alert.alert("Error", "Gagal menyimpan detail");
        } finally {
            setUpdatingMatch(false);
        }
    };

    // Set match to in progress
    const handleStartMatch = async () => {
        if (!selectedMatch || !tournamentId) return;

        try {
            await (supabase
                .from("tournament_matches") as any)
                .update({
                    status: "IN_PROGRESS",
                    started_at: new Date().toISOString(),
                })
                .eq("id", selectedMatch.id);

            await fetchMatches(tournamentId);
            setShowMatchModal(false);
            Alert.alert("Berhasil", "Pertandingan dimulai!");
        } catch (err) {
            Alert.alert("Error", "Gagal memulai pertandingan");
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
                                        onPress={() => isOrganizer && !match.isBye && openMatchEditModal(match)}
                                        disabled={!isOrganizer || match.isBye}
                                    >
                                        {/* Time & Table indicator */}
                                        {(match.scheduledAt || match.tableNumber) && (
                                            <View style={styles.matchMeta}>
                                                {match.scheduledAt && (
                                                    <Text style={styles.matchTime}>
                                                        {new Date(match.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                )}
                                                {match.tableNumber && (
                                                    <Text style={styles.matchTable}>Meja {match.tableNumber}</Text>
                                                )}
                                            </View>
                                        )}
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
                                        {/* LIVE Indicator - show when match is in progress (players set, no winner yet) */}
                                        {!match.isBye && match.player1 && match.player2 && !match.winner && (match.score1 > 0 || match.score2 > 0) && (
                                            <Animated.View style={[styles.liveBadge, { opacity: pulseAnim }]}>
                                                <Text style={styles.liveText}>● LIVE</Text>
                                            </Animated.View>
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
                                        {/* Seed Controls for Organizer */}
                                        {isOrganizer ? (
                                            <View style={styles.seedControls}>
                                                <TouchableOpacity
                                                    style={styles.seedArrow}
                                                    onPress={() => {
                                                        if (index === 0) return;
                                                        const newParticipants = [...participants];
                                                        [newParticipants[index - 1], newParticipants[index]] =
                                                            [newParticipants[index], newParticipants[index - 1]];
                                                        setParticipants(newParticipants);
                                                    }}
                                                    disabled={index === 0}
                                                >
                                                    <MaterialIcons
                                                        name="arrow-drop-up"
                                                        size={24}
                                                        color={index === 0 ? borderColor : Colors.primary}
                                                    />
                                                </TouchableOpacity>
                                                <View style={[styles.seedBadge, { backgroundColor: Colors.blueLight }]}>
                                                    <Text style={styles.seedText}>{index + 1}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.seedArrow}
                                                    onPress={() => {
                                                        if (index === participants.length - 1) return;
                                                        const newParticipants = [...participants];
                                                        [newParticipants[index], newParticipants[index + 1]] =
                                                            [newParticipants[index + 1], newParticipants[index]];
                                                        setParticipants(newParticipants);
                                                    }}
                                                    disabled={index === participants.length - 1}
                                                >
                                                    <MaterialIcons
                                                        name="arrow-drop-down"
                                                        size={24}
                                                        color={index === participants.length - 1 ? borderColor : Colors.primary}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={[styles.seedBadge, { backgroundColor: Colors.blueLight }]}>
                                                <Text style={styles.seedText}>{index + 1}</Text>
                                            </View>
                                        )}
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
                            <View style={{ flexDirection: "row", gap: 12 }}>
                                {/* Print Button */}
                                <TouchableOpacity
                                    style={[styles.printBtn, { borderColor }]}
                                    onPress={() => {
                                        Alert.alert(
                                            "Print Bracket",
                                            "Buka versi cetak bracket di browser?",
                                            [
                                                { text: "Batal", style: "cancel" },
                                                {
                                                    text: "Buka",
                                                    onPress: () => {
                                                        // In production: generate HTML and open in WebView/browser
                                                        Alert.alert("Info", "Gunakan tombol Export HTML di Stats tab untuk mencetak bracket");
                                                    }
                                                },
                                            ]
                                        );
                                    }}
                                >
                                    <MaterialIcons name="print" size={18} color={textColor} />
                                    <Text style={[styles.printBtnText, { color: textColor }]}>Print</Text>
                                </TouchableOpacity>
                                {/* Save Button */}
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

            {/* Match Edit Modal */}
            <Modal visible={showMatchModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Edit Pertandingan</Text>
                            <TouchableOpacity onPress={() => setShowMatchModal(false)}>
                                <MaterialIcons name="close" size={24} color={mutedColor} />
                            </TouchableOpacity>
                        </View>

                        {selectedMatch && (
                            <ScrollView style={styles.modalBody}>
                                {/* Players */}
                                <View style={[styles.playersCard, { backgroundColor: cardColor }]}>
                                    <Text style={[styles.playerLabel, { color: textColor }]}>
                                        {selectedMatch.player1?.name || "TBD"}
                                    </Text>
                                    <Text style={{ color: mutedColor }}>vs</Text>
                                    <Text style={[styles.playerLabel, { color: textColor }]}>
                                        {selectedMatch.player2?.name || "TBD"}
                                    </Text>
                                </View>

                                {/* Score Inputs */}
                                <Text style={[styles.inputLabel, { color: textColor }]}>Skor</Text>
                                <View style={styles.scoreRow}>
                                    <TextInput
                                        style={[styles.scoreInput, { backgroundColor: cardColor, color: textColor }]}
                                        value={editScore1}
                                        onChangeText={setEditScore1}
                                        keyboardType="numeric"
                                        placeholder="0"
                                    />
                                    <Text style={[styles.scoreSeparator, { color: mutedColor }]}>-</Text>
                                    <TextInput
                                        style={[styles.scoreInput, { backgroundColor: cardColor, color: textColor }]}
                                        value={editScore2}
                                        onChangeText={setEditScore2}
                                        keyboardType="numeric"
                                        placeholder="0"
                                    />
                                </View>

                                {/* Table Number */}
                                <Text style={[styles.inputLabel, { color: textColor }]}>Nomor Meja</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
                                    value={editTableNumber}
                                    onChangeText={setEditTableNumber}
                                    keyboardType="numeric"
                                    placeholder="Contoh: 1"
                                    placeholderTextColor={mutedColor}
                                />

                                {/* Scheduled Time (simple text for now) */}
                                <Text style={[styles.inputLabel, { color: textColor }]}>Jadwal (Format: YYYY-MM-DD HH:MM)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
                                    value={editScheduledTime}
                                    onChangeText={setEditScheduledTime}
                                    placeholder="2024-12-20 10:00"
                                    placeholderTextColor={mutedColor}
                                />

                                {/* Action Buttons */}
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
                                        onPress={handleStartMatch}
                                    >
                                        <MaterialIcons name="play-arrow" size={20} color="#fff" />
                                        <Text style={styles.actionBtnText}>Mulai</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                                        onPress={handleSaveMatchDetails}
                                        disabled={updatingMatch}
                                    >
                                        {updatingMatch ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <MaterialIcons name="save" size={20} color="#fff" />
                                                <Text style={styles.actionBtnText}>Simpan</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
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
    // Match card metadata
    matchMeta: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#F3F4F6" },
    matchTime: { fontSize: 10, color: "#6B7280", fontWeight: "500" },
    matchTable: { fontSize: 10, color: "#6B7280" },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%", minHeight: "40%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    modalTitle: { fontSize: 18, fontWeight: "bold" },
    modalBody: { padding: 16 },
    playersCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, marginBottom: 20 },
    playerLabel: { fontSize: 16, fontWeight: "600", flex: 1, textAlign: "center" },
    inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 12 },
    input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15 },
    scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
    scoreInput: { width: 80, height: 60, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, fontSize: 28, fontWeight: "bold", textAlign: "center" },
    scoreSeparator: { fontSize: 24, fontWeight: "bold" },
    modalActions: { flexDirection: "row", gap: 12, marginTop: 24, marginBottom: 20 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 12, gap: 8 },
    actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    // LIVE indicator
    liveBadge: { position: "absolute", top: 2, left: 2, backgroundColor: "#EF4444", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center" },
    liveText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
    // Bracket tabs for double elimination
    bracketTabs: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    bracketTabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    bracketTabText: { fontSize: 13, fontWeight: "600" },
    losersBracketLabel: { fontSize: 12, fontWeight: "600", color: "#EF4444", textAlign: "center", marginBottom: 8, marginTop: 16 },
    grandFinalCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: "#F59E0B" },
    grandFinalTitle: { fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 12, color: "#F59E0B" },
    // Seed controls
    seedControls: { flexDirection: "column", alignItems: "center", marginRight: 8 },
    seedArrow: { padding: 2 },
    // Print button
    printBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    printBtnText: { fontSize: 12, fontWeight: "500" },
});
