import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    Alert,
    TextInput,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface PrizePayment {
    id: string;
    recipient_id: string;
    recipient: { name: string; avatar_url: string | null };
    placement: number;
    prize_type: string;
    amount: number;
    currency: string;
    description: string | null;
    status: "PENDING" | "PROCESSING" | "PAID" | "CLAIMED";
    paid_at: string | null;
    notes: string | null;
}

const PLACEMENT_LABELS: Record<number, string> = {
    1: "Juara 1 🥇",
    2: "Juara 2 🥈",
    3: "Juara 3 🥉",
    4: "Juara 4",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Belum Bayar", color: "#6B7280", bg: "#F3F4F6" },
    PROCESSING: { label: "Diproses", color: "#F59E0B", bg: "#FEF3C7" },
    PAID: { label: "Sudah Bayar", color: "#10B981", bg: "#D1FAE5" },
    CLAIMED: { label: "Diklaim", color: "#3B82F6", bg: "#DBEAFE" },
};

export default function PrizePaymentsScreen() {
    const router = useRouter();
    const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
    const { user } = useAuthStore();

    const [payments, setPayments] = useState<PrizePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOrganizer, setIsOrganizer] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PrizePayment | null>(null);

    // Add form
    const [addPlacement, setAddPlacement] = useState("1");
    const [addAmount, setAddAmount] = useState("");
    const [addNotes, setAddNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "#E5E7EB";

    useEffect(() => {
        loadPayments();
    }, [tournamentId]);

    const loadPayments = async () => {
        if (!tournamentId) return;
        setLoading(true);

        try {
            // Check organizer
            const { data: tournament } = await supabase
                .from("tournaments")
                .select("organizer_id")
                .eq("id", tournamentId)
                .single();

            if (tournament) {
                setIsOrganizer((tournament as any).organizer_id === user?.id);
            }

            const { data } = await (supabase
                .from("tournament_prize_payments") as any)
                .select(`
                    *,
                    recipient:recipient_id (name, avatar_url)
                `)
                .eq("tournament_id", tournamentId)
                .order("placement");

            if (data) {
                setPayments(data);
            }
        } catch (error) {
            console.error("Error loading payments:", error);
        } finally {
            setLoading(false);
        }
    };

    const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
        try {
            const updates: any = { status: newStatus };
            if (newStatus === "PAID") {
                updates.paid_at = new Date().toISOString();
            }

            await (supabase.from("tournament_prize_payments") as any)
                .update(updates)
                .eq("id", paymentId);

            Alert.alert("Berhasil", "Status pembayaran diperbarui");
            loadPayments();
        } catch (error) {
            console.error("Error updating status:", error);
            Alert.alert("Error", "Gagal memperbarui status");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Pembayaran Hadiah",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Summary Card */}
                    <View style={[styles.summaryCard, { backgroundColor: cardColor, borderColor }]}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Total Hadiah</Text>
                                <Text style={[styles.summaryValue, { color: textColor }]}>
                                    {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                                </Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Sudah Dibayar</Text>
                                <Text style={[styles.summaryValue, { color: "#10B981" }]}>
                                    {formatCurrency(payments.filter(p => p.status === "PAID" || p.status === "CLAIMED")
                                        .reduce((sum, p) => sum + p.amount, 0))}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${payments.length > 0
                                            ? (payments.filter(p => p.status === "PAID" || p.status === "CLAIMED").length / payments.length) * 100
                                            : 0}%`
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    {/* Payment List */}
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Daftar Hadiah</Text>

                    {payments.map((payment) => {
                        const statusConfig = STATUS_CONFIG[payment.status];
                        return (
                            <TouchableOpacity
                                key={payment.id}
                                style={[styles.paymentCard, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => isOrganizer && setSelectedPayment(payment)}
                            >
                                <View style={styles.paymentHeader}>
                                    <Text style={[styles.placementText, { color: textColor }]}>
                                        {PLACEMENT_LABELS[payment.placement] || `Peringkat ${payment.placement}`}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                                        <Text style={{ color: statusConfig.color, fontSize: 12, fontWeight: "600" }}>
                                            {statusConfig.label}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.paymentBody}>
                                    <Image
                                        source={{ uri: payment.recipient?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(payment.recipient?.name || "U")}&background=random` }}
                                        style={styles.recipientAvatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.recipientName, { color: textColor }]}>
                                            {payment.recipient?.name || "Unknown"}
                                        </Text>
                                        <Text style={[styles.prizeAmount, { color: Colors.primary }]}>
                                            {formatCurrency(payment.amount)}
                                        </Text>
                                    </View>
                                    {isOrganizer && payment.status !== "PAID" && payment.status !== "CLAIMED" && (
                                        <TouchableOpacity
                                            style={[styles.markPaidBtn, { backgroundColor: "#10B981" }]}
                                            onPress={() => updatePaymentStatus(payment.id, "PAID")}
                                        >
                                            <MaterialIcons name="check" size={16} color="#fff" />
                                            <Text style={styles.markPaidText}>Bayar</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {payment.paid_at && (
                                    <Text style={[styles.paidDate, { color: mutedColor }]}>
                                        Dibayar pada {new Date(payment.paid_at).toLocaleDateString("id-ID")}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {payments.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="emoji-events" size={64} color={mutedColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                Belum Ada Data Hadiah
                            </Text>
                            <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                Data hadiah akan muncul setelah turnamen selesai
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    summaryCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    summaryRow: { flexDirection: "row", justifyContent: "space-between" },
    summaryItem: { alignItems: "center" },
    summaryLabel: { fontSize: 12, marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: "bold" },
    progressBar: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        marginTop: 16,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#10B981",
        borderRadius: 4,
    },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    paymentCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    paymentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    placementText: { fontSize: 16, fontWeight: "bold" },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    paymentBody: { flexDirection: "row", alignItems: "center", gap: 12 },
    recipientAvatar: { width: 48, height: 48, borderRadius: 24 },
    recipientName: { fontSize: 15, fontWeight: "500" },
    prizeAmount: { fontSize: 18, fontWeight: "bold", marginTop: 2 },
    markPaidBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    markPaidText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    paidDate: { fontSize: 12, marginTop: 8, textAlign: "right" },
    emptyState: { alignItems: "center", padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    emptyDesc: { fontSize: 14, textAlign: "center", marginTop: 8 },
});
