import React from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    Platform,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useMatchStore } from "@/stores/matchStore";
import { Colors, getLevelTitle, getXpProgress } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from 'expo-linear-gradient';

// Helper to get greeting based on time
const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
};

export default function HomeScreen() {
    const router = useRouter();
    const { profile, fetchProfile } = useAuthStore();
    const { pendingChallenges, matches, fetchMatches, fetchChallenges } = useMatchStore();

    const [refreshing, setRefreshing] = React.useState(false);
    const [unreadNotifications, setUnreadNotifications] = React.useState(0);
    const [dailyStats, setDailyStats] = React.useState({ matches: 0, wins: 0, mrChange: 0 });
    const [nearbyClubs, setNearbyClubs] = React.useState<any[]>([]);
    const [pendingMemberRequests, setPendingMemberRequests] = React.useState(0);

    const fetchUnreadNotifications = async () => {
        if (!profile?.id) return;
        const { count } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id)
            .eq("is_read", false);

        if (count !== null) setUnreadNotifications(count);
    };

    const fetchNearbyClubs = async () => {
        try {
            const { data, error } = await supabase
                .from('clubs')
                .select('id, name, city, logo_url, avg_rating_mr, member_count')
                .eq('is_active', true)
                .limit(3);

            if (error) throw error;
            if (data) setNearbyClubs(data);
        } catch (error) {
            console.error("Error fetching clubs:", error);
        }
    };

    const fetchPendingMemberRequests = async () => {
        if (!profile?.id) return;
        try {
            // Get clubs where current user is owner
            const { data: ownedClubs } = await (supabase
                .from('clubs') as any)
                .select('id')
                .eq('owner_id', profile.id);

            if (!ownedClubs || ownedClubs.length === 0) {
                setPendingMemberRequests(0);
                return;
            }

            const clubIds = (ownedClubs as { id: string }[]).map(c => c.id);

            // Count pending member requests for owned clubs
            const { count } = await supabase
                .from('club_members')
                .select('*', { count: 'exact', head: true })
                .in('club_id', clubIds)
                .eq('status', 'PENDING');

            setPendingMemberRequests(count || 0);
        } catch (error) {
            console.error("Error fetching pending requests:", error);
        }
    };

    React.useEffect(() => {
        if (profile?.id) {
            fetchChallenges(profile.id);
            fetchUnreadNotifications();
        }
    }, [profile?.id]);

    const fetchData = React.useCallback(async () => {
        if (!profile?.id) return;

        console.log("Fetching Home Data for:", profile.id);

        await Promise.all([
            fetchProfile(), // This should update the profile in store
            fetchUnreadNotifications(),
            fetchChallenges(profile.id),
            fetchMatches(profile.id),
            fetchNearbyClubs(),
            fetchPendingMemberRequests(),
        ]);

        console.log("Home Data Fetched. Current Profile MR:", useAuthStore.getState().profile?.rating_mr);
    }, [profile?.id]);

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);

    // Calculate daily stats from matches
    React.useEffect(() => {
        if (!matches || !profile?.id) return;

        const today = new Date().toDateString();
        const todaysMatches = matches.filter(m =>
            m.status === 'COMPLETED' &&
            new Date(m.completed_at!).toDateString() === today
        );

        const wins = todaysMatches.filter(m => m.winner_id === profile.id).length;

        let mrChange = 0;
        todaysMatches.forEach(m => {
            if (m.player1_id === profile.id) {
                mrChange += m.player1_rating_change || 0;
            } else if (m.player2_id === profile.id) {
                mrChange += m.player2_rating_change || 0;
            }
        });

        setDailyStats({
            matches: todaysMatches.length,
            wins,
            mrChange
        });

    }, [matches, profile?.id]);


    const xpProgress = profile ? getXpProgress(profile.xp) : { current: 0, max: 1000, percentage: 0 };
    const levelTitle = profile ? getLevelTitle(profile.level) : "Pemula";

    // Light mode only for premium feel
    const bgColor = '#FFFFFF'; // Soft Slate
    const cardColor = '#FFFFFF';
    const textColor = Colors.secondary; // Deep Blue for main text
    const mutedColor = Colors.muted;
    const borderColor = 'rgba(0,0,0,0.05)';
    const shadowStyle = {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header with Luxury LinearGradient */}
            <LinearGradient
                colors={[Colors.secondary, '#000830']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                {/* Abstract Background Decorations */}
                <View style={styles.bgDecorationCircle1} />
                <View style={styles.bgDecorationCircle2} />

                <SafeAreaView edges={['top']}>
                    <View style={styles.headerTop}>
                        <View style={styles.userInfo}>
                            <View style={styles.avatarContainer}>
                                <View style={styles.avatarBorderGlow}>
                                    <Image
                                        source={{
                                            uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name || "User"}&background=1a237e&color=fff`,
                                        }}
                                        style={styles.avatar}
                                    />
                                </View>
                                <View style={styles.onlineIndicator} />
                            </View>
                            <View>
                                <Text style={styles.greeting}>{getGreeting()},</Text>
                                <Text style={styles.userName}>{profile?.name || "User"}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.notificationBtn}
                            onPress={() => router.push("/notifications")}
                        >
                            <MaterialIcons name="notifications-none" size={24} color="#fff" />
                            {unreadNotifications > 0 && (
                                <View style={styles.notificationBadgeCount}>
                                    <Text style={styles.notificationCountText}>
                                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Quick Stats Card - Premium Glassmorphism */}
                    <View style={styles.statsCardWrapper}>
                        <View style={styles.statsCardGlass}>
                            {/* Subtle white overlay for glass feel */}
                            <View style={styles.glassOverlay} />

                            {/* Content */}
                            <View style={{ gap: 16 }}>
                                {/* Level & MR Row */}
                                <View style={styles.levelInfo}>
                                    <View style={styles.levelBadge}>
                                        <View style={styles.levelIconGlow}>
                                            <MaterialIcons name="military-tech" size={24} color="#FFD700" />
                                        </View>
                                        <View>
                                            <Text style={styles.levelLabel}>Current Rank</Text>
                                            <Text style={styles.levelTitle}>{levelTitle}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.mrBadge}>
                                        <View style={styles.mrIcon}>
                                            <MaterialIcons name="emoji-events" size={14} color="#fff" />
                                        </View>
                                        <Text style={styles.mrText}>{profile?.rating_mr || 1000} MR</Text>
                                    </View>
                                </View>

                                {/* XP Progress */}
                                <View style={styles.xpContainer}>
                                    <View style={styles.xpLabelRow}>
                                        <Text style={styles.xpLabel}>Level {profile?.level || 1} Progress</Text>
                                        <Text style={styles.xpValue}>
                                            {xpProgress.current.toLocaleString()} / {xpProgress.max.toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.xpBarBackground}>
                                        <LinearGradient
                                            colors={['#F59E0B', '#FBBF24']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[styles.xpBarFill, { width: `${xpProgress.percentage}%` }]}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
            >
                {/* Spacer because header is tall */}
                <View style={{ height: 24 }} />

                {/* Hub Actions Grid */}
                <View style={[styles.section, { paddingHorizontal: 20 }]}>
                    <View style={styles.hubGrid}>
                        {[
                            { icon: "search", label: "Cari Lawan", route: "/cari", color: "#EF4444" },
                            { icon: "groups", label: "Klub PTM", route: "/club", color: "#8B5CF6" },
                            { icon: "leaderboard", label: "Ranking", route: "/leaderboard", color: "#F59E0B" },
                            { icon: "flash-on", label: "Quick Match", route: "/match/quick", color: "#F59E0B" },
                            { icon: "qr-code-scanner", label: "Scan QR", route: "/scan", color: Colors.blueMid },
                            { icon: "emoji-events", label: "Turnamen", route: "/tournament", color: "#F59E0B" },

                        ].map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.hubItem, { backgroundColor: cardColor, borderColor }, shadowStyle]}
                                onPress={() => router.push(item.route as any)}
                            >
                                <View style={[styles.hubIconCircle, { backgroundColor: item.color + '10' }]}>
                                    <MaterialIcons name={item.icon as any} size={26} color={item.color} />
                                </View>
                                <Text style={[styles.hubLabel, { color: textColor }]}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Daily Stats Row - Clean Style */}
                <View style={[styles.section, { paddingHorizontal: 20, marginTop: 8 }]}>
                    <View style={[styles.dailyStatsCard, { backgroundColor: cardColor, borderColor }, shadowStyle]}>
                        <View style={styles.dailyStatItem}>
                            <Text style={[styles.dailyStatValue, { color: textColor }]}>{dailyStats.matches}</Text>
                            <Text style={styles.dailyStatLabel}>Match</Text>
                        </View>
                        <View style={styles.dailyStatDivider} />
                        <View style={styles.dailyStatItem}>
                            <Text style={[styles.dailyStatValue, { color: '#10B981' }]}>{dailyStats.wins}</Text>
                            <Text style={styles.dailyStatLabel}>Menang</Text>
                        </View>
                        <View style={styles.dailyStatDivider} />
                        <View style={styles.dailyStatItem}>
                            <Text style={[styles.dailyStatValue, { color: dailyStats.mrChange >= 0 ? "#10B981" : "#EF4444" }]}>
                                {dailyStats.mrChange > 0 ? "+" : ""}{dailyStats.mrChange}
                            </Text>
                            <Text style={styles.dailyStatLabel}>MR</Text>
                        </View>
                    </View>
                </View>

                {/* Pending Member Requests for PTM Owners */}
                {pendingMemberRequests > 0 && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.alertCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                            onPress={() => router.push("/club/approval" as any)}
                        >
                            <View style={styles.alertIcon}>
                                <MaterialIcons name="notifications-active" size={24} color="#EF4444" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.alertTitle, { color: '#991B1B' }]}>
                                    {pendingMemberRequests} Permintaan Bergabung
                                </Text>
                                <Text style={[styles.alertDesc, { color: '#B91C1C' }]}>
                                    Ada anggota ingin join PTM kamu
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tantangan Masuk */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Tantangan Masuk</Text>
                        {pendingChallenges.length > 0 && (
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeCountText}>{pendingChallenges.length}</Text>
                            </View>
                        )}
                    </View>

                    {pendingChallenges.length > 0 ? (
                        <View style={{ gap: 12 }}>
                            {pendingChallenges.map((challenge: any) => (
                                <View key={challenge.id} style={[styles.challengeCard, { backgroundColor: cardColor, borderColor }, shadowStyle]}>
                                    <View style={styles.challengeHeader}>
                                        <Image
                                            source={{ uri: challenge.challenger?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(challenge.challenger?.name || "User")}&background=random` }}
                                            style={styles.challengeAvatar}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.challengeName, { color: textColor }]}>{challenge.challenger?.name || "Pemain"}</Text>
                                            <Text style={styles.challengeMeta}>
                                                {challenge.match_type === "RANKED" ? "Ranked Match" : "Friendly Match"} • Best of {challenge.best_of}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.challengeActions}>
                                        <TouchableOpacity
                                            style={[styles.challengeBtn, styles.declineBtn]}
                                            onPress={() => {
                                                const { respondToChallenge, fetchChallenges } = useMatchStore.getState();
                                                respondToChallenge(challenge.id, false).then(() => {
                                                    if (profile?.id) fetchChallenges(profile.id);
                                                });
                                            }}
                                        >
                                            <Text style={styles.declineBtnText}>Tolak</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.challengeBtn, styles.acceptBtn]}
                                            onPress={() => {
                                                const { respondToChallenge, fetchChallenges } = useMatchStore.getState();
                                                respondToChallenge(challenge.id, true).then(() => {
                                                    if (profile?.id) fetchChallenges(profile.id);
                                                });
                                            }}
                                        >
                                            <Text style={styles.acceptBtnText}>Terima</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: cardColor, borderColor, borderStyle: 'dashed' }]}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                <MaterialIcons name="mail-outline" size={24} color={mutedColor} />
                            </View>
                            <Text style={[styles.emptyStateText, { color: mutedColor }]}>Belum ada tantangan masuk</Text>
                        </View>
                    )}
                </View>


                {/* Streak & H2H */}
                <View style={styles.section}>
                    <View style={styles.grid2}>
                        {/* Streak */}
                        <View style={[styles.statBox, { backgroundColor: cardColor, borderColor }, shadowStyle]}>
                            <View style={[styles.statBoxIcon, { backgroundColor: '#FFF7ED' }]}>
                                <MaterialIcons name="local-fire-department" size={24} color="#F59E0B" />
                            </View>
                            <View>
                                <Text style={[styles.statBoxValue, { color: textColor }]}>{profile?.current_streak || 0}</Text>
                                <Text style={styles.statBoxLabel}>Win Streak</Text>
                            </View>
                        </View>

                        {/* Recent Match */}
                        <TouchableOpacity
                            style={[styles.statBox, { backgroundColor: cardColor, borderColor }, shadowStyle]}
                            onPress={() => router.push('/match/history' as any)}
                        >
                            <View style={[styles.statBoxIcon, { backgroundColor: '#EFF6FF' }]}>
                                <MaterialIcons name="history" size={24} color={Colors.primary} />
                            </View>
                            {matches.length > 0 && matches[0].status === 'COMPLETED' ? (
                                <View>
                                    <Text style={[styles.statBoxValue, { color: textColor, fontSize: 16 }]}>
                                        {matches[0].winner_id === profile?.id ? "WIN" : "LOSS"}
                                    </Text>
                                    <Text style={[styles.statBoxLabel, { fontSize: 10 }]} numberOfLines={1}>
                                        vs {matches[0].winner_id === profile?.id ?
                                            (matches[0].player1_id === profile?.id ? (matches[0].player2 as any)?.name : (matches[0].player1 as any)?.name) :
                                            (matches[0].winner as any)?.name}
                                    </Text>
                                </View>
                            ) : (
                                <View>
                                    <Text style={[styles.statBoxValue, { color: mutedColor, fontSize: 13 }]}>No Match</Text>
                                    <Text style={styles.statBoxLabel}>Last Game</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* PTM Terdekat */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>PTM Terdekat</Text>
                        <TouchableOpacity onPress={() => router.push("/club" as any)}>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    {nearbyClubs.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubList}>
                            {nearbyClubs.map((club) => (
                                <TouchableOpacity
                                    key={club.id}
                                    style={[styles.clubCard, { backgroundColor: cardColor, borderColor }, shadowStyle]}
                                    onPress={() => router.push({ pathname: "/club/[id]", params: { id: club.id } })}
                                >
                                    <Image
                                        source={{ uri: club.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=random` }}
                                        style={styles.clubLogo}
                                    />
                                    <View style={styles.clubInfo}>
                                        <Text style={[styles.clubName, { color: textColor }]} numberOfLines={1}>{club.name}</Text>
                                        <Text style={styles.clubCity} numberOfLines={1}>{club.city}</Text>

                                        <View style={styles.clubStatsRow}>
                                            <View style={styles.clubStat}>
                                                <MaterialIcons name="star" size={12} color="#F59E0B" />
                                                <Text style={styles.clubStatText}>{club.avg_rating_mr || "-"}</Text>
                                            </View>
                                            <View style={styles.clubStat}>
                                                <MaterialIcons name="group" size={12} color={mutedColor} />
                                                <Text style={styles.clubStatText}>{club.member_count || 0}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: cardColor, borderColor, borderStyle: 'dashed' }]}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: '#F3F4F6' }]}>
                                <MaterialIcons name="location-off" size={24} color={mutedColor} />
                            </View>
                            <Text style={[styles.emptyStateText, { color: mutedColor }]}>Belum ada PTM di sekitar</Text>
                        </View>
                    )}
                </View>

                {/* Bottom padding for tab bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
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
        paddingBottom: 40,
    },
    headerGradient: {
        paddingBottom: 24,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        position: 'relative',
        overflow: 'hidden',
    },
    // Decorations
    bgDecorationCircle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    bgDecorationCircle2: {
        position: 'absolute',
        top: 100,
        left: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },

    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 12,
        marginBottom: 24,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatarBorderGlow: {
        padding: 2,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#1E1A4E', // Match gradient bg
    },
    greeting: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 0.5,
    },
    userName: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#fff',
        letterSpacing: 0.5,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    notificationBadgeCount: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#EF4444',
        borderRadius: 6,
        width: 8,
        height: 8,
    },
    notificationCountText: {
        display: 'none', // just show dot for premium look
    },

    // Stats Card Overlay
    statsCardWrapper: {
        paddingHorizontal: 20,
    },
    statsCardGlass: {
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        position: 'relative',
        overflow: 'hidden',
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    levelInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    levelIconGlow: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        // Glow effect
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    levelLabel: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    levelTitle: {
        fontSize: 17,
        fontFamily: 'Outfit-Bold',
        color: '#fff',
        letterSpacing: 0.5,
    },
    mrBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    mrIcon: {
        backgroundColor: '#F59E0B',
        padding: 3,
        borderRadius: 6,
    },
    mrText: {
        color: '#fff',
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    xpContainer: {
        gap: 8,
    },
    xpLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    xpLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Inter-Medium',
    },
    xpValue: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'Inter-SemiBold',
    },
    xpBarBackground: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        borderRadius: 3,
    },

    // Hub Grid
    section: {
        marginBottom: 24,
    },
    hubGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    hubItem: {
        width: '31%',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 10,
    },
    hubIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hubLabel: {
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
        textAlign: 'center',
        letterSpacing: -0.2,
    },

    // Daily Stats
    dailyStatsCard: {
        flexDirection: 'row',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    dailyStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    dailyStatValue: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
    },
    dailyStatLabel: {
        fontSize: 11,
        fontFamily: 'Inter-SemiBold',
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dailyStatDivider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },

    // Alerts
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginHorizontal: 20,
        borderWidth: 1,
        gap: 12,
    },
    alertIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertTitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
    },
    alertDesc: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
    },

    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        letterSpacing: -0.5,
    },
    badgeCount: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeCountText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: 'Inter-Bold',
    },
    seeAll: {
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
        color: Colors.primary,
    },

    // Challenge Card
    challengeCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    challengeAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    challengeName: {
        fontSize: 16,
        fontFamily: 'Outfit-SemiBold',
    },
    challengeMeta: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        color: Colors.muted,
        marginTop: 2,
    },
    challengeActions: {
        flexDirection: 'row',
        gap: 12,
    },
    challengeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    declineBtn: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    declineBtnText: {
        color: '#6B7280',
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
    },
    acceptBtn: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 2,
    },
    acceptBtnText: {
        color: '#fff',
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
    },

    // Empty State
    emptyState: {
        marginHorizontal: 20,
        padding: 32,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    emptyIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
    },

    // Grid 2 (Streak / H2H)
    grid2: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
    },
    statBox: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'flex-start',
        gap: 12,
        minHeight: 110,
    },
    statBoxIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statBoxValue: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
    },
    statBoxLabel: {
        fontSize: 11,
        fontFamily: 'Inter-SemiBold',
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Club Horizontal List
    clubList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    clubCard: {
        width: 250,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    clubLogo: {
        width: 56,
        height: 56,
        borderRadius: 16,
    },
    clubInfo: {
        flex: 1,
        gap: 4,
    },
    clubName: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
    },
    clubCity: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
    },
    clubStatsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 6,
    },
    clubStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    clubStatText: {
        fontSize: 11,
        fontFamily: 'Inter-SemiBold',
        color: Colors.muted,
    },

});
