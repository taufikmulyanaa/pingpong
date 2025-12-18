import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    TextInput,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

// Mock data removed

export default function ChatScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const { profile } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [conversations, setConversations] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchConversations = async () => {
        if (!profile?.id) return;

        try {
            // Get latest message per conversation partner
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
                // Group by conversation partner
                const conversationMap = new Map();

                data.forEach((msg: any) => {
                    const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
                    const partner = msg.sender_id === profile.id ? msg.receiver : msg.sender;

                    if (!conversationMap.has(partnerId) && partner) {
                        conversationMap.set(partnerId, {
                            id: partnerId,
                            name: partner.name || "User",
                            avatar: partner.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner.name || "User")}&background=random`,
                            lastMessage: msg.content,
                            time: formatTime(msg.created_at),
                            unread: msg.receiver_id === profile.id && !msg.is_read ? 1 : 0,
                            online: partner.is_online || false,
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

    // Fetch conversations from Supabase
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

        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} jam lalu`;
        if (diffMins < 2880) return "Kemarin";
        return `${Math.floor(diffMins / 1440)} hari lalu`;
    };

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "rgba(0,0,0,0.05)";

    const filteredConversations = conversations.filter(
        (conv) => conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: "#fff" }]}>Chat</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn}>
                        <MaterialIcons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: cardColor, borderColor }]}>
                    <MaterialIcons name="search" size={20} color={mutedColor} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Cari percakapan..."
                        placeholderTextColor={mutedColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Online Friends */}
            <View style={styles.onlineSection}>
                <Text style={[styles.onlineTitle, { color: mutedColor }]}>Online Sekarang</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.onlineList}
                >
                    {conversations.filter(c => c.online).map((conv) => (
                        <TouchableOpacity key={conv.id} style={styles.onlineItem}>
                            <View style={styles.onlineAvatarContainer}>
                                <Image source={{ uri: conv.avatar }} style={styles.onlineAvatar} />
                                <View style={styles.onlineDot} />
                            </View>
                            <Text style={[styles.onlineName, { color: textColor }]} numberOfLines={1}>
                                {conv.name.split(" ")[0]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {conversations.filter(c => c.online).length === 0 && (
                        <Text style={{ color: mutedColor, fontSize: 12, paddingVertical: 10 }}>Tidak ada teman online</Text>
                    )}
                </ScrollView>
            </View>

            {/* Conversations */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
            >
                <Text style={[styles.sectionTitle, { color: mutedColor }]}>Pesan</Text>

                {filteredConversations.map((conv) => (
                    <TouchableOpacity
                        key={conv.id}
                        style={[styles.conversationCard, { backgroundColor: cardColor }]}
                        onPress={() => router.push({ pathname: "/chat/[id]", params: { id: conv.id } })}
                    >
                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: conv.avatar }} style={styles.avatar} />
                            {conv.online && <View style={styles.statusDot} />}
                        </View>

                        <View style={styles.conversationContent}>
                            <View style={styles.conversationHeader}>
                                <Text style={[styles.conversationName, { color: textColor }]}>
                                    {conv.name}
                                </Text>
                                <Text style={[styles.conversationTime, { color: mutedColor }]}>
                                    {conv.time}
                                </Text>
                            </View>
                            <View style={styles.conversationFooter}>
                                <Text
                                    style={[
                                        styles.conversationMessage,
                                        { color: conv.unread > 0 ? textColor : mutedColor },
                                    ]}
                                    numberOfLines={1}
                                >
                                    {conv.lastMessage}
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

                {/* Empty State */}
                {filteredConversations.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="chat-bubble-outline" size={48} color={mutedColor} />
                        <Text style={[styles.emptyTitle, { color: textColor }]}>
                            Tidak ada percakapan
                        </Text>
                        <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                            Mulai chat dengan pemain lain untuk melihat percakapan di sini
                        </Text>
                    </View>
                )}

                {/* Bottom padding */}
                <View style={{ height: 100 }} />
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: Colors.secondary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "bold",
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    onlineSection: {
        paddingLeft: 20,
        marginBottom: 16,
    },
    onlineTitle: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    onlineList: {
        gap: 16,
        paddingRight: 20,
    },
    onlineItem: {
        alignItems: "center",
        width: 56,
    },
    onlineAvatarContainer: {
        position: "relative",
    },
    onlineAvatar: {
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
    onlineName: {
        fontSize: 11,
        marginTop: 4,
        textAlign: "center",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    conversationCard: {
        flexDirection: "row",
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
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
    statusDot: {
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
    conversationContent: {
        flex: 1,
        justifyContent: "center",
    },
    conversationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    conversationName: {
        fontSize: 15,
        fontWeight: "600",
    },
    conversationTime: {
        fontSize: 12,
    },
    conversationFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    conversationMessage: {
        fontSize: 13,
        flex: 1,
        marginRight: 8,
    },
    unreadBadge: {
        backgroundColor: Colors.primary,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 6,
    },
    unreadText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "bold",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 16,
    },
    emptyDesc: {
        fontSize: 13,
        textAlign: "center",
        marginTop: 4,
        paddingHorizontal: 32,
    },
});
