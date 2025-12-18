import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Switch,
    Modal,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";

type BracketFormat = "SINGLE_ELIM" | "DOUBLE_ELIM";

interface Participant {
    id: string;
    name: string;
    seed?: number;
}

interface Match {
    id: string;
    round: number;
    matchNumber: number;
    player1: Participant | null;
    player2: Participant | null;
    winner: Participant | null;
    score1?: number;
    score2?: number;
}

export default function BracketGeneratorScreen() {
    const router = useRouter();
    const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();

    // Settings state
    const [format, setFormat] = useState<BracketFormat>("SINGLE_ELIM");
    const [slotCount, setSlotCount] = useState(8);
    const [thirdPlaceMatch, setThirdPlaceMatch] = useState(false);
    const [randomize, setRandomize] = useState(true);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [newParticipantName, setNewParticipantName] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [bracket, setBracket] = useState<Match[][]>([]);
    const [isGenerated, setIsGenerated] = useState(false);

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const SLOT_OPTIONS = [4, 8, 16, 32, 64];

    const addParticipant = () => {
        if (!newParticipantName.trim()) return;

        const newParticipant: Participant = {
            id: Date.now().toString(),
            name: newParticipantName.trim(),
            seed: participants.length + 1,
        };

        setParticipants([...participants, newParticipant]);
        setNewParticipantName("");
    };

    const removeParticipant = (id: string) => {
        setParticipants(participants.filter(p => p.id !== id));
    };

    const handleImportCSV = () => {
        // Feature to be implemented
        alert("Fitur import CSV akan segera tersedia!");
    };

    const generateBracket = () => {
        if (participants.length < 2) {
            alert("Minimal 2 peserta diperlukan!");
            return;
        }

        // Pad participants to nearest power of 2
        let paddedParticipants = [...participants];
        if (randomize) {
            paddedParticipants = paddedParticipants.sort(() => Math.random() - 0.5);
        }

        // Fill empty slots with BYE
        while (paddedParticipants.length < slotCount) {
            paddedParticipants.push({ id: `bye-${paddedParticipants.length}`, name: "BYE" });
        }

        // Calculate rounds
        const totalRounds = Math.log2(slotCount);
        const newBracket: Match[][] = [];

        // First round
        const firstRound: Match[] = [];
        for (let i = 0; i < slotCount / 2; i++) {
            firstRound.push({
                id: `r1-m${i + 1}`,
                round: 1,
                matchNumber: i + 1,
                player1: paddedParticipants[i * 2] || null,
                player2: paddedParticipants[i * 2 + 1] || null,
                winner: null,
            });
        }
        newBracket.push(firstRound);

        // Subsequent rounds
        for (let r = 2; r <= totalRounds; r++) {
            const matchesInRound = slotCount / Math.pow(2, r);
            const round: Match[] = [];
            for (let i = 0; i < matchesInRound; i++) {
                round.push({
                    id: `r${r}-m${i + 1}`,
                    round: r,
                    matchNumber: i + 1,
                    player1: null,
                    player2: null,
                    winner: null,
                });
            }
            newBracket.push(round);
        }

        setBracket(newBracket);
        setIsGenerated(true);
    };

    const getRoundName = (round: number, totalRounds: number): string => {
        if (round === totalRounds) return "Final";
        if (round === totalRounds - 1) return "Semi Final";
        if (round === totalRounds - 2) return "Quarter Final";
        return `Round ${round}`;
    };

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
                                {round.map((match, matchIndex) => (
                                    <View
                                        key={match.id}
                                        style={[styles.matchCard, { backgroundColor: cardColor, borderColor }]}
                                    >
                                        <View style={[styles.matchPlayer, { borderBottomColor: borderColor }]}>
                                            <Text style={[styles.playerName, { color: match.player1?.name === "BYE" ? mutedColor : textColor }]}>
                                                {match.player1?.name || "TBD"}
                                            </Text>
                                            {match.score1 !== undefined && (
                                                <Text style={[styles.playerScore, { color: textColor }]}>{match.score1}</Text>
                                            )}
                                        </View>
                                        <View style={styles.matchPlayer}>
                                            <Text style={[styles.playerName, { color: match.player2?.name === "BYE" ? mutedColor : textColor }]}>
                                                {match.player2?.name || "TBD"}
                                            </Text>
                                            {match.score2 !== undefined && (
                                                <Text style={[styles.playerScore, { color: textColor }]}>{match.score2}</Text>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

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
                                        {
                                            backgroundColor: format === "SINGLE_ELIM" ? Colors.primary : cardColor,
                                            borderColor: format === "SINGLE_ELIM" ? Colors.primary : borderColor,
                                        }
                                    ]}
                                    onPress={() => setFormat("SINGLE_ELIM")}
                                >
                                    <MaterialIcons
                                        name="format-list-numbered"
                                        size={20}
                                        color={format === "SINGLE_ELIM" ? "#fff" : textColor}
                                    />
                                    <Text style={[
                                        styles.formatBtnText,
                                        { color: format === "SINGLE_ELIM" ? "#fff" : textColor }
                                    ]}>Sistem Gugur</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.formatBtn,
                                        {
                                            backgroundColor: format === "DOUBLE_ELIM" ? Colors.primary : cardColor,
                                            borderColor: format === "DOUBLE_ELIM" ? Colors.primary : borderColor,
                                        }
                                    ]}
                                    onPress={() => setFormat("DOUBLE_ELIM")}
                                >
                                    <MaterialIcons
                                        name="account-tree"
                                        size={20}
                                        color={format === "DOUBLE_ELIM" ? "#fff" : textColor}
                                    />
                                    <Text style={[
                                        styles.formatBtnText,
                                        { color: format === "DOUBLE_ELIM" ? "#fff" : textColor }
                                    ]}>Kompetisi Penuh</Text>
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
                                            {
                                                backgroundColor: slotCount === num ? Colors.primary : cardColor,
                                                borderColor: slotCount === num ? Colors.primary : borderColor,
                                            }
                                        ]}
                                        onPress={() => setSlotCount(num)}
                                    >
                                        <Text style={[
                                            styles.slotBtnText,
                                            { color: slotCount === num ? "#fff" : textColor }
                                        ]}>{num}</Text>
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
                                <Switch
                                    value={thirdPlaceMatch}
                                    onValueChange={setThirdPlaceMatch}
                                    trackColor={{ false: "#E5E7EB", true: Colors.primary }}
                                />
                            </View>

                            <View style={[styles.optionRow, { borderBottomColor: borderColor }]}>
                                <View style={styles.optionInfo}>
                                    <MaterialIcons name="shuffle" size={20} color={Colors.primary} />
                                    <Text style={[styles.optionLabel, { color: textColor }]}>Acak Posisi Peserta</Text>
                                </View>
                                <Switch
                                    value={randomize}
                                    onValueChange={setRandomize}
                                    trackColor={{ false: "#E5E7EB", true: Colors.primary }}
                                />
                            </View>
                        </View>

                        {/* Participants */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: textColor }]}>
                                    Peserta ({participants.length}/{slotCount})
                                </Text>
                                <TouchableOpacity
                                    style={[styles.importBtn, { borderColor: Colors.primary }]}
                                    onPress={handleImportCSV}
                                >
                                    <MaterialIcons name="upload-file" size={16} color={Colors.primary} />
                                    <Text style={[styles.importBtnText, { color: Colors.primary }]}>Import CSV</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Add Participant */}
                            <View style={styles.addParticipant}>
                                <TextInput
                                    style={[styles.addInput, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Nama peserta"
                                    placeholderTextColor={mutedColor}
                                    value={newParticipantName}
                                    onChangeText={setNewParticipantName}
                                />
                                <TouchableOpacity
                                    style={[styles.addBtn, { backgroundColor: Colors.primary }]}
                                    onPress={addParticipant}
                                >
                                    <MaterialIcons name="add" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Participants List */}
                            <View style={styles.participantsList}>
                                {participants.map((p, index) => (
                                    <View
                                        key={p.id}
                                        style={[styles.participantItem, { backgroundColor: cardColor, borderColor }]}
                                    >
                                        <View style={[styles.seedBadge, { backgroundColor: Colors.blueLight }]}>
                                            <Text style={styles.seedText}>{index + 1}</Text>
                                        </View>
                                        <Text style={[styles.participantName, { color: textColor }]}>{p.name}</Text>
                                        <TouchableOpacity onPress={() => removeParticipant(p.id)}>
                                            <MaterialIcons name="close" size={20} color={mutedColor} />
                                        </TouchableOpacity>
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
                                Tournament Bracket ({slotCount} peserta)
                            </Text>
                            <TouchableOpacity>
                                <MaterialIcons name="share" size={24} color={Colors.primary} />
                            </TouchableOpacity>
                        </View>
                        {renderBracket()}
                    </View>
                )}

                {/* Generate Button */}
                {!isGenerated && (
                    <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                        <TouchableOpacity
                            style={[
                                styles.generateBtn,
                                { backgroundColor: participants.length >= 2 ? Colors.primary : Colors.muted }
                            ]}
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
    importBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, gap: 4 },
    importBtnText: { fontSize: 13, fontWeight: "500" },
    addParticipant: { flexDirection: "row", gap: 10, marginBottom: 12 },
    addInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    addBtn: { width: 48, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    participantsList: { gap: 8 },
    participantItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, gap: 12 },
    seedBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    seedText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
    participantName: { flex: 1, fontSize: 15 },
    bottomAction: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
    generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
    generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    bracketView: { flex: 1 },
    bracketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    bracketTitle: { fontSize: 16, fontWeight: "600" },
    bracketContainer: { flexDirection: "row", padding: 16 },
    roundColumn: { marginRight: 20, minWidth: 140 },
    roundTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12, textAlign: "center" },
    matchesColumn: { gap: 16 },
    matchCard: { borderRadius: 8, borderWidth: 1, overflow: "hidden" },
    matchPlayer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderBottomWidth: 1 },
    playerName: { fontSize: 13, flex: 1 },
    playerScore: { fontSize: 14, fontWeight: "bold", marginLeft: 8 },
});
