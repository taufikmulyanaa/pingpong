import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageBackground,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";

// Mock Data
const MOCK_TABLE = {
    id: "1",
    name: "Meja Garasi Budi",
    address: "Jl. Merpati No. 12, Jakarta Selatan",
    image: "https://placehold.co/400x200/4169E1/FFEB00?text=Meja+Garasi",
    status: "ACTIVE",
    rating: 4.8,
    reviews: 12,
    earnings_total: "Rp 1.450.000",
    earnings_today: "Rp 150.000",
    bookings_count: 45,
    views: 120,
    facilities: ["Indoor", "AC", "WiFi", "Parkir Motor"],
    price: "Rp 25.000 / jam",
};

const MOCK_BOOKINGS = [
    { id: "b1", user: "Andi P.", time: "14:00 - 15:00", date: "Hari Ini", status: "CONFIRMED", avatar: "https://ui-avatars.com/api/?name=Andi+P" },
    { id: "b2", user: "Rizky B.", time: "16:00 - 18:00", date: "Hari Ini", status: "PENDING", avatar: "https://ui-avatars.com/api/?name=Rizky+B" },
    { id: "b3", user: "Siti A.", time: "10:00 - 12:00", date: "Besok", status: "CONFIRMED", avatar: "https://ui-avatars.com/api/?name=Siti+A" },
];

export default function HostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"BOOKINGS" | "REVIEWS">("BOOKINGS");
    const [status, setStatus] = useState(MOCK_TABLE.status);

    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "rgba(0,0,0,0.05)";

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false, // Custom header
                }}
            />
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Hero Image Header */}
                    <ImageBackground
                        source={{ uri: MOCK_TABLE.image }}
                        style={styles.heroImage}
                    >
                        <View style={styles.overlay} />
                        <SafeAreaView>
                            <View style={styles.headerBar}>
                                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <View style={styles.headerActions}>
                                    <TouchableOpacity style={styles.iconBtn}>
                                        <MaterialIcons name="share" size={24} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/host/create" as any)}>
                                        <MaterialIcons name="edit" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </SafeAreaView>

                        <View style={styles.heroContent}>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: status === "ACTIVE" ? "#10B981" : "#6B7280" }
                            ]}>
                                <Text style={styles.statusText}>
                                    {status === "ACTIVE" ? "Online" : "Offline"}
                                </Text>
                            </View>
                            <Text style={styles.heroTitle}>{MOCK_TABLE.name}</Text>
                            <Text style={styles.heroAddress}>{MOCK_TABLE.address}</Text>
                            <View style={styles.ratingContainer}>
                                <MaterialIcons name="star" size={16} color="#F59E0B" />
                                <Text style={styles.ratingText}>{MOCK_TABLE.rating} ({MOCK_TABLE.reviews} ulasan)</Text>
                            </View>
                        </View>
                    </ImageBackground>

                    <View style={styles.content}>
                        {/* Quick Actions */}
                        <View style={styles.actionGrid}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => setStatus(prev => prev === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                            >
                                <MaterialIcons
                                    name={status === "ACTIVE" ? "power-settings-new" : "play-circle-filled"}
                                    size={24}
                                    color={status === "ACTIVE" ? "#EF4444" : "#10B981"}
                                />
                                <Text style={[styles.actionLabel, { color: textColor }]}>
                                    {status === "ACTIVE" ? "Tutup" : "Buka"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                            >
                                <MaterialIcons name="campaign" size={24} color="#F59E0B" />
                                <Text style={[styles.actionLabel, { color: textColor }]}>Promosi</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                            >
                                <MaterialIcons name="qr-code" size={24} color={Colors.primary} />
                                <Text style={[styles.actionLabel, { color: textColor }]}>QR Code</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                            >
                                <MaterialIcons name="settings" size={24} color={mutedColor} />
                                <Text style={[styles.actionLabel, { color: textColor }]}>Atur</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Stats Cards */}
                        <View style={styles.statsRow}>
                            <View style={[styles.statsCard, { backgroundColor: Colors.secondary }]}>
                                <Text style={styles.statsLabel}>Pendapatan Hari Ini</Text>
                                <Text style={styles.statsValue}>{MOCK_TABLE.earnings_today}</Text>
                            </View>
                            <View style={[styles.statsCard, { backgroundColor: cardColor, borderWidth: 1, borderColor }]}>
                                <Text style={[styles.statsLabel, { color: mutedColor }]}>Total Booking</Text>
                                <Text style={[styles.statsValue, { color: textColor }]}>{MOCK_TABLE.bookings_count}</Text>
                            </View>
                        </View>

                        {/* Tabs */}
                        <View style={[styles.tabContainer, { borderBottomColor: borderColor }]}>
                            <TouchableOpacity
                                style={[styles.tabItem, activeTab === "BOOKINGS" && styles.activeTab]}
                                onPress={() => setActiveTab("BOOKINGS")}
                            >
                                <Text style={[
                                    styles.tabText,
                                    activeTab === "BOOKINGS" ? { color: Colors.primary } : { color: mutedColor }
                                ]}>Reservasi</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabItem, activeTab === "REVIEWS" && styles.activeTab]}
                                onPress={() => setActiveTab("REVIEWS")}
                            >
                                <Text style={[
                                    styles.tabText,
                                    activeTab === "REVIEWS" ? { color: Colors.primary } : { color: mutedColor }
                                ]}>Ulasan</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content */}
                        {activeTab === "BOOKINGS" ? (
                            <View style={styles.listContainer}>
                                <Text style={[styles.sectionHeader, { color: textColor }]}>Jadwal Booking</Text>
                                {MOCK_BOOKINGS.map(booking => (
                                    <View key={booking.id} style={[styles.bookingItem, { backgroundColor: cardColor, borderColor }]}>
                                        <View style={styles.bookingRow}>
                                            <Image source={{ uri: booking.avatar }} style={styles.userAvatar} />
                                            <View style={styles.bookingInfo}>
                                                <Text style={[styles.bookingUser, { color: textColor }]}>{booking.user}</Text>
                                                <Text style={[styles.bookingTime, { color: mutedColor }]}>{booking.date} • {booking.time}</Text>
                                            </View>
                                            <View style={[
                                                styles.bookingStatus,
                                                { backgroundColor: booking.status === "CONFIRMED" ? "#D1FAE5" : "#FEF3C7" }
                                            ]}>
                                                <Text style={[
                                                    styles.bookingStatusText,
                                                    { color: booking.status === "CONFIRMED" ? "#059669" : "#D97706" }
                                                ]}>
                                                    {booking.status === "CONFIRMED" ? "Dikta" : "Menunggu"}
                                                </Text>
                                            </View>
                                        </View>
                                        {booking.status === "PENDING" && (
                                            <View style={styles.bookingActions}>
                                                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}>
                                                    <Text style={styles.btnText}>Terima</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.rejectBtn, { borderColor: "#EF4444" }]}>
                                                    <Text style={[styles.btnText, { color: "#EF4444" }]}>Tolak</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.listContainer}>
                                <View style={styles.emptyTab}>
                                    <MaterialIcons name="rate-review" size={48} color={mutedColor} />
                                    <Text style={[styles.emptyText, { color: mutedColor }]}>Belum ada ulasan terbaru</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroImage: { height: 280, width: "100%", justifyContent: "space-between" },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
    headerBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10 },
    headerActions: { flexDirection: "row", gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
    heroContent: { padding: 20 },
    statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
    statusText: { color: "#fff", fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
    heroTitle: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 4 },
    heroAddress: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginBottom: 8 },
    ratingContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
    ratingText: { color: "#F59E0B", fontSize: 14, fontWeight: "bold" },

    content: { flex: 1, padding: 20, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: Colors.background },

    actionGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
    actionBtn: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
    actionLabel: { fontSize: 12, marginTop: 8, fontWeight: "500" },

    statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
    statsCard: { flex: 1, padding: 16, borderRadius: 16 },
    statsLabel: { color: Colors.accent, fontSize: 12, marginBottom: 4 },
    statsValue: { color: "#fff", fontSize: 18, fontWeight: "bold" },

    tabContainer: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 16 },
    tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
    tabText: { fontSize: 14, fontWeight: "600" },

    listContainer: {},
    sectionHeader: { fontSize: 16, fontWeight: "bold", marginBottom: 12 },
    bookingItem: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    bookingRow: { flexDirection: "row", alignItems: "center" },
    userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    bookingInfo: { flex: 1 },
    bookingUser: { fontSize: 14, fontWeight: "bold" },
    bookingTime: { fontSize: 12, marginTop: 2 },
    bookingStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    bookingStatusText: { fontSize: 10, fontWeight: "bold" },
    bookingActions: { flexDirection: "row", marginTop: 16, gap: 12 },
    confirmBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
    rejectBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center", borderWidth: 1, backgroundColor: "transparent" },
    btnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

    emptyTab: { alignItems: "center", padding: 40 },
    emptyText: { marginTop: 12 },
});
