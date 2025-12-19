import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface ClubMember {
    id: string;
    role: string;
    status: string;
    joined_at: string;
    user: {
        id: string;
        name: string;
        avatar_url: string | null;
        rating_mr: number;
        level: number;
        is_online: boolean;
        city: string;
    };
}

interface Club {
    id: string;
    name: string;
    logo_url: string | null;
    member_count: number;
    avg_rating_mr: number;
}

type FilterType = "all" | "admin" | "top" | "online";

export default function ClubMembersScreen() {
    const router = useRouter();
    const { id: clubId } = useLocalSearchParams<{ id: string }>();
    const { profile } = useAuthStore();

    const [club, setClub] = useState<Club | null>(null);
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const fetchClub = async () => {
        if (!clubId) return;

        const { data } = await supabase
            .from("clubs")
            .select("id, name, logo_url, member_count, avg_rating_mr")
            .eq("id", clubId)
            .single();

        if (data) setClub(data);
    };

    const fetchMembers = async () => {
        if (!clubId) return;

        const { data, error } = await supabase
            .from("club_members")
            .select(`
                id,
                role,
                status,
                joined_at,
                user:profiles!user_id(
                    id,
                    name,
                    avatar_url,
                    rating_mr,
                    level,
                    is_online,
                    city
                )
            `)
            .eq("club_id", clubId)
            .eq("status", "APPROVED")
            .order("role", { ascending: true });

        if (data) {
            // Sort by role priority (OWNER > ADMIN > COACH > MEMBER), then by MR
            const roleOrder = { OWNER: 0, ADMIN: 1, COACH: 2, MEMBER: 3 };
            const sorted = (data as any[]).sort((a, b) => {
                const roleCompare = roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
                if (roleCompare !== 0) return roleCompare;
                return (b.user?.rating_mr || 0) - (a.user?.rating_mr || 0);
            });
            setMembers(sorted);
        }

        setIsLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchClub();
        fetchMembers();
    }, [clubId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchClub();
        fetchMembers();
    };

    // Filter members
    const filteredMembers = members.filter((m) => {
        const user = m.user;
        if (!user) return false;

        // Search filter
        if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Type filter
        switch (filter) {
            case "admin":
                return ["OWNER", "ADMIN", "COACH"].includes(m.role);
            case "top":
                return user.rating_mr >= 1200;
            case "online":
                return user.is_online;
            default:
                return true;
        }
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "OWNER":
                return { label: "Owner", color: "#F59E0B", icon: "star" as const };
            case "ADMIN":
                return { label: "Admin", color: "#8B5CF6", icon: "admin-panel-settings" as const };
            case "COACH":
                return { label: "Pelatih", color: "#10B981", icon: "sports" as const };
            default:
                return null;
        }
    };

    const getLevelTitle = (level: number): string => {
        if (level <= 5) return "Pemula";
        if (level <= 15) return "Amatir";
        if (level <= 30) return "Semi-Pro";
        if (level <= 50) return "Pro";
        return "Master";
    };

    const onlineCount = members.filter((m) => m.user?.is_online).length;
    const adminCount = members.filter((m) => ["OWNER", "ADMIN", "COACH"].includes(m.role)).length;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Custom Navy Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Anggota PTM</Text>
                    <View style={styles.headerBtn} />
                </View>
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
                        <MaterialIcons name="groups" size={24} color="#fff" />
                        <Text style={styles.statValue}>{club?.member_count || 0}</Text>
                        <Text style={styles.statLabel}>Total Anggota</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#F59E0B" }]}>
                        <MaterialIcons name="emoji-events" size={24} color="#fff" />
                        <Text style={styles.statValue}>{club?.avg_rating_mr || 1000}</Text>
                        <Text style={styles.statLabel}>Rata-rata MR</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#10B981" }]}>
                        <MaterialIcons name="circle" size={24} color="#fff" />
                        <Text style={styles.statValue}>{onlineCount}</Text>
                        <Text style={styles.statLabel}>Online</Text>
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: cardColor }]}>
                        <MaterialIcons name="search" size={20} color={mutedColor} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder="Cari anggota..."
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <MaterialIcons name="close" size={20} color={mutedColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        {[
                            { key: "all", label: "Semua", icon: "people" },
                            { key: "admin", label: "Pengurus", icon: "admin-panel-settings" },
                            { key: "top", label: "Top Rated", icon: "trending-up" },
                            { key: "online", label: "Online", icon: "circle" },
                        ].map((f) => (
                            <TouchableOpacity
                                key={f.key}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: filter === f.key ? Colors.primary : cardColor,
                                    },
                                ]}
                                onPress={() => setFilter(f.key as FilterType)}
                            >
                                <MaterialIcons
                                    name={f.icon as any}
                                    size={16}
                                    color={filter === f.key ? "#fff" : mutedColor}
                                />
                                <Text
                                    style={[
                                        styles.filterChipText,
                                        { color: filter === f.key ? "#fff" : mutedColor },
                                    ]}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Member List */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {filteredMembers.map((member) => {
                        const user = member.user;
                        if (!user) return null;

                        const roleBadge = getRoleBadge(member.role);

                        return (
                            <TouchableOpacity
                                key={member.id}
                                style={[styles.memberCard, { backgroundColor: cardColor }]}
                                onPress={() => router.push({ pathname: "/player/[id]", params: { id: user.id } })}
                            >
                                <View style={styles.memberLeft}>
                                    <View style={styles.avatarContainer}>
                                        <Image
                                            source={{
                                                uri: user.avatar_url ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=001064&color=fff`,
                                            }}
                                            style={styles.avatar}
                                        />
                                        {user.is_online && <View style={styles.onlineDot} />}
                                    </View>

                                    <View style={styles.memberInfo}>
                                        <View style={styles.nameRow}>
                                            <Text style={[styles.memberName, { color: textColor }]}>
                                                {user.name}
                                            </Text>
                                            {roleBadge && (
                                                <View style={[styles.roleBadge, { backgroundColor: `${roleBadge.color}20` }]}>
                                                    <MaterialIcons name={roleBadge.icon} size={12} color={roleBadge.color} />
                                                    <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>
                                                        {roleBadge.label}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.memberSubtitle, { color: mutedColor }]}>
                                            Level {user.level} • {getLevelTitle(user.level)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.memberRight}>
                                    <View style={styles.mrBadge}>
                                        <MaterialIcons name="emoji-events" size={14} color="#F59E0B" />
                                        <Text style={styles.mrText}>{user.rating_mr}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Empty State */}
                    {filteredMembers.length === 0 && !isLoading && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="people-outline" size={48} color={mutedColor} />
                            <Text style={[styles.emptyText, { color: mutedColor }]}>
                                {searchQuery ? "Tidak ada anggota ditemukan" : "Belum ada anggota"}
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
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
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    statsContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
        marginTop: 8,
    },
    statLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.8)",
        marginTop: 2,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    filterContainer: {
        paddingTop: 12,
    },
    filterScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: "500",
    },
    scrollView: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    memberCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    memberLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    avatarContainer: {
        position: "relative",
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    onlineDot: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#10B981",
        borderWidth: 2,
        borderColor: "#fff",
    },
    memberInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    memberName: {
        fontSize: 15,
        fontWeight: "600",
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: "600",
    },
    memberSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    memberRight: {
        alignItems: "flex-end",
    },
    mrBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    mrText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#B45309",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12,
    },
});
