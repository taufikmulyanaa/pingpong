import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageBackground,
    Modal,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";

interface HostedVenue {
    id: string;
    name: string;
    description?: string;
    address: string;
    city: string;
    phone?: string;
    images: string[];
    is_active: boolean;
    rating: number;
    review_count: number;
    price_per_hour: number;
    opening_hours: any;
    facilities: string[];
    table_count: number;
}

export default function HostDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"BOOKINGS" | "REVIEWS">("BOOKINGS");
    const [table, setTable] = useState<HostedVenue | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("ACTIVE");
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [bookings, setBookings] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "rgba(0,0,0,0.05)";

    const fetchVenue = async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from("venues")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error fetching venue:", error);
                setTable(null);
            } else {
                setTable(data);
                setStatus((data as any).is_active ? "ACTIVE" : "INACTIVE");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBookings = async () => {
        if (!id) return;
        const { data } = await supabase
            .from("bookings")
            .select("*, user:profiles(name, avatar_url)")
            .eq("venue_id", id)
            .order("booking_date", { ascending: true });
        if (data) setBookings(data);
    };

    useEffect(() => {
        fetchVenue();
        fetchBookings();
    }, [id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchVenue(), fetchBookings()]);
        setRefreshing(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }



    if (!table) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialIcons name="error-outline" size={48} color={mutedColor} />
                <Text style={{ color: textColor, marginTop: 12 }}>Data meja tidak ditemukan</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: Colors.primary }}>Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleToggleStatus = async () => {
        if (!table) return;
        setUpdatingStatus(true);
        const newStatus = status === "ACTIVE" ? false : true;

        try {
            const { error } = await (supabase.from("venues") as any)
                .update({ is_active: newStatus })
                .eq("id", id);

            if (error) {
                // Alert might not be imported, using console for simplicity or ensuring import
                console.error("Error updating status:", error);
                // Alert.alert("Error", "Gagal mengubah status");
            } else {
                setStatus(newStatus ? "ACTIVE" : "INACTIVE");
            }
        } catch (err: any) {
            console.error("Error updating status:", err);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleUpdateBooking = async (bookingId: string, newStatus: string) => {
        try {

            const { error } = await (supabase.from("bookings") as any)
                .update({ status: newStatus })
                .eq("id", bookingId);

            if (!error) {
                setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
            } else {
                console.error("Update error:", error);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false, // Custom header
                }}
            />
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                    }
                >
                    {/* Hero Image Header */}
                    <ImageBackground
                        source={{ uri: table.images?.[0] || `https://placehold.co/600x280/009688/white?text=${encodeURIComponent(table.name)}` }}
                        style={styles.heroImage}
                    >
                        <View style={styles.overlay} />
                        <SafeAreaView>
                            <View style={styles.headerBar}>
                                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/host")} style={styles.iconBtn}>
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
                            {/* Promo Modal */}
                            <Modal visible={showPromoModal} transparent animationType="fade" onRequestClose={() => setShowPromoModal(false)}>
                                <View style={styles.modalOverlay}>
                                    <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                                        <MaterialIcons name="campaign" size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
                                        <Text style={[styles.modalTitle, { color: textColor }]}>Promosikan Meja Anda</Text>
                                        <Text style={[styles.modalText, { color: mutedColor }]}>
                                            Fitur promosi akan segera hadir! Anda akan dapat meningkatkan jangkauan meja Anda ke lebih banyak pemain.
                                        </Text>
                                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.primary }]} onPress={() => setShowPromoModal(false)}>
                                            <Text style={styles.modalBtnText}>Mengerti</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>

                            {/* QR Code Modal */}
                            <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
                                <View style={styles.modalOverlay}>
                                    <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                                        <Text style={[styles.modalTitle, { color: textColor }]}>Scan QR Code</Text>
                                        <View style={[styles.qrPlaceholder, { borderColor: Colors.primary }]}>
                                            <MaterialIcons name="qr-code-2" size={200} color={textColor} />
                                        </View>
                                        <Text style={[styles.modalText, { color: mutedColor }]}>
                                            Tunjukkan QR Code ini kepada pemain untuk check-in.
                                        </Text>
                                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.primary }]} onPress={() => setShowQRModal(false)}>
                                            <Text style={styles.modalBtnText}>Tutup</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>

                            {/* Settings Modal */}
                            <Modal visible={showSettingsModal} transparent animationType="fade" onRequestClose={() => setShowSettingsModal(false)}>
                                <View style={styles.modalOverlay}>
                                    <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                                        <Text style={[styles.modalTitle, { color: textColor, marginBottom: 20 }]}>Pengaturan Meja</Text>

                                        <TouchableOpacity style={[styles.settingOption, { borderBottomColor: borderColor }]} onPress={() => { setShowSettingsModal(false); /* Navigate to edit */ }}>
                                            <MaterialIcons name="edit" size={24} color={textColor} />
                                            <Text style={[styles.settingText, { color: textColor }]}>Edit Detail Meja</Text>
                                            <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.settingOption, { borderBottomColor: borderColor }]} onPress={() => { setShowSettingsModal(false); /* Handle delete */ }}>
                                            <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
                                            <Text style={[styles.settingText, { color: "#EF4444" }]}>Hapus Meja</Text>
                                            <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                                        </TouchableOpacity>

                                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: cardColor, marginTop: 20 }]} onPress={() => setShowSettingsModal(false)}>
                                            <Text style={[styles.modalBtnText, { color: textColor }]}>Batal</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>
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
                            <Text style={styles.heroTitle}>{table.name}</Text>
                            <Text style={styles.heroAddress}>{table.address}, {table.city}</Text>
                            <View style={styles.ratingContainer}>
                                <MaterialIcons name="star" size={16} color="#F59E0B" />
                                <Text style={styles.ratingText}>{table.rating || 0} ({table.review_count || 0} ulasan)</Text>
                            </View>
                        </View>
                    </ImageBackground>

                    <View style={styles.content}>
                        {/* Quick Actions */}
                        <View style={styles.actionGrid}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                                onPress={handleToggleStatus}
                                disabled={updatingStatus}
                            >
                                {updatingStatus ? (
                                    <ActivityIndicator size="small" color={status === "ACTIVE" ? "#EF4444" : "#10B981"} />
                                ) : (
                                    <MaterialIcons
                                        name={status === "ACTIVE" ? "power-settings-new" : "play-circle-filled"}
                                        size={24}
                                        color={status === "ACTIVE" ? "#EF4444" : "#10B981"}
                                    />
                                )}
                                <Text style={[styles.actionLabel, { color: textColor }]}>
                                    {status === "ACTIVE" ? "Tutup" : "Buka"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => setShowPromoModal(true)}
                            >
                                <MaterialIcons name="campaign" size={24} color="#F59E0B" />
                                <Text style={[styles.actionLabel, { color: textColor }]}>Promosi</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => setShowQRModal(true)}
                            >
                                <MaterialIcons name="qr-code" size={24} color={Colors.primary} />
                                <Text style={[styles.actionLabel, { color: textColor }]}>QR Code</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => setShowSettingsModal(true)}
                            >
                                <MaterialIcons name="settings" size={24} color={mutedColor} />
                                <Text style={[styles.actionLabel, { color: textColor }]}>Atur</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Stats Cards */}
                        <View style={styles.statsRow}>
                            <View style={[styles.statsCard, { backgroundColor: Colors.secondary }]}>
                                <Text style={styles.statsLabel}>Harga per Jam</Text>
                                <Text style={styles.statsValue}>Rp {(table.price_per_hour || 0).toLocaleString()}</Text>
                            </View>
                            <View style={[styles.statsCard, { backgroundColor: cardColor, borderWidth: 1, borderColor }]}>
                                <Text style={[styles.statsLabel, { color: mutedColor }]}>Jumlah Meja</Text>
                                <Text style={[styles.statsValue, { color: textColor }]}>{table.table_count || 1}</Text>
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={[styles.statsCard, { backgroundColor: cardColor, borderWidth: 1, borderColor }]}>
                                <Text style={[styles.statsLabel, { color: mutedColor }]}>Rating</Text>
                                <Text style={[styles.statsValue, { color: textColor }]}>{table.rating || 0} ★</Text>
                            </View>
                            <View style={[styles.statsCard, { backgroundColor: cardColor, borderWidth: 1, borderColor }]}>
                                <Text style={[styles.statsLabel, { color: mutedColor }]}>Ulasan</Text>
                                <Text style={[styles.statsValue, { color: textColor }]}>{table.review_count || 0}</Text>
                            </View>
                        </View>

                        {/* Description */}
                        {(table as any).description && (
                            <View style={[styles.infoSection, { backgroundColor: cardColor, borderColor }]}>
                                <Text style={[styles.infoTitle, { color: textColor }]}>Deskripsi</Text>
                                <Text style={[styles.infoText, { color: mutedColor }]}>{(table as any).description}</Text>
                            </View>
                        )}

                        {/* Facilities */}
                        {table.facilities && table.facilities.length > 0 && (
                            <View style={[styles.infoSection, { backgroundColor: cardColor, borderColor }]}>
                                <Text style={[styles.infoTitle, { color: textColor }]}>Fasilitas</Text>
                                <View style={styles.facilitiesGrid}>
                                    {table.facilities.map((facility: string, index: number) => (
                                        <View key={index} style={[styles.facilityChip, { backgroundColor: Colors.blueLight }]}>
                                            <MaterialIcons
                                                name={
                                                    facility === "PARKING" ? "local-parking" :
                                                        facility === "CANTEEN" ? "restaurant" :
                                                            facility === "TOILET" ? "wc" :
                                                                facility === "WIFI" ? "wifi" :
                                                                    facility === "AC" ? "ac-unit" :
                                                                        "check-circle"
                                                }
                                                size={16}
                                                color={Colors.primary}
                                            />
                                            <Text style={[styles.facilityText, { color: Colors.primary }]}>
                                                {facility === "PARKING" ? "Parkir" :
                                                    facility === "CANTEEN" ? "Kantin" :
                                                        facility === "TOILET" ? "Toilet" :
                                                            facility === "WIFI" ? "WiFi" :
                                                                facility === "AC" ? "AC" :
                                                                    facility}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Opening Hours */}
                        {table.opening_hours && Object.keys(table.opening_hours).length > 0 && (
                            <View style={[styles.infoSection, { backgroundColor: cardColor, borderColor }]}>
                                <Text style={[styles.infoTitle, { color: textColor }]}>Jam Operasional</Text>
                                {Object.entries(table.opening_hours).map(([day, hours]: [string, any]) => (
                                    <View key={day} style={styles.hoursRow}>
                                        <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
                                        <Text style={[styles.hoursText, { color: mutedColor }]}>
                                            {hours.open} - {hours.close}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

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
                                {bookings.length > 0 ? (
                                    bookings.map((booking: any) => (
                                        <View key={booking.id} style={[styles.bookingItem, { backgroundColor: cardColor, borderColor }]}>
                                            <View style={styles.bookingRow}>
                                                <Image
                                                    source={{ uri: booking.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.user?.name || "User")}&background=random` }}
                                                    style={styles.userAvatar}
                                                />
                                                <View style={styles.bookingInfo}>
                                                    <Text style={[styles.bookingUser, { color: textColor }]}>{booking.user?.name || "Unknown User"}</Text>
                                                    <Text style={[styles.bookingTime, { color: mutedColor }]}>
                                                        {booking.booking_date} • {booking.start_time.slice(0, 5)} - {booking.end_time?.slice(0, 5)} ({booking.duration_hours} Jam)
                                                    </Text>
                                                </View>
                                                <View style={[
                                                    styles.bookingStatus,
                                                    {
                                                        backgroundColor:
                                                            booking.status === "CONFIRMED" ? "#D1FAE5" :
                                                                booking.status === "REJECTED" ? "#FEE2E2" : "#FEF3C7"
                                                    }
                                                ]}>
                                                    <Text style={[
                                                        styles.bookingStatusText,
                                                        {
                                                            color:
                                                                booking.status === "CONFIRMED" ? "#059669" :
                                                                    booking.status === "REJECTED" ? "#DC2626" : "#D97706"
                                                        }
                                                    ]}>
                                                        {booking.status === "CONFIRMED" ? "Diterima" :
                                                            booking.status === "REJECTED" ? "Ditolak" : "Menunggu"}
                                                    </Text>
                                                </View>
                                            </View>
                                            {["PENDING", "pending", "Menunggu"].includes(booking.status) && (
                                                <View style={styles.bookingActions}>
                                                    <TouchableOpacity
                                                        style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                                                        onPress={() => handleUpdateBooking(booking.id, "CONFIRMED")}
                                                    >
                                                        <Text style={styles.btnText}>Terima</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.rejectBtn, { borderColor: "#EF4444" }]}
                                                        onPress={() => handleUpdateBooking(booking.id, "REJECTED")}
                                                    >
                                                        <Text style={[styles.btnText, { color: "#EF4444" }]}>Tolak</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <View style={{ padding: 20, alignItems: "center" }}>
                                        <Text style={{ color: mutedColor }}>Belum ada booking</Text>
                                    </View>
                                )}
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

    // New info section styles
    infoSection: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    infoTitle: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
    infoText: { fontSize: 14, lineHeight: 20 },
    facilitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    facilityChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
    facilityText: { fontSize: 13, fontWeight: "500" },
    hoursRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    dayText: { fontSize: 14, fontWeight: "500" },
    hoursText: { fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    modalContent: { width: "85%", borderRadius: 16, padding: 24, alignItems: "center", elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
    modalText: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
    modalBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
    modalBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
    qrPlaceholder: { width: 220, height: 220, borderWidth: 2, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 16, borderStyle: "dashed" },
    settingOption: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, width: "100%", gap: 12 },
    settingText: { flex: 1, fontSize: 16, fontWeight: "500" },
});
