import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface Message {
    id: string;
    content: string;
    sender_id: string;
    receiver_id: string;
    created_at: string;
    is_read: boolean;
}

interface Partner {
    id: string;
    name: string;
    avatar_url: string | null;
    is_online: boolean;
}

// App primary colors
const MESSENGER_GRADIENT = {
    primary: "#001064",
    secondary: "#001064",
};

export default function ChatDetailScreen() {
    const router = useRouter();
    const { id: partnerId } = useLocalSearchParams<{ id: string }>();
    const { profile } = useAuthStore();
    const scrollViewRef = useRef<ScrollView>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [partner, setPartner] = useState<Partner | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Fetch partner profile
    useEffect(() => {
        const fetchPartner = async () => {
            if (!partnerId) return;

            const { data } = await supabase
                .from("profiles")
                .select("id, name, avatar_url, is_online")
                .eq("id", partnerId)
                .single();

            if (data) {
                setPartner(data);
            }
        };

        fetchPartner();
    }, [partnerId]);

    // Fetch messages
    useEffect(() => {
        const fetchMessages = async () => {
            if (!profile?.id || !partnerId) return;

            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${profile.id})`)
                .order("created_at", { ascending: true });

            if (data) {
                setMessages(data);
                // Mark as read
                await (supabase
                    .from("messages") as any)
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .eq("sender_id", partnerId)
                    .eq("receiver_id", profile.id)
                    .eq("is_read", false);
            }
        };

        fetchMessages();
    }, [profile?.id, partnerId]);

    // Subscribe to new messages
    useEffect(() => {
        if (!profile?.id || !partnerId) return;

        const channel = supabase
            .channel(`chat:${partnerId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `receiver_id=eq.${profile.id}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    if (newMsg.sender_id === partnerId) {
                        setMessages((prev) => [...prev, newMsg]);
                        (supabase
                            .from("messages") as any)
                            .update({ is_read: true, read_at: new Date().toISOString() })
                            .eq("id", newMsg.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, partnerId]);

    // Auto scroll to bottom
    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const sendMessage = async () => {
        if (!newMessage.trim() || !profile?.id || !partnerId) return;

        setIsLoading(true);
        const messageData = {
            sender_id: profile.id,
            receiver_id: partnerId,
            content: newMessage.trim(),
        };

        const { data, error } = await (supabase
            .from("messages") as any)
            .insert(messageData)
            .select()
            .single();

        if (data) {
            setMessages((prev) => [...prev, data]);
            setNewMessage("");
        }

        setIsLoading(false);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    };

    // Check if message is first in group (for avatar display)
    const isFirstInGroup = (index: number) => {
        if (index === 0) return true;
        const current = messages[index];
        const prev = messages[index - 1];
        return current.sender_id !== prev.sender_id;
    };

    // Check if message is last in group (for tail display)
    const isLastInGroup = (index: number) => {
        if (index === messages.length - 1) return true;
        const current = messages[index];
        const next = messages[index + 1];
        return current.sender_id !== next.sender_id;
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                {/* Messenger-style Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={MESSENGER_GRADIENT.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.headerProfile}>
                        <View style={styles.headerAvatarContainer}>
                            <Image
                                source={{ uri: partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=0084FF&color=fff` }}
                                style={styles.headerAvatar}
                            />
                            {partner?.is_online && <View style={styles.onlineDot} />}
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={styles.headerName}>{partner?.name || "Loading..."}</Text>
                            <Text style={styles.headerStatus}>
                                {partner?.is_online ? "Aktif sekarang" : "Tidak aktif"}
                            </Text>
                        </View>
                    </TouchableOpacity>


                </View>

                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={0}
                >
                    {/* Messages Area */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.messagesContainer}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Partner info at top */}
                        <View style={styles.chatIntro}>
                            <Image
                                source={{ uri: partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=0084FF&color=fff&size=200` }}
                                style={styles.introAvatar}
                            />
                            <Text style={styles.introName}>{partner?.name}</Text>
                            <Text style={styles.introSubtext}>Pingpong Hub</Text>
                            <Text style={styles.introDesc}>
                                Kalian terhubung di PingpongHub. Mulai percakapan sekarang!
                            </Text>
                        </View>

                        {/* Messages */}
                        {messages.map((msg, index) => {
                            const isMe = msg.sender_id === profile?.id;
                            const showAvatar = !isMe && isLastInGroup(index);
                            const isLast = isLastInGroup(index);
                            const isFirst = isFirstInGroup(index);

                            return (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.messageRow,
                                        isMe ? styles.messageRowMe : styles.messageRowOther,
                                        !isFirst && { marginTop: 2 },
                                    ]}
                                >
                                    {/* Avatar space for other's messages */}
                                    {!isMe && (
                                        <View style={styles.avatarSpace}>
                                            {showAvatar && (
                                                <Image
                                                    source={{ uri: partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=0084FF&color=fff` }}
                                                    style={styles.messageAvatar}
                                                />
                                            )}
                                        </View>
                                    )}

                                    {/* Message bubble */}
                                    <View
                                        style={[
                                            styles.messageBubble,
                                            isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
                                            // Rounded corners based on position
                                            isMe && isFirst && styles.bubbleMeFirst,
                                            isMe && isLast && styles.bubbleMeLast,
                                            !isMe && isFirst && styles.bubbleOtherFirst,
                                            !isMe && isLast && styles.bubbleOtherLast,
                                        ]}
                                    >
                                        <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                                            {msg.content}
                                        </Text>
                                    </View>

                                    {/* Read indicator for my messages */}
                                    {isMe && isLast && (
                                        <View style={styles.readIndicator}>
                                            {msg.is_read ? (
                                                <Image
                                                    source={{ uri: partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=0084FF&color=fff` }}
                                                    style={styles.readAvatar}
                                                />
                                            ) : (
                                                <MaterialIcons name="check" size={12} color="#999" />
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {/* Typing indicator */}
                        {isTyping && (
                            <View style={[styles.messageRow, styles.messageRowOther]}>
                                <View style={styles.avatarSpace}>
                                    <Image
                                        source={{ uri: partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=0084FF&color=fff` }}
                                        style={styles.messageAvatar}
                                    />
                                </View>
                                <View style={[styles.messageBubble, styles.messageBubbleOther, styles.typingBubble]}>
                                    <View style={styles.typingDots}>
                                        <View style={[styles.typingDot, { animationDelay: "0ms" }]} />
                                        <View style={[styles.typingDot, { animationDelay: "150ms" }]} />
                                        <View style={[styles.typingDot, { animationDelay: "300ms" }]} />
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={{ height: 16 }} />
                    </ScrollView>

                    {/* Messenger-style Input */}
                    <View style={styles.inputContainer}>
                        {/* Text input */}
                        <View style={styles.textInputWrapper}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Ketik pesan..."
                                placeholderTextColor="#999"
                                value={newMessage}
                                onChangeText={setNewMessage}
                                onSubmitEditing={sendMessage}
                                returnKeyType="send"
                                blurOnSubmit={false}
                                maxLength={500}
                            />
                        </View>

                        {/* Send button */}
                        <TouchableOpacity
                            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                            onPress={sendMessage}
                            disabled={!newMessage.trim() || isLoading}
                        >
                            <MaterialIcons name="send" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        backgroundColor: "#fff",
    },
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    headerProfile: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 4,
    },
    headerAvatarContainer: {
        position: "relative",
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    onlineDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#31A24C",
        borderWidth: 2,
        borderColor: "#fff",
    },
    headerInfo: {
        marginLeft: 10,
    },
    headerName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#000",
    },
    headerStatus: {
        fontSize: 12,
        color: "#65676B",
    },
    headerActions: {
        flexDirection: "row",
        gap: 4,
    },
    headerActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },

    // Messages
    keyboardView: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    messagesContent: {
        paddingHorizontal: 12,
        paddingTop: 12,
    },

    // Chat intro
    chatIntro: {
        alignItems: "center",
        paddingVertical: 24,
        marginBottom: 16,
    },
    introAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 12,
    },
    introName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#050505",
        marginBottom: 4,
    },
    introSubtext: {
        fontSize: 14,
        color: "#65676B",
        marginBottom: 8,
    },
    introDesc: {
        fontSize: 13,
        color: "#65676B",
        textAlign: "center",
        paddingHorizontal: 32,
    },

    // Message rows
    messageRow: {
        flexDirection: "row",
        marginBottom: 2,
        alignItems: "flex-end",
    },
    messageRowMe: {
        justifyContent: "flex-end",
    },
    messageRowOther: {
        justifyContent: "flex-start",
    },
    avatarSpace: {
        width: 28,
        marginRight: 8,
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },

    // Message bubbles
    messageBubble: {
        maxWidth: "70%",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
    },
    messageBubbleMe: {
        backgroundColor: MESSENGER_GRADIENT.primary,
        borderRadius: 18,
    },
    messageBubbleOther: {
        backgroundColor: "#E4E6EB",
        borderRadius: 18,
    },
    // Messenger-style corner rounding
    bubbleMeFirst: {
        borderTopRightRadius: 18,
    },
    bubbleMeLast: {
        borderBottomRightRadius: 4,
    },
    bubbleOtherFirst: {
        borderTopLeftRadius: 18,
    },
    bubbleOtherLast: {
        borderBottomLeftRadius: 4,
    },

    messageText: {
        fontSize: 15,
        color: "#050505",
        lineHeight: 20,
    },
    messageTextMe: {
        color: "#fff",
    },

    // Read indicator
    readIndicator: {
        marginLeft: 4,
        marginBottom: 2,
    },
    readAvatar: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },

    // Typing indicator
    typingBubble: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    typingDots: {
        flexDirection: "row",
        gap: 4,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#65676B",
    },

    // Input area
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        gap: 4,
    },
    inputActionBtn: {
        width: 36,
        height: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    textInputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        backgroundColor: "#F0F2F5",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        minHeight: 36,
        maxHeight: 100,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: "#050505",
        paddingVertical: 4,
        maxHeight: 80,
    },
    emojiBtn: {
        width: 28,
        height: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#001064",
        justifyContent: "center",
        alignItems: "center",
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
});
