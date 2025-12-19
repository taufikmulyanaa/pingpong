import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { Colors, GripStyles, PlayStyles, getLevelTitle, SharedStyles, ExtendedColors } from "@/lib/constants";
import EditProfileModal from "@/components/EditProfileModal";

import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { usePlayerStats, useMatchHistory } from "@/hooks/usePlayerStats";

export default function ProfilScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile, signOut, fetchProfile } = useAuthStore();

    // Fetch real stats and history
    const { badges, stats, refresh: refreshStats } = usePlayerStats(profile?.id || "");
    const { matches: historyMatches, loading: historyLoading } = useMatchHistory(profile?.id || "");

    const [refreshing, setRefreshing] = React.useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchProfile(),
            refreshStats()
        ]);
        setRefreshing(false);
    }, [fetchProfile, refreshStats]);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    // Force soft border to match Home screen
    const borderColor = "rgba(0,0,0,0.05)";

    const winRate = profile && profile.total_matches > 0
        ? Math.round((profile.wins / profile.total_matches) * 100)
        : 0;

    const handleLogout = async () => {
        try {
            console.log("Signing out...");
            await signOut();
            router.replace("/(auth)/login");
        } catch (error) {
            console.error("Logout error:", error);
            router.replace("/login");
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
            >
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    {/* Nav Header */}
                    <View style={styles.navHeader}>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                            <MaterialIcons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: "#fff" }]}>Profil</Text>
                        <TouchableOpacity style={styles.headerBtn}>
                            <MaterialIcons name="settings" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarGradient}>
                            <Image
                                source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "User")}&background=random&size=112` }}
                                style={styles.avatar}
                            />
                        </View>
                        <View style={styles.levelBadge}>
                            <MaterialIcons name="military-tech" size={14} color="#fff" />
                            <Text style={styles.levelBadgeText}>Lvl {profile?.level || 1}</Text>
                        </View>
                    </View>

                    {/* Name & Username */}
                    <Text style={[styles.profileName, { color: "#fff" }]}>{profile?.name || "User"}</Text>
                    <Text style={[styles.profileUsername, { color: "rgba(255,255,255,0.7)" }]}>
                        @{profile?.username || "user"}
                    </Text>

                    {/* Join Date */}
                    <View style={styles.joinDate}>
                        <MaterialIcons name="calendar-today" size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={[styles.joinDateText, { color: "rgba(255,255,255,0.7)" }]}>
                            Bergabung {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { month: 'short', year: 'numeric' }) : "-"}
                        </Text>
                    </View>

                    {/* Style Tags */}
                    <View style={styles.styleTags}>
                        <View style={[styles.styleTag, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" }]}>
                            <Text style={[styles.styleTagText, { color: "#fff" }]}>
                                {profile?.grip_style ? GripStyles[profile.grip_style] : "Shakehand"}
                            </Text>
                        </View>
                        <View style={[styles.styleTag, { backgroundColor: "rgba(255,235,59,0.15)", borderColor: "rgba(255,235,59,0.2)" }]}>
                            <Text style={[styles.styleTagText, { color: "#FFF176" }]}>
                                {profile?.play_style ? PlayStyles[profile.play_style] : "All-Round"}
                            </Text>
                        </View>
                        <View style={[styles.styleTag, { backgroundColor: "rgba(100,181,246,0.15)", borderColor: "rgba(100,181,246,0.2)" }]}>
                            <Text style={[styles.styleTagText, { color: "#90CAF9" }]}>Fast Attack</Text>
                        </View>
                    </View>

                    {/* Equipment Info */}
                    {(profile?.equipment_blade || profile?.equipment_rubber_black || profile?.equipment_rubber_red) && (
                        <View style={styles.equipmentContainer}>
                            {profile?.equipment_blade && (
                                <View style={styles.equipmentItem}>
                                    <MaterialIcons name="sports-tennis" size={14} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.equipmentText}>{profile.equipment_blade}</Text>
                                </View>
                            )}
                            <View style={styles.rubberRow}>
                                {profile?.equipment_rubber_black && (
                                    <View style={styles.equipmentItem}>
                                        <View style={[styles.rubberDot, { backgroundColor: '#333', borderColor: '#555' }]} />
                                        <Text style={styles.equipmentText}>{profile.equipment_rubber_black}</Text>
                                    </View>
                                )}
                                {profile?.equipment_rubber_red && (
                                    <View style={styles.equipmentItem}>
                                        <View style={[styles.rubberDot, { backgroundColor: '#EF4444', borderColor: '#fff' }]} />
                                        <Text style={styles.equipmentText}>{profile.equipment_rubber_red}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.editProfileBtn}
                            onPress={() => setShowEditModal(true)}
                        >
                            <MaterialIcons name="edit" size={16} color="#fff" />
                            <Text style={styles.followBtnText}>Edit Profil</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: cardColor, borderColor }]}>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>MR Rating</Text>
                        <Text style={[styles.statValue, { color: textColor }]}>{profile?.rating_mr || 1000}</Text>
                        <View style={styles.statChange}>
                            <MaterialIcons name="arrow-upward" size={12} color="#10B981" />
                            <Text style={styles.statChangeText}>-</Text>
                        </View>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: cardColor, borderColor }]}>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>Win Rate</Text>
                        <Text style={[styles.statValue, { color: Colors.primary }]}>{winRate}%</Text>
                        <Text style={[styles.statSubLabel, { color: mutedColor }]}>dari {profile?.total_matches || 0}</Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: cardColor, borderColor }]}>
                        <Text style={[styles.statLabel, { color: mutedColor }]}>Rank</Text>
                        <Text style={[styles.statValue, { color: Colors.secondary }]}>-</Text>
                        <Text style={[styles.statSubLabel, { color: mutedColor }]}>-</Text>
                    </View>
                </View>

                {/* Performance Stats */}
                <View style={[styles.performanceCard, { backgroundColor: cardColor, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <MaterialIcons name="insights" size={20} color={Colors.primary} />
                        <Text style={[styles.cardTitle, { color: textColor }]}>Statistik Performa</Text>
                    </View>

                    <View style={styles.performanceRow}>
                        <Text style={[styles.performanceLabel, { color: mutedColor }]}>Total Pertandingan</Text>
                        <Text style={[styles.performanceValue, { color: textColor }]}>{profile?.total_matches || 0}</Text>
                    </View>

                    {/* Win/Lose Bar */}
                    <View style={styles.winLoseBar}>
                        <View style={[styles.winBar, { width: `${winRate}%` }]} />
                    </View>
                    <View style={styles.winLoseLabels}>
                        <Text style={styles.winLabel}>{profile?.wins || 0} Menang</Text>
                        <Text style={styles.loseLabel}>{profile?.losses || 0} Kalah</Text>
                    </View>

                    {/* Streak & Best Win */}
                    <View style={styles.streakRow}>
                        <View style={styles.streakItem}>
                            <Text style={[styles.streakLabel, { color: mutedColor }]}>Current Streak</Text>
                            <View style={styles.streakValue}>
                                <MaterialIcons name="local-fire-department" size={20} color="#F97316" />
                                <Text style={[styles.streakNumber, { color: textColor }]}>
                                    {profile?.current_streak || 0} Menang
                                </Text>
                            </View>
                        </View>
                        <View style={styles.streakItem}>
                            <Text style={[styles.streakLabel, { color: mutedColor }]}>Best Win</Text>
                            <View style={styles.streakValue}>
                                <MaterialIcons name="emoji-events" size={20} color="#F59E0B" />
                                <Text style={[styles.streakNumber, { color: textColor }]}>-</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Badge Collection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Koleksi Lencana ({badges.length})</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    {badges.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.badgeList}
                        >
                            {badges.map((badge) => {
                                // Define badge styles based on category/code if not in DB
                                const getBadgeStyle = (code: string, category: string) => {
                                    switch (category) {
                                        case 'COMPETITION': return { icon: 'emoji-events', color: '#F59E0B', bgColor: '#FEF3C7' };
                                        case 'PERFORMANCE': return { icon: 'bolt', color: '#6366F1', bgColor: '#E0E7FF' };
                                        case 'SOCIAL': return { icon: 'favorite', color: '#EC4899', bgColor: '#FCE7F3' };
                                        case 'SPECIAL': return { icon: 'star', color: '#8B5CF6', bgColor: '#EDE9FE' };
                                        default: return { icon: 'workspace-premium', color: '#9CA3AF', bgColor: '#F3F4F6' };
                                    }
                                };

                                const style = getBadgeStyle(badge.code, badge.category);

                                return (
                                    <View
                                        key={badge.id}
                                        style={[styles.badgeItem, { opacity: 1 }]}
                                    >
                                        <View style={[styles.badgeIcon, { backgroundColor: style.bgColor, borderColor: style.color }]}>
                                            <MaterialIcons name={style.icon as any} size={28} color={style.color} />
                                        </View>
                                        <Text style={[styles.badgeName, { color: mutedColor }]}>
                                            {badge.name}
                                        </Text>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <Text style={{ color: mutedColor, fontStyle: 'italic' }}>Belum ada lencana yang didapatkan.</Text>
                    )}
                </View>

                {/* Match History */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Riwayat Pertandingan</Text>
                        <TouchableOpacity onPress={() => router.push('/match/history' as any)}>
                            <Text style={styles.seeAll}>Selengkapnya</Text>
                        </TouchableOpacity>
                    </View>

                    {historyLoading ? (
                        <Text style={{ color: mutedColor }}>Memuat...</Text>
                    ) : historyMatches.length > 0 ? (
                        historyMatches.map((entry) => (
                            <View key={entry.match.id} style={[styles.matchCard, { backgroundColor: cardColor, borderColor }]}>
                                <View style={[styles.matchIndicator, { backgroundColor: entry.isWin ? "#10B981" : "#EF4444" }]} />
                                <View style={styles.matchContent}>
                                    <Text style={[styles.matchType, { color: mutedColor }]}>
                                        {entry.match.type === 'RANKED' ? 'Ranked Match' : 'Friendly Match'} • {formatDistanceToNow(new Date(entry.match.completed_at), { addSuffix: true, locale: idLocale })}
                                    </Text>
                                    <View style={styles.matchOpponent}>
                                        <Text style={[styles.matchOpponentName, { color: textColor }]}>vs {entry.opponent?.name || 'Unknown'}</Text>
                                        <View style={[styles.matchResult, { backgroundColor: entry.isWin ? "#D1FAE5" : "#FEE2E2" }]}>
                                            <Text style={[styles.matchResultText, { color: entry.isWin ? "#059669" : "#DC2626" }]}>
                                                {entry.isWin ? "W" : "L"}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.matchScore}>
                                    <Text style={[styles.matchScoreText, { color: textColor }]}>
                                        {entry.match.score_player1} - {entry.match.score_player2}
                                    </Text>
                                    <Text style={[styles.matchMr, { color: entry.isWin ? "#10B981" : "#EF4444" }]}>
                                        {entry.ratingChange > 0 ? '+' : ''}{entry.ratingChange} MR
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: mutedColor, fontStyle: "italic" }}>Belum ada riwayat pertandingan.</Text>
                    )}
                </View>

                {/* Legal & About */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Tentang Aplikasi</Text>
                    </View>
                    <View style={[styles.menuContainer, { backgroundColor: cardColor, borderColor }]}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push('/legal/privacy' as any)}
                        >
                            <View style={styles.menuItemLeft}>
                                <MaterialIcons name="policy" size={20} color={mutedColor} />
                                <Text style={[styles.menuItemText, { color: textColor }]}>Kebijakan Privasi</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={mutedColor} />
                        </TouchableOpacity>

                        <View style={[styles.menuDivider, { backgroundColor: borderColor }]} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push('/legal/terms' as any)}
                        >
                            <View style={styles.menuItemLeft}>
                                <MaterialIcons name="description" size={20} color={mutedColor} />
                                <Text style={[styles.menuItemText, { color: textColor }]}>Syarat & Ketentuan</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={mutedColor} />
                        </TouchableOpacity>

                        <View style={[styles.menuDivider, { backgroundColor: borderColor }]} />

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={async () => {
                                // Dynamic import to avoid circular dependencies or context issues if needed
                                const { scheduleLocalNotification } = require('@/lib/notifications');
                                await scheduleLocalNotification(
                                    "Test Notifikasi 🔔",
                                    "Ini adalah tes notifikasi lokal dari PingpongHub!",
                                    { seconds: 1 } as any
                                );
                                alert("Notifikasi dijadwalkan dalam 1 detik!");
                            }}
                        >
                            <View style={styles.menuItemLeft}>
                                <MaterialIcons name="notifications-active" size={20} color={Colors.primary} />
                                <Text style={[styles.menuItemText, { color: textColor }]}>Test Notifikasi</Text>
                            </View>
                            <MaterialIcons name="touch-app" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout Button */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.logoutBtn, { borderColor }]}
                        onPress={handleLogout}
                    >
                        <MaterialIcons name="logout" size={20} color="#EF4444" />
                        <Text style={styles.logoutBtnText}>Keluar</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom padding */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Edit Profile Modal */}
            <EditProfileModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                profile={profile}
            />
        </SafeAreaView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: 20,
    },
    profileHeader: {
        alignItems: "center",
        backgroundColor: Colors.secondary,
        paddingBottom: 48,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 20,
    },
    navHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: 20,
        paddingTop: 12,
        marginBottom: 20,
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
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 52,
        borderWidth: 4,
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
    joinDate: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
    },
    joinDateText: {
        fontSize: 12,
    },
    styleTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        marginTop: 16,
    },
    styleTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    styleTagText: {
        fontSize: 12,
        fontWeight: "500",
    },
    equipmentContainer: {
        marginTop: 16,
        alignItems: "center",
        gap: 6,
    },
    equipmentItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    rubberRow: {
        flexDirection: "row",
        gap: 8,
    },
    equipmentText: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 12,
        fontWeight: "500",
    },
    rubberDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
        width: "100%",
        maxWidth: 280,
    },
    followBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    editProfileBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    followBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    messageBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#fff",
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    messageBtnText: {
        fontSize: 14,
        fontWeight: "600",
    },
    statsGrid: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginTop: 24,
    },
    statCard: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
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
    statChange: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    statChangeText: {
        fontSize: 10,
        color: "#10B981",
        fontWeight: "600",
    },
    statSubLabel: {
        fontSize: 10,
        marginTop: 4,
    },
    performanceCard: {
        marginHorizontal: 20,
        marginTop: 16,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },
    performanceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    performanceLabel: {
        fontSize: 14,
    },
    performanceValue: {
        fontSize: 14,
        fontWeight: "600",
    },
    winLoseBar: {
        height: 12,
        backgroundColor: "#EF4444",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 4,
    },
    winBar: {
        height: "100%",
        backgroundColor: Colors.primary,
        borderRadius: 6,
    },
    winLoseLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    winLabel: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: "600",
    },
    loseLabel: {
        fontSize: 12,
        color: "#EF4444",
        fontWeight: "600",
    },
    streakRow: {
        flexDirection: "row",
        gap: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
    },
    streakItem: {
        flex: 1,
    },
    streakLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    streakValue: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    streakNumber: {
        fontSize: 16,
        fontWeight: "bold",
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
    },
    seeAll: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: "600",
    },
    badgeList: {
        gap: 16,
        paddingRight: 20,
    },
    badgeItem: {
        alignItems: "center",
        width: 80,
    },
    badgeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 10,
        textAlign: "center",
        fontWeight: "500",
        lineHeight: 14,
    },
    matchCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
    },
    matchIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: 12,
    },
    matchContent: {
        flex: 1,
    },
    matchType: {
        fontSize: 12,
        marginBottom: 2,
    },
    matchOpponent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    matchOpponentName: {
        fontSize: 14,
        fontWeight: "600",
    },
    matchResult: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    matchResultText: {
        fontSize: 10,
        fontWeight: "bold",
    },
    matchScore: {
        alignItems: "flex-end",
    },
    matchScoreText: {
        fontSize: 14,
        fontWeight: "bold",
    },
    matchMr: {
        fontSize: 10,
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    logoutBtnText: {
        color: "#EF4444",
        fontSize: 14,
        fontWeight: "600",
    },
    menuContainer: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    menuItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: "500",
    },
    menuDivider: {
        height: 1,
        marginLeft: 48,
    },
});
