import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";
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

export default function ChatDetailScreen() {
    const router = useRouter();
    const { id: partnerId } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();
    const scrollViewRef = useRef<ScrollView>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [partner, setPartner] = useState<Partner | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

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
                        // Mark as read
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

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: partner?.name || "Chat",
                    headerStyle: { backgroundColor: cardColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={90}
                >
                    {/* Messages */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.messagesContainer}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map((msg) => {
                            const isMe = msg.sender_id === profile?.id;
                            return (
                                <View
                                    key={msg.id}
                                    style={[
                                        styles.messageRow,
                                        isMe ? styles.messageRowMe : styles.messageRowOther,
                                    ]}
                                >
                                    {!isMe && (
                                        <Image
                                            source={{ uri: partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=random` }}
                                            style={styles.messageAvatar}
                                        />
                                    )}
                                    <View
                                        style={[
                                            styles.messageBubble,
                                            isMe
                                                ? [styles.messageBubbleMe, { backgroundColor: Colors.primary }]
                                                : [styles.messageBubbleOther, { backgroundColor: cardColor }],
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.messageText,
                                                { color: isMe ? "#fff" : textColor },
                                            ]}
                                        >
                                            {msg.content}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.messageTime,
                                                { color: isMe ? "rgba(255,255,255,0.7)" : mutedColor },
                                            ]}
                                        >
                                            {formatTime(msg.created_at)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        {messages.length === 0 && (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="chat-bubble-outline" size={48} color={mutedColor} />
                                <Text style={[styles.emptyText, { color: mutedColor }]}>
                                    Mulai percakapan dengan {partner?.name || "lawan"}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Input */}
                    <View style={[styles.inputContainer, { backgroundColor: cardColor }]}>
                        <TextInput
                            style={[styles.input, { backgroundColor: bgColor, color: textColor }]}
                            placeholder="Ketik pesan..."
                            placeholderTextColor={mutedColor}
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                            onPress={sendMessage}
                            disabled={!newMessage.trim() || isLoading}
                        >
                            <MaterialIcons name="send" size={20} color="#fff" />
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
    },
    keyboardView: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 8,
    },
    messageRow: {
        flexDirection: "row",
        marginBottom: 12,
        alignItems: "flex-end",
    },
    messageRowMe: {
        justifyContent: "flex-end",
    },
    messageRowOther: {
        justifyContent: "flex-start",
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    messageBubble: {
        maxWidth: "75%",
        padding: 12,
        borderRadius: 16,
    },
    messageBubbleMe: {
        borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: "flex-end",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 100,
    },
    emptyText: {
        fontSize: 14,
        marginTop: 12,
        textAlign: "center",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: 12,
        gap: 12,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
});
