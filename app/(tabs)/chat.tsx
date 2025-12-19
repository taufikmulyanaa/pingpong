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
import { useRouter } from "expo-router";
import { Colors } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

// App colors
const MESSENGER = {
    primary: "#001064",
    background: "#fff",
    surfaceGray: "#F0F2F5",
    textPrimary: "#050505",
    textSecondary: "#65676B",
    online: "#31A24C",
    border: "#E4E6EB",
};

export default function ChatScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"chats" | "online">("chats");

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
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Messenger Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "User")}&background=0084FF&color=fff` }}
                        style={styles.profileAvatar}
                    />
                    <Text style={styles.headerTitle}>Chat</Text>
                </View>
                <View style={styles.headerRight}>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <MaterialIcons name="search" size={20} color={MESSENGER.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cari"
                        placeholderTextColor={MESSENGER.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Stories / Online Section */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.storiesContainer}
                contentContainerStyle={styles.storiesContent}
            >
                {/* Online Users */}
                {onlineUsers.map((user) => (
                    <TouchableOpacity
                        key={user.id}
                        style={styles.storyItem}
                        onPress={() => router.push({ pathname: "/chat/[id]", params: { id: user.id } })}
                    >
                        <View style={styles.storyAvatarWrapper}>
                            <Image source={{ uri: user.avatar }} style={styles.storyAvatar} />
                            <View style={styles.storyOnlineDot} />
                        </View>
                        <Text style={styles.storyName} numberOfLines={1}>
                            {user.name.split(" ")[0]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Conversations List */}
            <ScrollView
                style={styles.conversationsList}
                contentContainerStyle={styles.conversationsContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MESSENGER.primary} />
                }
            >
                {filteredConversations.map((conv) => (
                    <TouchableOpacity
                        key={conv.id}
                        style={styles.conversationItem}
                        onPress={() => router.push({ pathname: "/chat/[id]", params: { id: conv.id } })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.conversationAvatar}>
                            <Image source={{ uri: conv.avatar }} style={styles.avatar} />
                            {conv.online && <View style={styles.onlineDot} />}
                        </View>

                        <View style={styles.conversationContent}>
                            <Text
                                style={[
                                    styles.conversationName,
                                    conv.unread > 0 && styles.conversationNameUnread,
                                ]}
                            >
                                {conv.name}
                            </Text>
                            <View style={styles.conversationPreview}>
                                <Text
                                    style={[
                                        styles.conversationMessage,
                                        conv.unread > 0 && styles.conversationMessageUnread,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {conv.isMe ? "Anda: " : ""}{conv.lastMessage}
                                </Text>
                                <Text style={styles.conversationTime}> · {conv.time}</Text>
                            </View>
                        </View>

                        {conv.unread > 0 && (
                            <View style={styles.unreadDot} />
                        )}
                    </TouchableOpacity>
                ))}

                {/* Empty State */}
                {filteredConversations.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <MaterialIcons name="chat" size={48} color={MESSENGER.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Tidak ada pesan</Text>
                        <Text style={styles.emptyDesc}>
                            Mulai percakapan dengan pemain lain sekarang!
                        </Text>
                        <TouchableOpacity style={styles.emptyBtn}>
                            <Text style={styles.emptyBtnText}>Mulai Chat Baru</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MESSENGER.background,
    },

    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    profileAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "bold",
        color: MESSENGER.textPrimary,
    },
    headerRight: {
        flexDirection: "row",
        gap: 8,
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: MESSENGER.surfaceGray,
        justifyContent: "center",
        alignItems: "center",
    },

    // Search
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: MESSENGER.surfaceGray,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: MESSENGER.textPrimary,
    },

    // Stories
    storiesContainer: {
        maxHeight: 110,
        borderBottomWidth: 1,
        borderBottomColor: MESSENGER.border,
    },
    storiesContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 16,
    },
    storyItem: {
        alignItems: "center",
        width: 70,
    },
    addStoryCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: MESSENGER.surfaceGray,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
    },
    storyAvatarWrapper: {
        position: "relative",
        marginBottom: 4,
    },
    storyAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
        borderColor: MESSENGER.primary,
    },
    storyOnlineDot: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: MESSENGER.online,
        borderWidth: 2,
        borderColor: "#fff",
    },
    storyName: {
        fontSize: 12,
        color: MESSENGER.textSecondary,
        textAlign: "center",
    },

    // Conversations
    conversationsList: {
        flex: 1,
    },
    conversationsContent: {
        paddingTop: 8,
    },
    conversationItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    conversationAvatar: {
        position: "relative",
        marginRight: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    onlineDot: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: MESSENGER.online,
        borderWidth: 2,
        borderColor: "#fff",
    },
    conversationContent: {
        flex: 1,
    },
    conversationName: {
        fontSize: 15,
        fontWeight: "500",
        color: MESSENGER.textPrimary,
        marginBottom: 2,
    },
    conversationNameUnread: {
        fontWeight: "700",
    },
    conversationPreview: {
        flexDirection: "row",
        alignItems: "center",
    },
    conversationMessage: {
        fontSize: 14,
        color: MESSENGER.textSecondary,
        flex: 1,
    },
    conversationMessageUnread: {
        color: MESSENGER.textPrimary,
        fontWeight: "600",
    },
    conversationTime: {
        fontSize: 14,
        color: MESSENGER.textSecondary,
    },
    unreadDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: MESSENGER.primary,
        marginLeft: 8,
    },

    // Empty State
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: MESSENGER.surfaceGray,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: MESSENGER.textPrimary,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 14,
        color: MESSENGER.textSecondary,
        textAlign: "center",
        marginBottom: 20,
    },
    emptyBtn: {
        backgroundColor: MESSENGER.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    emptyBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
});
