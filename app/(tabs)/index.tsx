import React from "react";
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
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useMatchStore } from "@/stores/matchStore";
import { Colors, getLevelTitle, getXpProgress } from "@/lib/constants";

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
    const { pendingChallenges } = useMatchStore();

    const [refreshing, setRefreshing] = React.useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchProfile();
        setRefreshing(false);
    }, []);

    const xpProgress = profile ? getXpProgress(profile.xp) : { current: 0, max: 1000, percentage: 0 };
    const levelTitle = profile ? getLevelTitle(profile.level) : "Pemula";
    const winRate = profile && profile.total_matches > 0
        ? Math.round((profile.wins / profile.total_matches) * 100)
        : 0;

    // Light mode only
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

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
                {/* Header - Navy Elegant */}
                <View style={styles.header}>
                    {/* User Profile Row */}
                    <View style={styles.headerTop}>
                        <View style={styles.userInfo}>
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={{
                                        uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name || "User"}&background=1a237e&color=fff`,
                                    }}
                                    style={styles.avatar}
                                />
                                <View style={styles.onlineIndicator} />
                            </View>
                            <View>
                                <Text style={styles.greeting}>{getGreeting()},</Text>
                                <Text style={styles.userName}>{profile?.name || "User"}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.notificationBtn}>
                            <MaterialIcons name="notifications" size={22} color="#fff" />
                            <View style={styles.notificationBadgeCount}>
                                <Text style={styles.notificationCountText}>3</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Card - Glassmorphism */}
                    <View style={styles.statsCard}>
                        {/* Level & MR Row */}
                        <View style={styles.levelInfo}>
                            <View style={styles.levelBadge}>
                                <View style={styles.levelIconGlow}>
                                    <MaterialIcons name="military-tech" size={24} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text style={styles.levelLabel}>Level {profile?.level || 1}</Text>
                                    <Text style={styles.levelTitle}>{levelTitle}</Text>
                                </View>
                            </View>
                            <View style={styles.mrBadge}>
                                <MaterialIcons name="emoji-events" size={16} color="#F59E0B" />
                                <Text style={styles.mrText}>{profile?.rating_mr || 1000}</Text>
                            </View>
                        </View>

                        {/* XP Progress */}
                        <View style={styles.xpContainer}>
                            <View style={styles.xpLabelRow}>
                                <Text style={styles.xpLabel}>XP Progress</Text>
                                <Text style={styles.xpValue}>
                                    {xpProgress.current.toLocaleString()} / {xpProgress.max.toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.xpBar}>
                                <View style={[styles.xpFillGradient, { width: `${xpProgress.percentage}%` }]} />
                            </View>
                        </View>

                        {/* Stats Hari Ini Row */}
                        <View style={styles.statRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>0</Text>
                                <Text style={styles.statLabel}>Match</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>0</Text>
                                <Text style={styles.statLabel}>Menang</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: "#22C55E" }]}>+0</Text>
                                <Text style={styles.statLabel}>MR</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Pending Challenges */}
                {pendingChallenges.length > 0 && (
                    <View style={[styles.challengeCard, { backgroundColor: Colors.primary }]}>
                        <View style={styles.challengeContent}>
                            <MaterialIcons name="notifications-active" size={24} color="#fff" />
                            <View>
                                <Text style={styles.challengeTitle}>
                                    {pendingChallenges.length} Tantangan Menunggu
                                </Text>
                                <Text style={styles.challengeSubtitle}>
                                    Ada yang ingin bertanding denganmu!
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.challengeBtn}>
                            <Text style={styles.challengeBtnText}>Lihat</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Menu Utama - Icon Only Grid */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Menu Utama</Text>
                    <View style={styles.hubGrid}>
                        <TouchableOpacity style={styles.hubItem} onPress={() => router.push("/cari")}>
                            <View style={styles.hubIconCompact}>
                                <MaterialIcons name="sports-tennis" size={26} color="#EF4444" />
                            </View>
                            <Text style={[styles.hubLabel, { color: textColor }]}>Cari Lawan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.hubItem} onPress={() => router.push("/scan")}>
                            <View style={styles.hubIconCompact}>
                                <MaterialIcons name="qr-code-scanner" size={26} color={Colors.blueMid} />
                            </View>
                            <Text style={[styles.hubLabel, { color: textColor }]}>Scan QR</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.hubItem} onPress={() => router.push("/match/quick")}>
                            <View style={styles.hubIconCompact}>
                                <MaterialIcons name="flash-on" size={26} color="#F59E0B" />
                            </View>
                            <Text style={[styles.hubLabel, { color: textColor }]}>Quick Match</Text>
                        </TouchableOpacity>



                        <TouchableOpacity style={styles.hubItem} onPress={() => router.push("/tournament" as any)}>
                            <View style={styles.hubIconCompact}>
                                <MaterialIcons name="emoji-events" size={26} color="#F59E0B" />
                            </View>
                            <Text style={[styles.hubLabel, { color: textColor }]}>Turnamen</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.hubItem} onPress={() => router.push("/venue" as any)}>
                            <View style={styles.hubIconCompact}>
                                <MaterialIcons name="place" size={26} color={Colors.primary} />
                            </View>
                            <Text style={[styles.hubLabel, { color: textColor }]}>Venue</Text>
                        </TouchableOpacity>




                        <TouchableOpacity style={styles.hubItem} onPress={() => router.push("/host" as any)}>
                            <View style={styles.hubIconCompact}>
                                <MaterialIcons name="table-restaurant" size={26} color="#10B981" />
                            </View>
                            <Text style={[styles.hubLabel, { color: textColor }]}>Host Meja</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.hubItem} onPress={() => router.push("/venue-map" as any)}>
                            <View style={styles.hubIconCompact}>
                                <MaterialIcons name="map" size={26} color="#EF4444" />
                            </View>
                            <Text style={[styles.hubLabel, { color: textColor }]}>Peta</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Active Match */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Pertandingan Aktif</Text>

                    <View style={[styles.noActiveMatch, { backgroundColor: cardColor, borderColor: "rgba(0,0,0,0.05)" }]}>
                        <MaterialIcons name="sports-tennis" size={48} color={mutedColor} />
                        <Text style={[styles.noActiveTitle, { color: textColor }]}>
                            Tidak ada pertandingan aktif
                        </Text>
                        <Text style={[styles.noActiveDesc, { color: mutedColor }]}>
                            Cari lawan atau terima tantangan untuk memulai
                        </Text>
                    </View>
                </View>


                {/* Tantangan Masuk */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="mail" size={20} color={Colors.primary} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Tantangan Masuk</Text>
                        </View>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.challengeIncomingHighlight}>
                        <Image
                            source={{ uri: "https://ui-avatars.com/api/?name=Budi+Santoso&background=1a237e&color=fff" }}
                            style={styles.challengeAvatar}
                        />
                        <View style={styles.challengeInfo}>
                            <Text style={[styles.challengeName, { color: textColor }]}>Budi Santoso</Text>
                            <View style={styles.challengeMeta}>
                                <Text style={[styles.challengeMr, { color: Colors.primary }]}>MR 1250</Text>
                                <Text style={[styles.challengeType, { color: mutedColor }]}>• Ranked Match</Text>
                            </View>
                            <Text style={[styles.challengeTime, { color: mutedColor }]}>5 menit lalu</Text>
                        </View>
                        <View style={styles.challengeActions}>
                            <TouchableOpacity style={styles.acceptBtn}>
                                <MaterialIcons name="check" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.declineBtn}>
                                <MaterialIcons name="close" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.challengeIncoming, { backgroundColor: cardColor }]}>
                        <Image
                            source={{ uri: "https://ui-avatars.com/api/?name=Dewi+Lestari&background=ec4899&color=fff" }}
                            style={styles.challengeAvatar}
                        />
                        <View style={styles.challengeInfo}>
                            <Text style={[styles.challengeName, { color: textColor }]}>Dewi Lestari</Text>
                            <View style={styles.challengeMeta}>
                                <Text style={[styles.challengeMr, { color: Colors.primary }]}>MR 980</Text>
                                <Text style={[styles.challengeType, { color: mutedColor }]}>• Friendly Match</Text>
                            </View>
                            <Text style={[styles.challengeTime, { color: mutedColor }]}>12 menit lalu</Text>
                        </View>
                        <View style={styles.challengeActions}>
                            <TouchableOpacity style={styles.acceptBtn}>
                                <MaterialIcons name="check" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.declineBtn}>
                                <MaterialIcons name="close" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Streak & Head-to-Head */}
                <View style={styles.section}>
                    <View style={styles.streakH2HContainer}>
                        {/* Streak Info */}
                        <View style={styles.streakCardHighlight}>
                            <View style={styles.streakHeader}>
                                <MaterialIcons name="local-fire-department" size={24} color="#F59E0B" />
                                <Text style={[styles.streakTitle, { color: textColor }]}>Streak</Text>
                            </View>
                            <Text style={[styles.streakValue, { color: "#F59E0B" }]}>3</Text>
                            <Text style={[styles.streakLabel, { color: "#22C55E" }]}>WIN STREAK</Text>
                        </View>

                        {/* Head-to-Head */}
                        <View style={[styles.h2hCard, { backgroundColor: cardColor }]}>
                            <Text style={[styles.h2hTitle, { color: textColor }]}>vs Lawan Terakhir</Text>
                            <View style={styles.h2hContent}>
                                <Image
                                    source={{ uri: "https://ui-avatars.com/api/?name=Rizky&background=random" }}
                                    style={styles.h2hAvatar}
                                />
                                <View style={styles.h2hStats}>
                                    <Text style={[styles.h2hName, { color: textColor }]}>Rizky Billar</Text>
                                    <Text style={styles.h2hRecord}>
                                        <Text style={{ color: "#22C55E" }}>4</Text>
                                        <Text style={{ color: mutedColor }}> - </Text>
                                        <Text style={{ color: "#EF4444" }}>2</Text>
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Peringkat Lokal */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="emoji-events" size={20} color="#F59E0B" />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Peringkat Lokal</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push("/leaderboard" as any)}>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.rankCard, { backgroundColor: cardColor }]}>
                        <View style={styles.rankPosition}>
                            <Text style={styles.rankNumber}>#12</Text>
                            <Text style={[styles.rankCity, { color: mutedColor }]}>Jakarta Selatan</Text>
                        </View>
                        <View style={styles.rankDivider} />
                        <View style={styles.rankStats}>
                            <View style={styles.rankStatItem}>
                                <Text style={[styles.rankStatValue, { color: textColor }]}>1,000</Text>
                                <Text style={[styles.rankStatLabel, { color: mutedColor }]}>MR</Text>
                            </View>
                            <View style={styles.rankStatItem}>
                                <Text style={[styles.rankStatValue, { color: "#22C55E" }]}>↑3</Text>
                                <Text style={[styles.rankStatLabel, { color: mutedColor }]}>Minggu ini</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Upcoming Match */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="event" size={20} color={Colors.primary} />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Jadwal Match</Text>
                        </View>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.upcomingCardHighlight}>
                        <View style={styles.upcomingTime}>
                            <Text style={styles.upcomingDay}>Hari Ini</Text>
                            <Text style={styles.upcomingHour}>19:00</Text>
                        </View>
                        <View style={styles.upcomingDivider} />
                        <View style={styles.upcomingInfo}>
                            <View style={styles.upcomingPlayers}>
                                <Image
                                    source={{ uri: "https://ui-avatars.com/api/?name=You&background=1a237e&color=fff" }}
                                    style={styles.upcomingAvatar}
                                />
                                <Text style={[styles.upcomingVs, { color: mutedColor }]}>vs</Text>
                                <Image
                                    source={{ uri: "https://ui-avatars.com/api/?name=Andi&background=random" }}
                                    style={styles.upcomingAvatar}
                                />
                            </View>
                            <Text style={[styles.upcomingOpponent, { color: textColor }]}>Andi Pratama</Text>
                            <View style={styles.venueLocationRow}>
                                <MaterialIcons name="place" size={14} color={mutedColor} />
                                <Text style={[styles.upcomingVenue, { color: mutedColor }]}>GOR Velodrome</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.upcomingBtn}>
                            <MaterialIcons name="chevron-right" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Venue Terdekat */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="place" size={20} color="#EF4444" />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Venue Terdekat</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push("/venue" as any)}>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueScroll}>
                        <TouchableOpacity style={[styles.venueCard, { backgroundColor: cardColor }]}>
                            <View style={styles.venueImagePlaceholder}>
                                <MaterialIcons name="sports-tennis" size={32} color={Colors.primary} />
                            </View>
                            <View style={styles.venueInfo}>
                                <Text style={[styles.venueName, { color: textColor }]}>GOR Velodrome</Text>
                                <Text style={[styles.venueDistance, { color: mutedColor }]}>1.2 km</Text>
                                <View style={styles.venueRating}>
                                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                                    <Text style={[styles.venueRatingText, { color: textColor }]}>4.8</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.venueCard, { backgroundColor: cardColor }]}>
                            <View style={styles.venueImagePlaceholder}>
                                <MaterialIcons name="sports-tennis" size={32} color="#8B5CF6" />
                            </View>
                            <View style={styles.venueInfo}>
                                <Text style={[styles.venueName, { color: textColor }]}>PTM Merdeka</Text>
                                <Text style={[styles.venueDistance, { color: mutedColor }]}>2.5 km</Text>
                                <View style={styles.venueRating}>
                                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                                    <Text style={[styles.venueRatingText, { color: textColor }]}>4.5</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Chat Terbaru */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="chat" size={20} color="#8B5CF6" />
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Chat Terbaru</Text>
                        </View>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.chatItem, { backgroundColor: cardColor }]}>
                        <View style={styles.chatAvatarContainer}>
                            <Image
                                source={{ uri: "https://ui-avatars.com/api/?name=Budi&background=random" }}
                                style={styles.chatAvatar}
                            />
                            <View style={styles.chatUnreadBadge} />
                        </View>
                        <View style={styles.chatContent}>
                            <View style={styles.chatHeader}>
                                <Text style={[styles.chatName, { color: textColor }]}>Budi Santoso</Text>
                                <Text style={[styles.chatTime, { color: mutedColor }]}>2m</Text>
                            </View>
                            <Text style={[styles.chatPreview, { color: mutedColor }]} numberOfLines={1}>
                                Siap main besok jam 7 malam?
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.chatItem, { backgroundColor: cardColor }]}>
                        <Image
                            source={{ uri: "https://ui-avatars.com/api/?name=Andi&background=random" }}
                            style={styles.chatAvatar}
                        />
                        <View style={styles.chatContent}>
                            <View style={styles.chatHeader}>
                                <Text style={[styles.chatName, { color: textColor }]}>Andi Pratama</Text>
                                <Text style={[styles.chatTime, { color: mutedColor }]}>1h</Text>
                            </View>
                            <Text style={[styles.chatPreview, { color: mutedColor }]} numberOfLines={1}>
                                GG bro, next time kita rematch ya!
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Live Tournament Banner */}
                <View style={styles.section}>
                    <View style={styles.liveBanner}>
                        <View style={styles.liveBannerContent}>
                            <View style={styles.liveTag}>
                                <Text style={styles.liveTagText}>LIVE</Text>
                            </View>
                            <Text style={styles.liveBannerTitle}>Turnamen Jakarta Open 2024</Text>
                            <Text style={styles.liveBannerSubtitle}>Final sedang berlangsung!</Text>
                        </View>
                        <TouchableOpacity style={styles.watchButton}>
                            <Text style={styles.watchButtonText}>Tonton</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Activity Feed */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Aktivitas Teman</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Activity Items */}
                    <View style={[styles.activityCard, { backgroundColor: cardColor }]}>
                        <Image
                            source={{ uri: "https://ui-avatars.com/api/?name=User&background=random" }}
                            style={styles.activityAvatar}
                        />
                        <View style={styles.activityContent}>
                            <Text style={[styles.activityText, { color: textColor }]}>
                                <Text style={styles.activityName}>Andi Pratama</Text> baru saja memenangkan pertandingan melawan{" "}
                                <Text style={styles.activityName}>Rizky Billar</Text>.
                            </Text>
                            <View style={styles.activityMeta}>
                                <Text style={[styles.activityScore, { color: mutedColor }]}>Score: 3 - 1</Text>
                                <Text style={styles.activityMr}>+25 MR</Text>
                            </View>
                            <Text style={[styles.activityTime, { color: mutedColor }]}>15 menit yang lalu</Text>
                        </View>
                    </View>

                    <View style={[styles.activityCard, { backgroundColor: cardColor }]}>
                        <Image
                            source={{ uri: "https://ui-avatars.com/api/?name=User&background=random" }}
                            style={styles.activityAvatar}
                        />
                        <View style={styles.activityContent}>
                            <Text style={[styles.activityText, { color: textColor }]}>
                                <Text style={styles.activityName}>Siti Aminah</Text> check-in di{" "}
                                <Text style={[styles.activityName, { color: Colors.primary }]}>GOR Velodrome</Text>.
                            </Text>
                            <Text style={[styles.activityTime, { color: mutedColor }]}>45 menit yang lalu</Text>
                        </View>
                        <TouchableOpacity style={styles.likeButton}>
                            <MaterialIcons name="thumb-up" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom padding for tab bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
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
        paddingBottom: 100,
    },
    header: {
        backgroundColor: "#001064",
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    avatarContainer: {
        position: "relative",
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.3)",
    },
    onlineIndicator: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: "#22C55E",
        borderWidth: 3,
        borderColor: "#001064",
    },
    greeting: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 13,
        letterSpacing: 0.3,
    },
    userName: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.12)",
        justifyContent: "center",
        alignItems: "center",
    },
    notificationBadge: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#F59E0B",
        borderWidth: 2,
        borderColor: "#001064",
    },
    notificationBadgeCount: {
        position: "absolute",
        top: 6,
        right: 6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#EF4444",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: "#001064",
    },
    notificationCountText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#fff",
    },
    statsCard: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: 18,
        gap: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    levelInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    levelBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    levelIconGlow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(245,158,11,0.2)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,
    },
    levelLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.6)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    levelTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    mrBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(245,158,11,0.15)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(245,158,11,0.3)",
    },
    mrText: {
        color: "#F59E0B",
        fontSize: 14,
        fontWeight: "700",
    },
    xpContainer: {
        gap: 8,
    },
    xpLabelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    xpLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    xpValue: {
        fontSize: 11,
        color: "rgba(255,255,255,0.8)",
        fontWeight: "600",
    },
    xpBar: {
        height: 6,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 3,
        overflow: "hidden",
    },
    xpFill: {
        height: "100%",
        backgroundColor: "#F59E0B",
        borderRadius: 3,
    },
    xpFillGradient: {
        height: "100%",
        backgroundColor: "#F59E0B",
        borderRadius: 3,
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    statRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    statLabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.5)",
        marginTop: 4,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
    },

    challengeCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        marginTop: 24,
        marginHorizontal: 20,
    },
    challengeContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    challengeTitle: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
    },
    challengeSubtitle: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 12,
    },
    challengeBtn: {
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    challengeBtnText: {
        color: Colors.primary,
        fontSize: 12,
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
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    seeAll: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: "500",
    },
    noActiveMatch: {
        padding: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: "dashed",
        alignItems: "center",
    },
    noActiveTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 12,
    },
    noActiveDesc: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 4,
    },
    hubGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        rowGap: 20,
        columnGap: 0,
    },
    hubItem: {
        width: "20%",
        alignItems: "center",
        gap: 8,
    },
    hubIconCompact: {
        width: 52,
        height: 52,
        justifyContent: "center",
        alignItems: "center",
    },
    hubLabel: {
        fontSize: 11,
        fontWeight: "500",
        textAlign: "center",
    },
    liveBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.navyDeep,
        padding: 16,
        borderRadius: 16,
        overflow: "hidden",
    },
    liveBannerContent: {
        flex: 1,
    },
    liveTag: {
        backgroundColor: "#EF4444",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: "flex-start",
        marginBottom: 4,
    },
    liveTagText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
    },
    liveBannerTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    liveBannerSubtitle: {
        color: "#93C5FD",
        fontSize: 12,
        marginTop: 2,
    },
    watchButton: {
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    watchButtonText: {
        color: Colors.blueMid,
        fontSize: 12,
        fontWeight: "bold",
    },
    activityCard: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    activityAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityText: {
        fontSize: 14,
        lineHeight: 20,
    },
    activityName: {
        fontWeight: "bold",
    },
    activityMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "rgba(0,0,0,0.03)",
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    activityScore: {
        fontSize: 12,
        fontFamily: "monospace",
    },
    activityMr: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#10B981",
    },
    activityTime: {
        fontSize: 12,
        marginTop: 8,
    },
    likeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,150,136,0.1)",
        justifyContent: "center",
        alignItems: "center",
    },

    // Tantangan Masuk Styles
    challengeIncomingHighlight: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        backgroundColor: "rgba(0,16,100,0.08)",
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    challengeIncoming: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    challengeAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    challengeInfo: {
        flex: 1,
        marginLeft: 12,
    },
    challengeName: {
        fontSize: 15,
        fontWeight: "600",
    },
    challengeMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    challengeMr: {
        fontSize: 12,
        fontWeight: "600",
    },
    challengeType: {
        fontSize: 12,
        marginLeft: 4,
    },
    challengeTime: {
        fontSize: 11,
        marginTop: 2,
    },
    challengeActions: {
        flexDirection: "row",
        gap: 8,
    },
    acceptBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#22C55E",
        justifyContent: "center",
        alignItems: "center",
    },
    declineBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(239,68,68,0.1)",
        justifyContent: "center",
        alignItems: "center",
    },

    // Streak & H2H Styles
    streakH2HContainer: {
        flexDirection: "row",
        gap: 12,
    },
    streakCardHighlight: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: "rgba(245,158,11,0.1)",
        borderWidth: 2,
        borderColor: "#F59E0B",
    },
    streakCard: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    streakHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    streakTitle: {
        fontSize: 12,
        fontWeight: "600",
    },
    streakValue: {
        fontSize: 28,
        fontWeight: "700",
    },
    streakLabel: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 1,
        marginTop: 4,
    },
    h2hCard: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    h2hTitle: {
        fontSize: 12,
        fontWeight: "500",
        marginBottom: 10,
    },
    h2hContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    h2hAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    h2hStats: {
        flex: 1,
    },
    h2hName: {
        fontSize: 14,
        fontWeight: "600",
    },
    h2hRecord: {
        fontSize: 18,
        fontWeight: "700",
        marginTop: 2,
    },

    // Rank Card Styles
    rankCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    rankPosition: {
        alignItems: "center",
        paddingRight: 20,
    },
    rankNumber: {
        fontSize: 28,
        fontWeight: "700",
        color: Colors.primary,
    },
    rankCity: {
        fontSize: 11,
        marginTop: 2,
    },
    rankDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    rankStats: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-around",
        paddingLeft: 20,
    },
    rankStatItem: {
        alignItems: "center",
    },
    rankStatValue: {
        fontSize: 18,
        fontWeight: "700",
    },
    rankStatLabel: {
        fontSize: 10,
        marginTop: 2,
    },

    // Upcoming Match Styles
    upcomingCardHighlight: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 14,
        backgroundColor: "rgba(245,158,11,0.08)",
        borderWidth: 2,
        borderColor: "#F59E0B",
    },
    upcomingCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    upcomingTime: {
        alignItems: "center",
        paddingRight: 16,
    },
    upcomingDay: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: "600",
    },
    upcomingHour: {
        fontSize: 20,
        fontWeight: "700",
        color: Colors.primary,
    },
    upcomingDivider: {
        width: 1,
        height: 50,
        backgroundColor: "rgba(0,0,0,0.1)",
    },
    upcomingInfo: {
        flex: 1,
        paddingLeft: 16,
    },
    upcomingPlayers: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    upcomingAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    upcomingVs: {
        fontSize: 11,
        fontWeight: "500",
    },
    upcomingOpponent: {
        fontSize: 14,
        fontWeight: "600",
    },
    upcomingVenue: {
        fontSize: 11,
        marginLeft: 2,
    },
    venueLocationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    upcomingBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.03)",
        justifyContent: "center",
        alignItems: "center",
    },

    // Venue Card Styles
    venueScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    venueCard: {
        width: 160,
        borderRadius: 14,
        marginRight: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    venueImagePlaceholder: {
        height: 80,
        backgroundColor: "rgba(0,0,0,0.03)",
        justifyContent: "center",
        alignItems: "center",
    },
    venueInfo: {
        padding: 12,
    },
    venueName: {
        fontSize: 14,
        fontWeight: "600",
    },
    venueDistance: {
        fontSize: 11,
        marginTop: 2,
    },
    venueRating: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
    },
    venueRatingText: {
        fontSize: 12,
        fontWeight: "600",
    },

    // Chat Styles
    chatItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    chatAvatarContainer: {
        position: "relative",
    },
    chatAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    chatUnreadBadge: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: "#fff",
    },
    chatContent: {
        flex: 1,
        marginLeft: 12,
    },
    chatHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    chatName: {
        fontSize: 15,
        fontWeight: "600",
    },
    chatTime: {
        fontSize: 11,
    },
    chatPreview: {
        fontSize: 13,
        marginTop: 2,
    },
});
