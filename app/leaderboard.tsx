import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors, getLevelTitle, SharedStyles, ExtendedColors } from "../src/lib/constants";
import { useAuthStore } from "../src/stores/authStore";

interface Player {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    rating_mr: number;
    level: number;
    wins: number;
    losses: number;
    total_matches: number;
    city: string;
}

// Mock players for demo
const mockPlayers: Player[] = [
    { id: "1", name: "Budi Santoso", username: "budi_tt", avatar_url: "", rating_mr: 2150, level: 25, wins: 145, losses: 32, total_matches: 177, city: "Jakarta" },
    { id: "2", name: "Alex Wijaya", username: "alex_ping", avatar_url: "", rating_mr: 2080, level: 22, wins: 128, losses: 41, total_matches: 169, city: "Jakarta" },
    { id: "3", name: "Dimas Pratama", username: "dimas_pp", avatar_url: "", rating_mr: 2020, level: 20, wins: 112, losses: 38, total_matches: 150, city: "Bandung" },
    { id: "4", name: "Eko Prasetyo", username: "eko_master", avatar_url: "", rating_mr: 1950, level: 18, wins: 98, losses: 42, total_matches: 140, city: "Jakarta" },
    { id: "5", name: "Fajar Nugroho", username: "fajar_smash", avatar_url: "", rating_mr: 1890, level: 17, wins: 85, losses: 45, total_matches: 130, city: "Surabaya" },
    { id: "6", name: "Gilang Ramadhan", username: "gilang_spin", avatar_url: "", rating_mr: 1850, level: 16, wins: 78, losses: 42, total_matches: 120, city: "Jakarta" },
    { id: "7", name: "Hendra Kusuma", username: "hendra_ace", avatar_url: "", rating_mr: 1800, level: 15, wins: 72, losses: 48, total_matches: 120, city: "Bandung" },
    { id: "8", name: "Ivan Setiawan", username: "ivan_loop", avatar_url: "", rating_mr: 1750, level: 14, wins: 65, losses: 45, total_matches: 110, city: "Jakarta" },
    { id: "9", name: "Joko Susilo", username: "joko_block", avatar_url: "", rating_mr: 1700, level: 13, wins: 58, losses: 42, total_matches: 100, city: "Surabaya" },
    { id: "10", name: "Krisna Adi", username: "krisna_chop", avatar_url: "", rating_mr: 1650, level: 12, wins: 52, losses: 38, total_matches: 90, city: "Jakarta" },
];

export default function LeaderboardScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();

    const [players, setPlayers] = useState<Player[]>(mockPlayers);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<"global" | "local">("global");

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const filteredPlayers = filter === "local" && profile?.city
        ? players.filter(p => p.city === profile.city)
        : players;

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const getWinRate = (wins: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((wins / total) * 100);
    };

    const myRank = filteredPlayers.findIndex(p => p.id === profile?.id) + 1;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: "#fff" }]}>Peringkat</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Filter Tabs */}
                <View style={[styles.filterTabs, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filter === "global" && [styles.filterTabActive, { borderBottomColor: Colors.primary }]
                        ]}
                        onPress={() => setFilter("global")}
                    >
                        <MaterialIcons
                            name="public"
                            size={18}
                            color={filter === "global" ? Colors.primary : mutedColor}
                        />
                        <Text style={[
                            styles.filterTabText,
                            { color: filter === "global" ? Colors.primary : mutedColor }
                        ]}>
                            Global
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filter === "local" && [styles.filterTabActive, { borderBottomColor: Colors.primary }]
                        ]}
                        onPress={() => setFilter("local")}
                    >
                        <MaterialIcons
                            name="location-on"
                            size={18}
                            color={filter === "local" ? Colors.primary : mutedColor}
                        />
                        <Text style={[
                            styles.filterTabText,
                            { color: filter === "local" ? Colors.primary : mutedColor }
                        ]}>
                            Lokal
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* My Rank Card */}
                {myRank > 0 && (
                    <View style={[styles.myRankCard, { backgroundColor: `${Colors.primary}15` }]}>
                        <View style={styles.myRankInfo}>
                            <Text style={[styles.myRankLabel, { color: mutedColor }]}>Peringkatmu</Text>
                            <Text style={[styles.myRankNumber, { color: Colors.primary }]}>#{myRank}</Text>
                        </View>
                        <View style={styles.myRankDivider} />
                        <View style={styles.myRankInfo}>
                            <Text style={[styles.myRankLabel, { color: mutedColor }]}>Rating MR</Text>
                            <Text style={[styles.myRankValue, { color: textColor }]}>{profile?.rating_mr || 1000}</Text>
                        </View>
                    </View>
                )}

                {/* Leaderboard List */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Top 3 Podium */}
                    {filteredPlayers.length >= 3 && (
                        <View style={styles.podium}>
                            {/* 2nd Place */}
                            <View style={styles.podiumItem}>
                                <Image
                                    source={{ uri: filteredPlayers[1]?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(filteredPlayers[1]?.name || "User")}&background=9CA3AF&color=fff` }}
                                    style={[styles.podiumAvatar, styles.podiumAvatar2nd]}
                                />
                                <View style={[styles.podiumBadge, { backgroundColor: "#9CA3AF" }]}>
                                    <Text style={styles.podiumRank}>2</Text>
                                </View>
                                <Text style={[styles.podiumName, { color: textColor }]} numberOfLines={1}>
                                    {filteredPlayers[1]?.name}
                                </Text>
                                <Text style={[styles.podiumMr, { color: mutedColor }]}>
                                    {filteredPlayers[1]?.rating_mr} MR
                                </Text>
                            </View>

                            {/* 1st Place */}
                            <View style={[styles.podiumItem, styles.podiumItemFirst]}>
                                <MaterialIcons name="emoji-events" size={28} color="#F59E0B" style={styles.crownIcon} />
                                <Image
                                    source={{ uri: filteredPlayers[0]?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(filteredPlayers[0]?.name || "User")}&background=F59E0B&color=fff` }}
                                    style={[styles.podiumAvatar, styles.podiumAvatar1st]}
                                />
                                <View style={[styles.podiumBadge, { backgroundColor: "#F59E0B" }]}>
                                    <Text style={styles.podiumRank}>1</Text>
                                </View>
                                <Text style={[styles.podiumName, { color: textColor }]} numberOfLines={1}>
                                    {filteredPlayers[0]?.name}
                                </Text>
                                <Text style={[styles.podiumMr, { color: mutedColor }]}>
                                    {filteredPlayers[0]?.rating_mr} MR
                                </Text>
                            </View>

                            {/* 3rd Place */}
                            <View style={styles.podiumItem}>
                                <Image
                                    source={{ uri: filteredPlayers[2]?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(filteredPlayers[2]?.name || "User")}&background=CD7F32&color=fff` }}
                                    style={[styles.podiumAvatar, styles.podiumAvatar3rd]}
                                />
                                <View style={[styles.podiumBadge, { backgroundColor: "#CD7F32" }]}>
                                    <Text style={styles.podiumRank}>3</Text>
                                </View>
                                <Text style={[styles.podiumName, { color: textColor }]} numberOfLines={1}>
                                    {filteredPlayers[2]?.name}
                                </Text>
                                <Text style={[styles.podiumMr, { color: mutedColor }]}>
                                    {filteredPlayers[2]?.rating_mr} MR
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Rest of List */}
                    {filteredPlayers.slice(3).map((player, index) => {
                        const rank = index + 4;
                        const isMe = player.id === profile?.id;

                        return (
                            <TouchableOpacity
                                key={player.id}
                                style={[
                                    styles.playerCard,
                                    { backgroundColor: isMe ? `${Colors.primary}10` : cardColor }
                                ]}
                                onPress={() => router.push({ pathname: "/player/[id]", params: { id: player.id } })}
                            >
                                <Text style={[styles.rankNumber, { color: mutedColor }]}>
                                    {rank}
                                </Text>
                                <Image
                                    source={{ uri: player.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random` }}
                                    style={styles.playerAvatar}
                                />
                                <View style={styles.playerInfo}>
                                    <Text style={[styles.playerName, { color: textColor }]}>
                                        {player.name} {isMe && "(Kamu)"}
                                    </Text>
                                    <Text style={[styles.playerSub, { color: mutedColor }]}>
                                        LVL {player.level} • {getWinRate(player.wins, player.total_matches)}% Win
                                    </Text>
                                </View>
                                <View style={styles.mrBadge}>
                                    <Text style={styles.mrValue}>{player.rating_mr}</Text>
                                    <Text style={styles.mrLabel}>MR</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {filteredPlayers.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="leaderboard" size={48} color={mutedColor} />
                            <Text style={[styles.emptyText, { color: mutedColor }]}>
                                Belum ada data peringkat
                            </Text>
                        </View>
                    )}

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
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
    },
    filterTabActive: {
        borderBottomWidth: 2,
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: "600",
    },
    myRankCard: {
        flexDirection: "row",
        marginHorizontal: 20,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
    },
    myRankInfo: {
        flex: 1,
        alignItems: "center",
    },
    myRankLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    myRankNumber: {
        fontSize: 24,
        fontWeight: "bold",
    },
    myRankValue: {
        fontSize: 20,
        fontWeight: "bold",
    },
    myRankDivider: {
        width: 1,
        backgroundColor: "rgba(0,0,0,0.1)",
        marginHorizontal: 16,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    podium: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        marginBottom: 24,
        paddingTop: 20,
    },
    podiumItem: {
        alignItems: "center",
        flex: 1,
    },
    podiumItemFirst: {
        marginBottom: 20,
    },
    crownIcon: {
        marginBottom: 4,
    },
    podiumAvatar: {
        borderWidth: 3,
    },
    podiumAvatar1st: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderColor: "#F59E0B",
    },
    podiumAvatar2nd: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderColor: "#9CA3AF",
    },
    podiumAvatar3rd: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderColor: "#CD7F32",
    },
    podiumBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: -12,
    },
    podiumRank: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    podiumName: {
        fontSize: 14,
        fontWeight: "600",
        marginTop: 8,
        maxWidth: 80,
    },
    podiumMr: {
        fontSize: 12,
        marginTop: 2,
    },
    playerCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    rankNumber: {
        width: 28,
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    playerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 15,
        fontWeight: "600",
    },
    playerSub: {
        fontSize: 12,
        marginTop: 2,
    },
    mrBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: "center",
    },
    mrValue: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    mrLabel: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 10,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12,
    },
});
