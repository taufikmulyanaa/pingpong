// Real-time Chat Hook
// Subscribes to messages table for live chat updates

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Message, Profile } from "../types/database";

interface ChatMessage extends Message {
    sender?: Profile;
}

interface UseRealtimeChatReturn {
    messages: ChatMessage[];
    loading: boolean;
    error: string | null;
    sendMessage: (content: string) => Promise<void>;
    markAsRead: (messageId: string) => Promise<void>;
}

export function useRealtimeChat(
    currentUserId: string,
    chatPartnerId: string
): UseRealtimeChatReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial messages
    useEffect(() => {
        if (!currentUserId || !chatPartnerId) return;

        const fetchMessages = async () => {
            setLoading(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from("messages")
                    .select(
                        `
            *,
            sender:profiles!sender_id(id, name, username, avatar_url)
          `
                    )
                    .or(
                        `and(sender_id.eq.${currentUserId},receiver_id.eq.${chatPartnerId}),and(sender_id.eq.${chatPartnerId},receiver_id.eq.${currentUserId})`
                    )
                    .order("created_at", { ascending: true });

                if (fetchError) throw fetchError;
                setMessages((data as ChatMessage[]) || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [currentUserId, chatPartnerId]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!currentUserId || !chatPartnerId) return;

        const channel = supabase
            .channel(`chat:${[currentUserId, chatPartnerId].sort().join("-")}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `sender_id=eq.${chatPartnerId}`,
                },
                async (payload) => {
                    // Check if message is for this conversation
                    if (payload.new.receiver_id === currentUserId) {
                        // Fetch sender profile
                        const { data: sender } = await supabase
                            .from("profiles")
                            .select("id, name, username, avatar_url")
                            .eq("id", payload.new.sender_id)
                            .single();

                        const newMessage: ChatMessage = {
                            ...(payload.new as Message),
                            sender: sender || undefined,
                        };
                        setMessages((prev) => [...prev, newMessage]);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "messages",
                },
                (payload) => {
                    // Update read status
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === payload.new.id
                                ? { ...msg, is_read: payload.new.is_read, read_at: payload.new.read_at }
                                : msg
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, chatPartnerId]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim()) return;

            const { data, error: sendError } = await supabase
                .from("messages")
                .insert({
                    sender_id: currentUserId,
                    receiver_id: chatPartnerId,
                    content: content.trim(),
                })
                .select(
                    `
          *,
          sender:profiles!sender_id(id, name, username, avatar_url)
        `
                )
                .single();

            if (sendError) {
                setError(sendError.message);
                return;
            }

            if (data) {
                setMessages((prev) => [...prev, data as ChatMessage]);
            }
        },
        [currentUserId, chatPartnerId]
    );

    const markAsRead = useCallback(async (messageId: string) => {
        await supabase
            .from("messages")
            .update({ is_read: true, read_at: new Date().toISOString() } as any)
            .eq("id", messageId);
    }, []);

    return { messages, loading, error, sendMessage, markAsRead };
}
