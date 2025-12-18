import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../src/lib/constants";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/authStore";

interface Badge {
    id: string;
    code: string;
    name: string;
    description: string;
    icon_url: string;
    category: string;
    xp_reward: number;
    earned_at?: string;
    unlocked: boolean;
}

const badgeIcons: Record<string, string> = {
    first_win: "emoji-events",
    streak_5: "local-fire-department",
    matches_10: "sports-tennis",
    matches_50: "military-tech",
    rating_1500: "trending-up",
    rating_2000: "star",
    tournament_winner: "workspace-premium",
};

const badgeColors: Record<string, { bg: string; color: string }> = {
    COMPETITION: { bg: "#FEF3C7", color: "#F59E0B" },
    PERFORMANCE: { bg: "#E0E7FF", color: "#6366F1" },
    SOCIAL: { bg: "#FCE7F3", color: "#EC4899" },
    SPECIAL: { bg: "#D1FAE5", color: "#10B981" },
};

export default function BadgesScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();

    const [badges, setBadges] = useState<Badge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    useEffect(() => {
        const fetchBadges = async () => {
            if (!profile?.id) return;

            try {
                // Get all badges
                const { data: allBadges } = await supabase
                    .from("badges")
                    .select("*");

                // Get user's earned badges
                const { data: userBadges } = await supabase
                    .from("user_badges")
                    .select("badge_id, earned_at")
                    .eq("user_id", profile.id);

                const userBadgesList = (userBadges || []) as { badge_id: string; earned_at: string }[];
                const earnedBadgeIds = new Set(userBadgesList.map(ub => ub.badge_id));
                const earnedMap = new Map(userBadgesList.map(ub => [ub.badge_id, ub.earned_at]));

                const combinedBadges = (allBadges || []).map((b: any) => ({
                    ...b,
                    unlocked: earnedBadgeIds.has(b.id),
                    earned_at: earnedMap.get(b.id),
                }));

                // Sort: unlocked first, then by name
                combinedBadges.sort((a: Badge, b: Badge) => {
                    if (a.unlocked && !b.unlocked) return -1;
                    if (!a.unlocked && b.unlocked) return 1;
                    return a.name.localeCompare(b.name);
                });

                setBadges(combinedBadges);
            } catch (error) {
                console.error("Error fetching badges:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBadges();
    }, [profile?.id]);

    const unlockedCount = badges.filter(b => b.unlocked).length;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Koleksi Lencana",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                {/* Stats Card */}
                <View style={[styles.statsCard, { backgroundColor: `${Colors.primary}15` }]}>
                    <View style={styles.statsItem}>
                        <Text style={[styles.statsValue, { color: Colors.primary }]}>{unlockedCount}</Text>
                        <Text style={[styles.statsLabel, { color: mutedColor }]}>Terbuka</Text>
                    </View>
                    <View style={styles.statsDivider} />
                    <View style={styles.statsItem}>
                        <Text style={[styles.statsValue, { color: textColor }]}>{badges.length}</Text>
                        <Text style={[styles.statsLabel, { color: mutedColor }]}>Total</Text>
                    </View>
                    <View style={styles.statsDivider} />
                    <View style={styles.statsItem}>
                        <Text style={[styles.statsValue, { color: textColor }]}>
                            {badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0}%
                        </Text>
                        <Text style={[styles.statsLabel, { color: mutedColor }]}>Progress</Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Categories */}
                    {["COMPETITION", "PERFORMANCE", "SOCIAL", "SPECIAL"].map((category) => {
                        const categoryBadges = badges.filter(b => b.category === category);
                        if (categoryBadges.length === 0) return null;

                        const categoryName = {
                            COMPETITION: "Kompetisi",
                            PERFORMANCE: "Performa",
                            SOCIAL: "Sosial",
                            SPECIAL: "Spesial",
                        }[category];

                        return (
                            <View key={category} style={styles.categorySection}>
                                <Text style={[styles.categoryTitle, { color: textColor }]}>
                                    {categoryName}
                                </Text>
                                <View style={styles.badgeGrid}>
                                    {categoryBadges.map((badge) => {
                                        const colors = badgeColors[badge.category] || badgeColors.COMPETITION;
                                        const iconName = badgeIcons[badge.code] || "stars";

                                        return (
                                            <View
                                                key={badge.id}
                                                style={[
                                                    styles.badgeCard,
                                                    { backgroundColor: cardColor, opacity: badge.unlocked ? 1 : 0.5 }
                                                ]}
                                            >
                                                <View style={[styles.badgeIcon, { backgroundColor: colors.bg }]}>
                                                    {badge.unlocked ? (
                                                        <MaterialIcons name={iconName as any} size={32} color={colors.color} />
                                                    ) : (
                                                        <MaterialIcons name="lock" size={32} color="#9CA3AF" />
                                                    )}
                                                </View>
                                                <Text style={[styles.badgeName, { color: textColor }]}>
                                                    {badge.name}
                                                </Text>
                                                <Text style={[styles.badgeDesc, { color: mutedColor }]} numberOfLines={2}>
                                                    {badge.description}
                                                </Text>
                                                {badge.unlocked && (
                                                    <View style={styles.unlockedBadge}>
                                                        <MaterialIcons name="check-circle" size={14} color="#10B981" />
                                                        <Text style={styles.unlockedText}>Terbuka</Text>
                                                    </View>
                                                )}
                                                <Text style={[styles.xpReward, { color: colors.color }]}>
                                                    +{badge.xp_reward} XP
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}

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
    statsCard: {
        flexDirection: "row",
        marginHorizontal: 20,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
    },
    statsItem: {
        flex: 1,
        alignItems: "center",
    },
    statsValue: {
        fontSize: 24,
        fontWeight: "bold",
    },
    statsLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    statsDivider: {
        width: 1,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    categorySection: {
        marginBottom: 24,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
    },
    badgeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    badgeCard: {
        width: "47%",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    badgeIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    badgeName: {
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 4,
    },
    badgeDesc: {
        fontSize: 11,
        textAlign: "center",
        lineHeight: 16,
    },
    unlockedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    unlockedText: {
        fontSize: 11,
        color: "#10B981",
        fontWeight: "500",
    },
    xpReward: {
        fontSize: 12,
        fontWeight: "bold",
        marginTop: 8,
    },
});
