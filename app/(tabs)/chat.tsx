import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    RefreshControl,
    Platform,
    StatusBar,
    Modal,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { LinearGradient } from 'expo-linear-gradient';

// App colors - updated for Premium feel
const MESSENGER = {
    primary: Colors.primary, // Teal
    background: "#F8FAFC", // Soft Slate
    surfaceGray: "#FFFFFF",
    textPrimary: Colors.secondary,
    textSecondary: Colors.muted,
    online: "#10B981",
    border: "rgba(0,0,0,0.05)",
};

export default function ChatScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // New Chat Modal State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");

    // Fetch users for new chat
    const fetchUsers = async () => {
        if (!profile?.id) return;
        setIsLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, name, avatar_url, is_online, rating_mr")
                .neq("id", profile.id)
                .order("is_online", { ascending: false })
                .order("name")
                .limit(50);

            if (data) {
                setUsers(data);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Filter users by search
    const filteredUsers = useMemo(() => {
        if (!userSearchQuery.trim()) return users;
        const query = userSearchQuery.toLowerCase();
        return users.filter(user =>
            user.name?.toLowerCase().includes(query)
        );
    }, [users, userSearchQuery]);

    // Handle opening new chat modal
    const handleOpenNewChat = () => {
        setShowNewChatModal(true);
        fetchUsers();
    };

    // Handle selecting user for new chat
    const handleSelectUser = (userId: string) => {
        setShowNewChatModal(false);
        setUserSearchQuery("");
        router.push({ pathname: "/chat/[id]", params: { id: userId } });
    };

    const fetchConversations = async () => {
        if (!profile?.id) return;

        try {
            const { data, error } = await supabase
                .from("messages")
                .select(`
                    *,
                    sender:profiles!sender_id(id, name, avatar_url, is_online),
                    receiver:profiles!receiver_id(id, name, avatar_url, is_online)
                `)
                .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) {
                console.error("Error fetching messages:", error);
                return;
            }

            if (data && data.length > 0) {
                const conversationMap = new Map();

                data.forEach((msg: any) => {
                    const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
                    const partner = msg.sender_id === profile.id ? msg.receiver : msg.sender;

                    if (!conversationMap.has(partnerId) && partner) {
                        conversationMap.set(partnerId, {
                            id: partnerId,
                            name: partner.name || "User",
                            avatar: partner.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name || "User")}&background=0084FF&color=fff`,
                            lastMessage: msg.content,
                            time: formatTime(msg.created_at),
                            unread: msg.receiver_id === profile.id && !msg.is_read ? 1 : 0,
                            online: partner.is_online || false,
                            isMe: msg.sender_id === profile.id,
                        });
                    }
                });

                const convArray = Array.from(conversationMap.values());
                if (convArray.length > 0) {
                    setConversations(convArray);
                }
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, [profile?.id]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchConversations();
    }, [profile?.id]);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Baru saja";
        if (diffMins < 60) return `${diffMins} mnt`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} jam`;
        if (diffMins < 2880) return "Kemarin";
        return `${Math.floor(diffMins / 1440)} hari`;
    };

    const filteredConversations = conversations.filter(
        (conv) => conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onlineUsers = conversations.filter((c) => c.online);

    return (
        <View style={styles.container}>
            {/* Messenger Header with Gradient */}
            <LinearGradient
                colors={[Colors.secondary, '#000830']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.headerTitle}>Chat</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.newChatBtn}
                            onPress={handleOpenNewChat}
                        >
                            <MaterialIcons name="edit" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar - Embedded in Header */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchBar}>
                            <MaterialIcons name="search" size={20} color={'rgba(255,255,255,0.6)'} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Cari percakapan..."
                                placeholderTextColor={'rgba(255,255,255,0.6)'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MESSENGER.primary} />
                }
            >
                {/* Online Users */}
                {onlineUsers.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionLabel}>Online ({onlineUsers.length})</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.onlineList}
                        >
                            {onlineUsers.map((user) => (
                                <TouchableOpacity
                                    key={user.id}
                                    style={styles.onlineItem}
                                    onPress={() => router.push({ pathname: "/chat/[id]", params: { id: user.id } })}
                                >
                                    <View style={styles.onlineAvatarWrapper}>
                                        <Image source={{ uri: user.avatar }} style={styles.onlineAvatar} />
                                        <View style={styles.onlineDot} />
                                    </View>
                                    <Text style={styles.onlineName} numberOfLines={1}>
                                        {user.name.split(" ")[0]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Conversations List */}
                <View style={[styles.sectionContainer, { marginTop: 12 }]}>
                    <Text style={styles.sectionLabel}>Pesan Terbaru</Text>

                    <View style={styles.listContainer}>
                        {filteredConversations.map((conv, index) => (
                            <TouchableOpacity
                                key={conv.id}
                                style={[
                                    styles.conversationItem,
                                    index !== filteredConversations.length - 1 && styles.conversationBorder
                                ]}
                                onPress={() => router.push({ pathname: "/chat/[id]", params: { id: conv.id } })}
                                activeOpacity={0.7}
                            >
                                <View style={styles.conversationAvatar}>
                                    <Image source={{ uri: conv.avatar }} style={styles.avatar} />
                                    {conv.online && <View style={styles.onlineDotSmall} />}
                                </View>

                                <View style={styles.conversationContent}>
                                    <View style={styles.conversationHeader}>
                                        <Text
                                            style={[
                                                styles.conversationName,
                                                conv.unread > 0 && styles.textBold,
                                            ]}
                                        >
                                            {conv.name}
                                        </Text>
                                        <Text style={styles.conversationTime}>{conv.time}</Text>
                                    </View>

                                    <View style={styles.conversationFooter}>
                                        <Text
                                            style={[
                                                styles.conversationMessage,
                                                conv.unread > 0 && styles.textBoldPrimary,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {conv.isMe ? "Anda: " : ""}{conv.lastMessage}
                                        </Text>
                                        {conv.unread > 0 && (
                                            <View style={styles.unreadBadge}>
                                                <Text style={styles.unreadText}>{conv.unread}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Empty State */}
                    {filteredConversations.length === 0 && (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <MaterialIcons name="chat-bubble-outline" size={40} color={MESSENGER.textSecondary} />
                            </View>
                            <Text style={styles.emptyTitle}>Tidak ada pesan</Text>
                            <Text style={styles.emptyDesc}>
                                Mulai percakapan dengan pemain lain
                            </Text>
                            <TouchableOpacity
                                style={styles.startChatBtn}
                                onPress={handleOpenNewChat}
                            >
                                <MaterialIcons name="add" size={20} color="#fff" />
                                <Text style={styles.startChatBtnText}>Mulai Chat</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={handleOpenNewChat}
            >
                <MaterialIcons name="edit" size={24} color="#fff" />
            </TouchableOpacity>

            {/* New Chat Modal */}
            <Modal
                visible={showNewChatModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNewChatModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chat Baru</Text>
                            <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                                <MaterialIcons name="close" size={24} color={MESSENGER.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Input */}
                        <View style={styles.modalSearchContainer}>
                            <MaterialIcons name="search" size={20} color={MESSENGER.textSecondary} />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Cari nama pemain..."
                                placeholderTextColor={MESSENGER.textSecondary}
                                value={userSearchQuery}
                                onChangeText={setUserSearchQuery}
                            />
                        </View>

                        {isLoadingUsers ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={styles.loadingText}>Memuat pengguna...</Text>
                            </View>
                        ) : filteredUsers.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <MaterialIcons name="person-search" size={48} color={MESSENGER.textSecondary} />
                                <Text style={styles.loadingText}>Tidak ada pengguna ditemukan</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredUsers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.userItem}
                                        onPress={() => handleSelectUser(item.id)}
                                    >
                                        <View style={styles.userAvatarContainer}>
                                            <Image
                                                source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || "User")}&background=random` }}
                                                style={styles.userAvatar}
                                            />
                                            {item.is_online && <View style={styles.userOnlineDot} />}
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{item.name}</Text>
                                            <Text style={styles.userMr}>MR {item.rating_mr || 1000}</Text>
                                        </View>
                                        <MaterialIcons name="chat" size={24} color={Colors.primary} />
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MESSENGER.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: 20,
    },
    headerGradient: {
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 12,
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Outfit-Bold',
        color: '#fff',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#fff',
    },

    // Sections
    sectionContainer: {
        marginTop: 12,
    },
    sectionLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: MESSENGER.textPrimary,
        marginLeft: 20,
        marginBottom: 12,
    },

    // Online List
    onlineList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    onlineItem: {
        alignItems: "center",
        width: 64,
        gap: 6,
    },
    onlineAvatarWrapper: {
        position: "relative",
    },
    onlineAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#fff',
    },
    onlineDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: MESSENGER.online,
        borderWidth: 2,
        borderColor: "#fff",
    },
    onlineName: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: MESSENGER.textSecondary,
        textAlign: "center",
    },

    // Conversations List
    listContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 8,
        borderWidth: 1,
        borderColor: MESSENGER.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    conversationItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 14,
    },
    conversationBorder: {
        borderBottomWidth: 1,
        borderBottomColor: MESSENGER.border,
    },
    conversationAvatar: {
        position: "relative",
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F1F5F9',
    },
    onlineDotSmall: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: MESSENGER.online,
        borderWidth: 2,
        borderColor: "#fff",
    },
    conversationContent: {
        flex: 1,
        gap: 4,
    },
    conversationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    conversationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    conversationName: {
        fontSize: 15,
        fontFamily: 'Outfit-SemiBold',
        color: MESSENGER.textPrimary,
    },
    textBold: {
        fontFamily: 'Outfit-Bold',
    },
    textBoldPrimary: {
        fontFamily: 'Inter-SemiBold',
        color: MESSENGER.textPrimary,
    },
    conversationMessage: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: MESSENGER.textSecondary,
        flex: 1,
        marginRight: 16,
    },
    conversationTime: {
        fontSize: 11,
        fontFamily: 'Inter-Regular',
        color: MESSENGER.textSecondary,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        color: '#fff',
    },

    // Empty State
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F1F5F9',
        justifyContent: "center",
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: MESSENGER.textPrimary,
    },
    emptyDesc: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: MESSENGER.textSecondary,
        textAlign: "center",
        lineHeight: 18,
    },
    // New Chat Button in Header
    newChatBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Start Chat Button in Empty State
    startChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 100,
        marginTop: 12,
        gap: 8,
    },
    startChatBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    // FAB
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingTop: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: MESSENGER.textPrimary,
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 12,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 15,
        color: MESSENGER.textPrimary,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: MESSENGER.textSecondary,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 14,
    },
    userAvatarContainer: {
        position: 'relative',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userOnlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: MESSENGER.online,
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: MESSENGER.textPrimary,
        marginBottom: 2,
    },
    userMr: {
        fontSize: 12,
        color: MESSENGER.textSecondary,
    },
});
