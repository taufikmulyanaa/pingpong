import React, { useState } from "react";
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
import { Colors, GripStyles, PlayStyles, getLevelTitle, SharedStyles, ExtendedColors } from "../../src/lib/constants";

import { supabase } from "../../src/lib/supabase";

export default function PlayerDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [player, setPlayer] = useState<any>(null);

    React.useEffect(() => {
        async function fetchPlayer() {
            if (!id) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();
            if (data) {
                setPlayer(data);
            }
        }
        fetchPlayer();
    }, [id]);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "rgba(0,0,0,0.05)";

    if (!player) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: bgColor }}>
                <Text style={{ color: textColor }}>Loading...</Text>
            </View>
        );
    }

    const winRate = player.total_matches > 0
        ? Math.round((player.wins / player.total_matches) * 100)
        : 0;

    const handleChallenge = () => {
        router.push({
            pathname: "/challenge/new",
            params: { playerId: id },
        });
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Profil Pemain",
                    headerBackTitle: "Kembali",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />

            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarGradient}>
                                <Image source={{ uri: player.avatar_url }} style={styles.avatar} />
                            </View>
                            {player.is_online && <View style={styles.onlineDot} />}
                            <View style={styles.levelBadge}>
                                <MaterialIcons name="military-tech" size={14} color="#fff" />
                                <Text style={styles.levelBadgeText}>Lvl {player.level}</Text>
                            </View>
                        </View>

                        <Text style={[styles.profileName, { color: textColor }]}>{player.name}</Text>
                        <Text style={[styles.profileUsername, { color: mutedColor }]}>{player.username}</Text>

                        {player.bio && (
                            <Text style={[styles.profileBio, { color: mutedColor }]}>{player.bio}</Text>
                        )}

                        <View style={styles.locationRow}>
                            <MaterialIcons name="place" size={16} color={mutedColor} />
                            <Text style={[styles.locationText, { color: mutedColor }]}>{player.city}</Text>
                        </View>

                        {/* Style Tags */}
                        <View style={styles.styleTags}>
                            {player.grip_style && GripStyles[player.grip_style] && (
                                <View style={[styles.styleTag, { backgroundColor: isDark ? "#374151" : "#F3F4F6" }]}>
                                    <Text style={[styles.styleTagText, { color: mutedColor }]}>
                                        {GripStyles[player.grip_style]}
                                    </Text>
                                </View>
                            )}
                            {player.play_style && PlayStyles[player.play_style] && (
                                <View style={[styles.styleTag, { backgroundColor: "#FFF7ED" }]}>
                                    <Text style={[styles.styleTagText, { color: "#EA580C" }]}>
                                        {PlayStyles[player.play_style]}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: cardColor, borderColor }]}>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>MR Rating</Text>
                            <Text style={[styles.statValue, { color: textColor }]}>{player.rating_mr}</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: cardColor, borderColor }]}>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Win Rate</Text>
                            <Text style={[styles.statValue, { color: Colors.primary }]}>{winRate}%</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: cardColor, borderColor }]}>
                            <Text style={[styles.statLabel, { color: mutedColor }]}>Matches</Text>
                            <Text style={[styles.statValue, { color: textColor }]}>{player.total_matches}</Text>
                        </View>
                    </View>

                    {/* Record */}
                    <View style={[styles.recordCard, { backgroundColor: cardColor, borderColor }]}>
                        <View style={styles.recordHeader}>
                            <MaterialIcons name="insights" size={20} color={Colors.primary} />
                            <Text style={[styles.recordTitle, { color: textColor }]}>Rekam Jejak</Text>
                        </View>

                        <View style={styles.recordRow}>
                            <View style={styles.recordItem}>
                                <Text style={[styles.recordValue, { color: "#10B981" }]}>{player.wins}</Text>
                                <Text style={[styles.recordLabel, { color: mutedColor }]}>Menang</Text>
                            </View>
                            <View style={[styles.recordDivider, { backgroundColor: borderColor }]} />
                            <View style={styles.recordItem}>
                                <Text style={[styles.recordValue, { color: "#EF4444" }]}>{player.losses}</Text>
                                <Text style={[styles.recordLabel, { color: mutedColor }]}>Kalah</Text>
                            </View>
                            <View style={[styles.recordDivider, { backgroundColor: borderColor }]} />
                            <View style={styles.recordItem}>
                                <Text style={[styles.recordValue, { color: "#F59E0B" }]}>{player.current_streak}</Text>
                                <Text style={[styles.recordLabel, { color: mutedColor }]}>Streak</Text>
                            </View>
                        </View>
                    </View>

                    {/* Head to Head */}
                    <View style={[styles.h2hCard, { backgroundColor: cardColor, borderColor }]}>
                        <View style={styles.h2hHeader}>
                            <MaterialIcons name="sync-alt" size={20} color={Colors.blueMid} />
                            <Text style={[styles.h2hTitle, { color: textColor }]}>Head to Head</Text>
                        </View>

                        <View style={styles.h2hContent}>
                            <Text style={[styles.h2hEmpty, { color: mutedColor }]}>
                                Belum ada pertandingan sebelumnya
                            </Text>
                        </View>
                    </View>

                    {/* Badges Preview */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Lencana</Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgeList}
                        >
                            {[1, 2, 3].map((i) => (
                                <View key={i} style={styles.badgeItem}>
                                    <View style={[styles.badgeIcon, { backgroundColor: "#FEF3C7" }]}>
                                        <MaterialIcons name="emoji-events" size={24} color="#F59E0B" />
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>

                {/* Bottom Actions */}
                <View style={[styles.bottomActions, { backgroundColor: cardColor, borderTopColor: borderColor }]}>
                    <TouchableOpacity
                        style={[styles.messageBtn, { borderColor }]}
                        onPress={() => router.push(`/chat/${id}`)}
                    >
                        <MaterialIcons name="chat-bubble-outline" size={20} color={textColor} />
                        <Text style={[styles.messageBtnText, { color: textColor }]}>Pesan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.challengeBtn} onPress={handleChallenge}>
                        <MaterialIcons name="sports-tennis" size={20} color="#fff" />
                        <Text style={styles.challengeBtnText}>Tantang Bermain</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    profileHeader: {
        alignItems: "center",
        marginBottom: 24,
    },
    avatarWrapper: {
        position: "relative",
    },
    avatarGradient: {
        width: 112,
        height: 112,
        borderRadius: 56,
        padding: 4,
        backgroundColor: Colors.primary,
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 52,
        borderWidth: 4,
        borderColor: "#fff",
    },
    onlineDot: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#10B981",
        borderWidth: 3,
        borderColor: "#fff",
    },
    levelBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.secondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#fff",
    },
    levelBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    profileName: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 16,
    },
    profileUsername: {
        fontSize: 16,
        fontWeight: "500",
    },
    profileBio: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 8,
        paddingHorizontal: 20,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    locationText: {
        fontSize: 14,
    },
    styleTags: {
        flexDirection: "row",
        gap: 8,
        marginTop: 12,
    },
    styleTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    styleTagText: {
        fontSize: 12,
        fontWeight: "500",
    },
    statsGrid: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
    },
    statLabel: {
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontWeight: "600",
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
    },
    recordCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    recordHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    recordTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },
    recordRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
    },
    recordItem: {
        alignItems: "center",
    },
    recordValue: {
        fontSize: 24,
        fontWeight: "bold",
    },
    recordLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    recordDivider: {
        width: 1,
        height: 40,
    },
    h2hCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    h2hHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    h2hTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },
    h2hContent: {
        alignItems: "center",
        paddingVertical: 16,
    },
    h2hEmpty: {
        fontSize: 14,
    },
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },
    badgeList: {
        gap: 12,
    },
    badgeItem: {},
    badgeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    bottomActions: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
    },
    messageBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    messageBtnText: {
        fontSize: 14,
        fontWeight: "600",
    },
    challengeBtn: {
        flex: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
    },
    challengeBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
});
