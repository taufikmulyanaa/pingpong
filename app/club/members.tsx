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
    Modal,
    Alert,
    ActivityIndicator,
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
    owner_id: string;
}

interface SearchUser {
    id: string;
    name: string;
    avatar_url: string | null;
    rating_mr: number;
    level: number;
    city: string | null;
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

    // Add member modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState<string | null>(null);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const fetchClub = async () => {
        if (!clubId) return;

        const { data } = await (supabase
            .from("clubs") as any)
            .select("id, name, logo_url, member_count, avg_rating_mr, owner_id")
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

    // Check if current user is owner/admin
    const isOwnerOrAdmin = club?.owner_id === profile?.id ||
        members.some(m => m.user?.id === profile?.id && ['OWNER', 'ADMIN'].includes(m.role));

    // Search users for adding
    const searchUsers = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);

        // Get existing member IDs
        const memberIds = members.map(m => m.user?.id).filter(Boolean);

        const { data, error } = await (supabase
            .from('profiles') as any)
            .select('id, name, avatar_url, rating_mr, level, city')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
            .not('id', 'in', `(${memberIds.length > 0 ? memberIds.join(',') : 'null'})`)
            .limit(10);

        if (data) {
            setSearchResults(data);
        }
        setIsSearching(false);
    };

    // Add member
    const handleAddMember = async (userId: string) => {
        if (!clubId) return;

        setIsAdding(userId);

        const { error } = await (supabase
            .from('club_members') as any)
            .insert({
                club_id: clubId,
                user_id: userId,
                role: 'MEMBER',
                status: 'APPROVED',
                joined_at: new Date().toISOString(),
            });

        setIsAdding(null);

        if (error) {
            console.error('Error adding member:', error);
            Alert.alert('Error', 'Gagal menambahkan anggota');
        } else {
            Alert.alert('Berhasil', 'Anggota berhasil ditambahkan');
            setShowAddModal(false);
            setUserSearchQuery('');
            setSearchResults([]);
            fetchMembers();
            fetchClub();
        }
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
                    {(isOwnerOrAdmin || isLoading) ? (
                        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowAddModal(true)}>
                            <MaterialIcons name="person-add" size={24} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerBtn} />
                    )}
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

            {/* Add Member Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Tambah Anggota</Text>
                            <TouchableOpacity onPress={() => {
                                setShowAddModal(false);
                                setUserSearchQuery('');
                                setSearchResults([]);
                            }}>
                                <MaterialIcons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={[styles.modalSearchBar, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="search" size={20} color={mutedColor} />
                            <TextInput
                                style={[styles.modalSearchInput, { color: textColor }]}
                                placeholder="Cari nama atau email..."
                                placeholderTextColor={mutedColor}
                                value={userSearchQuery}
                                onChangeText={(text) => {
                                    setUserSearchQuery(text);
                                    searchUsers(text);
                                }}
                                autoFocus
                            />
                            {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
                        </View>

                        {/* Search Results */}
                        <ScrollView style={styles.modalResults}>
                            {searchResults.length === 0 && userSearchQuery.length >= 2 && !isSearching ? (
                                <View style={styles.modalEmptyState}>
                                    <MaterialIcons name="person-search" size={40} color={mutedColor} />
                                    <Text style={[styles.modalEmptyText, { color: mutedColor }]}>
                                        Tidak ditemukan pengguna
                                    </Text>
                                </View>
                            ) : userSearchQuery.length < 2 ? (
                                <View style={styles.modalEmptyState}>
                                    <MaterialIcons name="search" size={40} color={mutedColor} />
                                    <Text style={[styles.modalEmptyText, { color: mutedColor }]}>
                                        Ketik minimal 2 karakter
                                    </Text>
                                </View>
                            ) : (
                                searchResults.map((user) => (
                                    <View
                                        key={user.id}
                                        style={[styles.modalUserCard, { backgroundColor: cardColor }]}
                                    >
                                        {user.avatar_url ? (
                                            <Image source={{ uri: user.avatar_url }} style={styles.modalUserAvatar} />
                                        ) : (
                                            <View style={[styles.modalUserAvatar, { backgroundColor: Colors.primary }]}>
                                                <Text style={styles.modalUserAvatarText}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.modalUserInfo}>
                                            <Text style={[styles.modalUserName, { color: textColor }]}>{user.name}</Text>
                                            <View style={styles.modalUserStats}>
                                                <Text style={[styles.modalUserMr, { color: Colors.primary }]}>
                                                    MR {user.rating_mr}
                                                </Text>
                                                <Text style={[styles.modalUserLevel, { color: mutedColor }]}>
                                                    • Lvl {user.level}
                                                </Text>
                                                {user.city && (
                                                    <Text style={[styles.modalUserCity, { color: mutedColor }]}>
                                                        • {user.city}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.addBtn, { backgroundColor: Colors.primary }]}
                                            onPress={() => handleAddMember(user.id)}
                                            disabled={isAdding === user.id}
                                        >
                                            {isAdding === user.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <MaterialIcons name="add" size={20} color="#fff" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        maxHeight: "80%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    modalSearchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
        marginBottom: 16,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
    },
    modalResults: {
        maxHeight: 400,
    },
    modalEmptyState: {
        alignItems: "center",
        paddingVertical: 40,
        gap: 12,
    },
    modalEmptyText: {
        fontSize: 14,
        textAlign: "center",
    },
    modalUserCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        gap: 12,
    },
    modalUserAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    modalUserAvatarText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    modalUserInfo: {
        flex: 1,
    },
    modalUserName: {
        fontSize: 15,
        fontWeight: "600",
    },
    modalUserStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    modalUserMr: {
        fontSize: 12,
        fontWeight: "600",
    },
    modalUserLevel: {
        fontSize: 12,
    },
    modalUserCity: {
        fontSize: 12,
    },
    addBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
});
