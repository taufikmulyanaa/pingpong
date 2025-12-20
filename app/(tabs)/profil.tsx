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
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { Colors, GripStyles, PlayStyles } from "@/lib/constants";
import EditProfileModal from "@/components/EditProfileModal";
import * as ImagePicker from "expo-image-picker";

import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { usePlayerStats, useMatchHistory } from "@/hooks/usePlayerStats";
import { supabase } from "@/lib/supabase";
import { uploadAvatar } from "@/lib/storage";

// Components
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsOverview from "@/components/profile/StatsOverview";
import EquipmentCard from "@/components/profile/EquipmentCard";
import PerformanceCard from "@/components/profile/PerformanceCard";
import ClubMemberCard from "@/components/profile/ClubMemberCard";

interface UserClub {
    id: string;
    name: string;
    logo_url: string | null;
    role: string;
}

export default function ProfilScreen() {
    const router = useRouter();
    const { profile, signOut, fetchProfile } = useAuthStore();

    // Fetch real stats and history
    const { badges, stats, refresh: refreshStats } = usePlayerStats(profile?.id || "");
    const { matches: historyMatches, loading: historyLoading } = useMatchHistory(profile?.id || "");

    const [refreshing, setRefreshing] = React.useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [userClub, setUserClub] = useState<UserClub | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Handle avatar upload
    const handleAvatarUpload = async () => {
        if (!profile?.id) return;

        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Izin Diperlukan", "Izinkan akses galeri untuk memilih foto");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setIsUploadingAvatar(true);

                // Convert URI to blob
                const response = await fetch(result.assets[0].uri);
                const blob = await response.blob();

                const { url, error } = await uploadAvatar(profile.id, blob);

                if (error) {
                    Alert.alert("Error", "Gagal mengunggah foto");
                    console.error("Upload error:", error);
                } else {
                    Alert.alert("Berhasil", "Foto profil berhasil diperbarui");
                    await fetchProfile();
                }

                setIsUploadingAvatar(false);
            }
        } catch (error) {
            console.error("Avatar upload error:", error);
            Alert.alert("Error", "Gagal memilih foto");
            setIsUploadingAvatar(false);
        }
    };

    // Fetch user's club membership
    const fetchUserClub = React.useCallback(async () => {
        if (!profile?.id) return;
        try {
            const { data } = await supabase
                .from('club_members')
                .select(`
                    role,
                    club:clubs!club_id(id, name, logo_url)
                `)
                .eq('user_id', profile.id)
                .eq('status', 'APPROVED')
                .limit(1)
                .single();

            if (data && (data as any).club) {
                const clubData = data as any;
                setUserClub({
                    id: clubData.club.id,
                    name: clubData.club.name,
                    logo_url: clubData.club.logo_url,
                    role: clubData.role,
                });
            }
        } catch (error) {
            // User not in any club
            setUserClub(null);
        }
    }, [profile?.id]);

    React.useEffect(() => {
        fetchUserClub();
    }, [fetchUserClub]);

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
                {/* 1. Header Section */}
                <ProfileHeader
                    profile={profile}
                    isUploadingAvatar={isUploadingAvatar}
                    onUploadAvatar={handleAvatarUpload}
                    onEditProfile={() => setShowEditModal(true)}
                    onBack={() => router.back()}
                />

                {/* 2. Stats Overview (Bento Grid) */}
                <StatsOverview
                    stats={{
                        rating: profile?.rating_mr || 1000,
                        winRate: winRate,
                        totalMatches: profile?.total_matches || 0,
                        rank: '-' // Todo: Implement Rank Calculation
                    }}
                />

                {/* 3. Club Membership Card */}
                <View style={{ paddingHorizontal: 20 }}>
                    <ClubMemberCard userClub={userClub} />
                </View>

                {/* 4. Equipment & Play Style */}
                <EquipmentCard
                    equipment={{
                        blade: profile?.equipment_blade,
                        rubberBlack: profile?.equipment_rubber_black,
                        rubberRed: profile?.equipment_rubber_red,
                        grip: profile?.grip_style ? GripStyles[profile.grip_style] : null,
                        playStyle: profile?.play_style ? PlayStyles[profile.play_style] : null
                    }}
                />

                {/* 5. Performance Stats */}
                <PerformanceCard
                    stats={{
                        totalMatches: profile?.total_matches || 0,
                        wins: profile?.wins || 0,
                        losses: profile?.losses || 0,
                        currentStreak: profile?.current_streak || 0,
                        bestWin: '-', // Todo: Implement Best Win
                        winRate: winRate
                    }}
                />

                {/* 6. Badge Collection */}
                <View style={styles.sectionHeaderContainer}>
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
                                    <View key={badge.id} style={[styles.badgeItem]}>
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
                        <Text style={{ color: mutedColor, fontStyle: 'italic', marginLeft: 20 }}>Belum ada lencana yang didapatkan.</Text>
                    )}
                </View>

                {/* 7. Match History */}
                <View style={[styles.section, { marginTop: 24 }]}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: 0, marginBottom: 12 }]}>
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

                {/* 8. Legal & About */}
                <View style={styles.section}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: 0, marginBottom: 12 }]}>
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
                    </View>
                </View>

                {/* 9. Logout Button */}
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
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: 20,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeaderContainer: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    seeAll: {
        color: Colors.primary,
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },

    // Club Card Styles
    clubMemberCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
    },
    clubMemberContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 16,
    },
    clubMemberLogo: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: Colors.secondary,
    },
    clubMemberLogoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    clubMemberInfo: {
        flex: 1,
        gap: 4,
    },
    clubMemberLabel: {
        fontSize: 10,
        fontFamily: 'Inter-Medium',
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    clubMemberName: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    clubMemberSubtext: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
    },
    clubMemberRoleBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    clubMemberRoleText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
    },

    // Badge Styles
    badgeList: {
        paddingHorizontal: 20,
        gap: 12,
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
        marginBottom: 8,
        borderWidth: 1,
    },
    badgeName: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        textAlign: "center",
    },

    // Match Styles
    matchCard: {
        flexDirection: "row",
        marginBottom: 12,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
    },
    matchIndicator: {
        width: 6,
    },
    matchContent: {
        flex: 1,
        padding: 12,
    },
    matchType: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        marginBottom: 4,
    },
    matchOpponent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    matchOpponentName: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        flex: 1,
    },
    matchResult: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    matchResultText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
    },
    matchScore: {
        justifyContent: "center",
        alignItems: "flex-end",
        paddingRight: 16,
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: "rgba(0,0,0,0.05)",
    },
    matchScoreText: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    matchMr: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },

    // Menu Styles
    menuContainer: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: "hidden",
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
        fontFamily: 'Inter-Medium',
    },
    menuDivider: {
        height: 1,
        marginLeft: 48,
    },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: "#FEF2F2",
    },
    logoutBtnText: {
        color: "#EF4444",
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
    },
});
