import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import {
    generateRoundRobinMatches,
    calculateGroupStandings,
    getQualifiersFromGroups,
    generateKnockoutFromGroups,
    Participant as BracketParticipant,
} from "../../src/lib/bracketGeneration";

interface GroupMember {
    id: string;
    participant_id: string;
    user: {
        id: string;
        name: string;
        avatar_url: string | null;
        rating_mr: number;
    };
    matches_played: number;
    matches_won: number;
    matches_lost: number;
    matches_drawn: number;
    sets_won: number;
    sets_lost: number;
    points_for: number;
    points_against: number;
    standing_points: number;
}

interface Group {
    id: string;
    group_name: string;
    group_order: number;
    members: GroupMember[];
}

export default function GroupStageScreen() {
    const router = useRouter();
    const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
    const { user } = useAuthStore();

    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    // Colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    // Load groups
    useEffect(() => {
        loadGroups();
    }, [tournamentId]);

    const loadGroups = async () => {
        if (!tournamentId) return;

        setLoading(true);
        try {
            // Check if organizer
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("organizer_id")
                .eq("id", tournamentId)
                .single();

            if (tournament) {
                setIsOrganizer((tournament as any).organizer_id === user?.id);
            }

            // Fetch groups with members
            const { data: groupsData } = await (supabase
                .from("tournament_groups") as any)
                .select(`
                    id,
                    group_name,
                    group_order,
                    tournament_group_members (
                        id,
                        participant_id,
                        matches_played,
                        matches_won,
                        matches_lost,
                        matches_drawn,
                        sets_won,
                        sets_lost,
                        points_for,
                        points_against,
                        standing_points
                    )
                `)
                .eq("tournament_id", tournamentId)
                .order("group_order");

            if (groupsData) {
                // Fetch participant details for each group member
                const groupsWithMembers = await Promise.all(
                    (groupsData as any[]).map(async (group) => {
                        const membersWithDetails = await Promise.all(
                            (group.tournament_group_members || []).map(async (member: any) => {
                                const { data: participant } = await supabase
                                    .from("tournament_participants")
                                    .select("user_id, profiles:user_id (id, name, avatar_url, rating_mr)")
                                    .eq("id", member.participant_id)
                                    .single();

                                return {
                                    ...member,
                                    user: (participant as any)?.profiles,
                                };
                            })
                        );

                        // Sort by standing points, then +/- difference
                        membersWithDetails.sort((a, b) => {
                            if (b.standing_points !== a.standing_points) {
                                return b.standing_points - a.standing_points;
                            }
                            const aDiff = a.points_for - a.points_against;
                            const bDiff = b.points_for - b.points_against;
                            return bDiff - aDiff;
                        });

                        return {
                            ...group,
                            members: membersWithDetails,
                        };
                    })
                );

                setGroups(groupsWithMembers);
                if (groupsWithMembers.length > 0 && !selectedGroup) {
                    setSelectedGroup(groupsWithMembers[0].id);
                }
            }
        } catch (error) {
            console.error("Error loading groups:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadGroups();
    };

    // Create groups from participants
    const createGroups = async (numGroups: number = 2) => {
        if (!tournamentId) return;
        setGenerating(true);

        try {
            // Fetch all participants
            const { data: participants } = await supabase
                .from("tournament_participants")
                .select("id, user_id, profiles:user_id (id, name, rating_mr)")
                .eq("tournament_id", tournamentId)
                .eq("status", "APPROVED");

            if (!participants || participants.length < numGroups * 2) {
                Alert.alert("Error", `Minimal ${numGroups * 2} peserta untuk ${numGroups} grup`);
                return;
            }

            // Shuffle and distribute to groups
            const shuffled = [...participants].sort(() => Math.random() - 0.5);
            const groupSize = Math.ceil(shuffled.length / numGroups);

            for (let i = 0; i < numGroups; i++) {
                const groupName = `Grup ${String.fromCharCode(65 + i)}`; // Grup A, B, C...
                const groupMembers = shuffled.slice(i * groupSize, (i + 1) * groupSize);

                // Create group
                const { data: newGroup, error: groupError } = await (supabase
                    .from("tournament_groups") as any)
                    .insert({
                        tournament_id: tournamentId,
                        group_name: groupName,
                        group_order: i + 1,
                    })
                    .select()
                    .single();

                if (groupError) throw groupError;

                // Add members to group
                for (const member of groupMembers) {
                    await (supabase.from("tournament_group_members") as any).insert({
                        group_id: newGroup.id,
                        participant_id: member.id,
                    });
                }

                // Generate round robin matches for this group
                const groupParticipants: BracketParticipant[] = groupMembers.map((m: any) => ({
                    id: m.profiles?.id || m.user_id,
                    name: m.profiles?.name || "Unknown",
                    rating_mr: m.profiles?.rating_mr || 1000,
                }));

                const roundRobinMatches = generateRoundRobinMatches(groupParticipants, groupName);

                // Insert round robin matches
                for (const match of roundRobinMatches) {
                    await supabase.from("tournament_matches").insert({
                        tournament_id: tournamentId,
                        round: match.round,
                        match_number: match.matchNumber,
                        player1_id: match.player1?.id || null,
                        player2_id: match.player2?.id || null,
                        status: "PENDING",
                        bracket_side: "WINNERS",
                    } as any);
                }
            }

            Alert.alert("Berhasil", `${numGroups} grup berhasil dibuat dengan pertandingan round robin!`);
            loadGroups();
        } catch (error) {
            console.error("Error creating groups:", error);
            Alert.alert("Error", "Gagal membuat grup");
        } finally {
            setGenerating(false);
        }
    };

    // Proceed to knockout stage
    const proceedToKnockout = async () => {
        if (!tournamentId || groups.length === 0) return;

        try {
            // Build standings for knockout generation
            const groupStandings = groups.map(group => ({
                groupId: group.id,
                standings: group.members.map(m => ({
                    participantId: m.participant_id,
                    participant: {
                        id: m.user?.id || m.participant_id,
                        name: m.user?.name || "Unknown",
                        rating_mr: m.user?.rating_mr || 1000,
                    },
                    matchesPlayed: m.matches_played,
                    wins: m.matches_won,
                    losses: m.matches_lost,
                    draws: m.matches_drawn,
                    setsWon: m.sets_won,
                    setsLost: m.sets_lost,
                    pointsFor: m.points_for,
                    pointsAgainst: m.points_against,
                    standingPoints: m.standing_points,
                })),
            }));

            // Get qualifiers (top 2 from each group)
            const qualifiers = getQualifiersFromGroups(groupStandings, 2);

            if (qualifiers.length < 2) {
                Alert.alert("Error", "Tidak cukup peserta untuk babak knockout");
                return;
            }

            Alert.alert(
                "Konfirmasi",
                `Lanjutkan ke babak knockout dengan ${qualifiers.length} peserta? (Top 2 dari setiap grup)`,
                [
                    { text: "Batal", style: "cancel" },
                    {
                        text: "Lanjutkan",
                        onPress: () => router.push({ pathname: "/tournament/bracket", params: { tournamentId } }),
                    },
                ]
            );
        } catch (error) {
            console.error("Error proceeding to knockout:", error);
            Alert.alert("Error", "Gagal melanjutkan ke knockout");
        }
    };

    // Render standings table
    const renderStandingsTable = (group: Group) => (
        <View style={[styles.tableContainer, { backgroundColor: cardColor }]}>
            {/* Table Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.headerCell, styles.rankCell, { color: mutedColor }]}>#</Text>
                <Text style={[styles.headerCell, styles.nameCell, { color: mutedColor }]}>Pemain</Text>
                <Text style={[styles.headerCell, styles.statCell, { color: mutedColor }]}>M</Text>
                <Text style={[styles.headerCell, styles.statCell, { color: mutedColor }]}>W</Text>
                <Text style={[styles.headerCell, styles.statCell, { color: mutedColor }]}>L</Text>
                <Text style={[styles.headerCell, styles.statCell, { color: mutedColor }]}>+/-</Text>
                <Text style={[styles.headerCell, styles.pointsCell, { color: mutedColor }]}>Pts</Text>
            </View>

            {/* Table Rows */}
            {group.members.map((member, index) => {
                const isQualified = index < 2; // Top 2 qualify
                const pointsDiff = member.points_for - member.points_against;

                return (
                    <View
                        key={member.id}
                        style={[
                            styles.tableRow,
                            index === group.members.length - 1 && { borderBottomWidth: 0 },
                            isQualified && styles.qualifiedRow,
                        ]}
                    >
                        <Text style={[styles.cell, styles.rankCell, { color: textColor }]}>{index + 1}</Text>
                        <View style={[styles.nameCell, styles.playerInfo]}>
                            <Image
                                source={{ uri: member.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || "U")}&background=random` }}
                                style={styles.avatar}
                            />
                            <View>
                                <Text style={[styles.playerName, { color: textColor }]} numberOfLines={1}>
                                    {member.user?.name || "Unknown"}
                                </Text>
                                <Text style={[styles.playerMr, { color: mutedColor }]}>
                                    MR {member.user?.rating_mr || 1000}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.cell, styles.statCell, { color: textColor }]}>{member.matches_played}</Text>
                        <Text style={[styles.cell, styles.statCell, { color: "#10B981" }]}>{member.matches_won}</Text>
                        <Text style={[styles.cell, styles.statCell, { color: "#EF4444" }]}>{member.matches_lost}</Text>
                        <Text style={[styles.cell, styles.statCell, { color: pointsDiff >= 0 ? "#10B981" : "#EF4444" }]}>
                            {pointsDiff >= 0 ? "+" : ""}{pointsDiff}
                        </Text>
                        <Text style={[styles.cell, styles.pointsCell, { color: Colors.primary, fontWeight: "bold" }]}>
                            {member.standing_points}
                        </Text>
                    </View>
                );
            })}

            {group.members.length === 0 && (
                <View style={styles.emptyRow}>
                    <Text style={{ color: mutedColor }}>Belum ada peserta di grup ini</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ color: mutedColor, marginTop: 12 }}>Memuat grup...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Fase Grup",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {/* Group Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.groupTabs}
                    >
                        {groups.map((group) => (
                            <TouchableOpacity
                                key={group.id}
                                style={[
                                    styles.groupTab,
                                    selectedGroup === group.id && styles.groupTabActive,
                                ]}
                                onPress={() => setSelectedGroup(group.id)}
                            >
                                <Text style={[
                                    styles.groupTabText,
                                    { color: selectedGroup === group.id ? "#fff" : textColor }
                                ]}>
                                    {group.group_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Info Card */}
                    <View style={[styles.infoCard, { backgroundColor: "#E0F2FE" }]}>
                        <MaterialIcons name="info" size={20} color="#0284C7" />
                        <Text style={styles.infoText}>
                            Peringkat 1 & 2 dari setiap grup akan lolos ke babak knockout.
                        </Text>
                    </View>

                    {/* Selected Group Standings */}
                    {groups.filter(g => g.id === selectedGroup).map(group => (
                        <View key={group.id}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>
                                Klasemen {group.group_name}
                            </Text>
                            {renderStandingsTable(group)}
                        </View>
                    ))}

                    {/* Proceed to Knockout Button */}
                    {groups.length > 0 && isOrganizer && (
                        <TouchableOpacity
                            style={[styles.knockoutBtn, { backgroundColor: Colors.primary }]}
                            onPress={proceedToKnockout}
                        >
                            <MaterialIcons name="trending-up" size={20} color="#fff" />
                            <Text style={styles.knockoutBtnText}>Lanjut ke Babak Knockout</Text>
                        </TouchableOpacity>
                    )}

                    {groups.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="group-work" size={64} color={mutedColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>Belum Ada Grup</Text>
                            <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                Organizer belum membuat fase grup untuk turnamen ini.
                            </Text>
                            {isOrganizer && (
                                <TouchableOpacity
                                    style={[styles.createBtn, { backgroundColor: Colors.primary }]}
                                    onPress={() => createGroups(2)}
                                    disabled={generating}
                                >
                                    {generating ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <MaterialIcons name="add" size={20} color="#fff" />
                                            <Text style={styles.createBtnText}>Buat 2 Grup (Round Robin)</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    groupTabs: { gap: 8, paddingBottom: 16 },
    groupTab: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
    },
    groupTabActive: {
        backgroundColor: Colors.primary,
    },
    groupTabText: { fontSize: 14, fontWeight: "600" },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    infoText: { flex: 1, fontSize: 13, color: "#0284C7" },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    tableContainer: { borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB" },
    tableRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tableHeader: { backgroundColor: "#F9FAFB" },
    qualifiedRow: { backgroundColor: "#F0FDF4" },
    headerCell: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
    cell: { fontSize: 13 },
    rankCell: { width: 24, textAlign: "center" },
    nameCell: { flex: 1, marginRight: 8 },
    statCell: { width: 28, textAlign: "center" },
    pointsCell: { width: 32, textAlign: "center" },
    playerInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    playerName: { fontSize: 13, fontWeight: "500", maxWidth: 100 },
    playerMr: { fontSize: 10 },
    emptyRow: { padding: 20, alignItems: "center" },
    emptyState: { alignItems: "center", padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    emptyDesc: { fontSize: 14, textAlign: "center", marginTop: 8 },
    createBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginTop: 20,
    },
    createBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    knockoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginTop: 20,
    },
    knockoutBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
