import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    Alert,
    Modal,
    TextInput,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors, Facilities, SharedStyles, ExtendedColors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface Venue {
    id: string;
    name: string;
    address: string;
    city: string;
    description?: string;
    table_count: number;
    price_per_hour: number;
    rating: number;
    review_count: number;
    facilities: string[];
    images: string[];
    is_verified: boolean;
    opening_hours?: any;
    phone?: string;
}

export default function VenueDetailScreen() {
    const router = useRouter();
    const { id: venueId } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();

    const [venue, setVenue] = useState<Venue | null>(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState("");
    const [duration, setDuration] = useState(1);
    const [isBooking, setIsBooking] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = isDark ? "#374151" : "#E5E7EB";

    useEffect(() => {
        const fetchVenue = async () => {
            if (!venueId) return;

            const { data, error } = await supabase
                .from("venues")
                .select("*")
                .eq("id", venueId)
                .single();

            if (data) {
                setVenue(data);
            }
        };

        fetchVenue();

        // Fetch reviews
        const fetchReviews = async () => {
            if (!venueId) return;
            const { data } = await supabase
                .from("venue_reviews")
                .select("*, user:profiles(name, avatar_url)")
                .eq("venue_id", venueId)
                .order("created_at", { ascending: false })
                .limit(10);
            if (data) setReviews(data);
        };
        fetchReviews();
    }, [venueId]);

    const handleBooking = async () => {
        if (!profile?.id || !venue || !selectedDate || !selectedTime) {
            Alert.alert("Error", "Lengkapi semua data booking");
            return;
        }

        setIsBooking(true);

        // Parse time
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const endHours = hours + duration;
        const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
        const startTime = `${selectedTime}:00`;

        const bookingData = {
            venue_id: venue.id,
            user_id: profile.id,
            booking_date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            duration_hours: duration,
            total_price: venue.price_per_hour * duration,
            status: "PENDING",
        };

        const { error } = await (supabase.from("bookings") as any).insert(bookingData);

        setIsBooking(false);

        if (error) {
            console.error(error);
            if (Platform.OS === 'web') {
                window.alert("Gagal: " + error.message);
            } else {
                Alert.alert("Gagal", error.message);
            }
        } else {
            setShowBookingModal(false);
            if (Platform.OS === 'web') {
                window.alert("Booking Berhasil! Silakan tunggu konfirmasi host.");
            } else {
                Alert.alert(
                    "Booking Berhasil!",
                    `Booking meja di ${venue.name} pada ${selectedDate} jam ${selectedTime} selama ${duration} jam.\n\nTotal: Rp ${(venue.price_per_hour * duration).toLocaleString()}`,
                    [{ text: "OK" }]
                );
            }
        }
    };

    const timeSlots = [
        "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
        "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
    ];

    if (!venue) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Text style={[styles.loadingText, { color: textColor }]}>Loading...</Text>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "",
                    headerTransparent: true,
                    headerTintColor: "#fff",
                }}
            />
            <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
                {/* Hero Image */}
                <Image
                    source={{ uri: venue.images?.[0] || `https://placehold.co/400x250/009688/white?text=${encodeURIComponent(venue.name)}` }}
                    style={styles.heroImage}
                />

                {/* Verified Badge */}
                {venue.is_verified && (
                    <View style={styles.verifiedBadge}>
                        <MaterialIcons name="verified" size={14} color="#fff" />
                        <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                )}

                {/* Content */}
                <View style={[styles.content, { backgroundColor: bgColor }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.venueName, { color: textColor }]}>{venue.name}</Text>
                        <View style={styles.ratingBadge}>
                            <MaterialIcons name="star" size={16} color="#F59E0B" />
                            <Text style={styles.ratingText}>{venue.rating}</Text>
                            <Text style={styles.reviewCount}>({venue.review_count})</Text>
                        </View>
                    </View>

                    <View style={styles.locationRow}>
                        <MaterialIcons name="place" size={16} color={mutedColor} />
                        <Text style={[styles.address, { color: mutedColor }]}>{venue.address}</Text>
                    </View>

                    {/* Info Cards */}
                    <View style={styles.infoCards}>
                        <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="table-restaurant" size={24} color={Colors.primary} />
                            <Text style={[styles.infoValue, { color: textColor }]}>{venue.table_count}</Text>
                            <Text style={[styles.infoLabel, { color: mutedColor }]}>Meja</Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="payments" size={24} color={Colors.secondary} />
                            <Text style={[styles.infoValue, { color: textColor }]}>
                                Rp {(venue.price_per_hour / 1000).toFixed(0)}K
                            </Text>
                            <Text style={[styles.infoLabel, { color: mutedColor }]}>/jam</Text>
                        </View>
                        <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="schedule" size={24} color={Colors.accent} />
                            <Text style={[styles.infoValue, { color: textColor }]}>08-22</Text>
                            <Text style={[styles.infoLabel, { color: mutedColor }]}>Buka</Text>
                        </View>
                    </View>

                    {/* Facilities */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Fasilitas</Text>
                        <View style={styles.facilitiesGrid}>
                            {venue.facilities?.map((f: string) => {
                                const facility = Facilities.find(fac => fac.id === f);
                                return (
                                    <View key={f} style={[styles.facilityItem, { backgroundColor: cardColor }]}>
                                        <MaterialIcons
                                            name={facility?.icon as any || "check"}
                                            size={20}
                                            color={Colors.primary}
                                        />
                                        <Text style={[styles.facilityText, { color: textColor }]}>
                                            {facility?.label || f}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Description */}
                    {venue.description && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Tentang</Text>
                            <Text style={[styles.description, { color: mutedColor }]}>
                                {venue.description}
                            </Text>
                        </View>
                    )}

                    {/* Reviews Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Ulasan</Text>
                            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
                                <Text style={styles.addReviewText}>+ Tulis Ulasan</Text>
                            </TouchableOpacity>
                        </View>

                        {reviews.length > 0 ? (
                            reviews.map((review: any) => (
                                <View key={review.id} style={[styles.reviewCard, { backgroundColor: cardColor }]}>
                                    <View style={styles.reviewHeader}>
                                        <Image
                                            source={{ uri: review.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user?.name || "User")}&background=random` }}
                                            style={styles.reviewAvatar}
                                        />
                                        <View style={styles.reviewMeta}>
                                            <Text style={[styles.reviewerName, { color: textColor }]}>
                                                {review.user?.name || "Pengguna"}
                                            </Text>
                                            <View style={styles.reviewStars}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <MaterialIcons
                                                        key={star}
                                                        name={star <= review.rating ? "star" : "star-border"}
                                                        size={14}
                                                        color="#F59E0B"
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                    {review.comment && (
                                        <Text style={[styles.reviewComment, { color: mutedColor }]}>
                                            {review.comment}
                                        </Text>
                                    )}
                                </View>
                            ))
                        ) : (
                            <View style={styles.noReviews}>
                                <MaterialIcons name="rate-review" size={32} color={mutedColor} />
                                <Text style={[styles.noReviewsText, { color: mutedColor }]}>
                                    Belum ada ulasan
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={[styles.bottomCta, { backgroundColor: cardColor, borderTopColor: borderColor }]}>
                <View style={styles.priceInfo}>
                    <Text style={[styles.priceLabel, { color: mutedColor }]}>Mulai dari</Text>
                    <Text style={[styles.priceValue, { color: Colors.primary }]}>
                        Rp {venue.price_per_hour.toLocaleString()}/jam
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => setShowBookingModal(true)}
                >
                    <MaterialIcons name="event" size={20} color="#fff" />
                    <Text style={styles.bookBtnText}>Booking Meja</Text>
                </TouchableOpacity>
            </View>

            {/* Booking Modal */}
            <Modal
                visible={showBookingModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowBookingModal(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                            <MaterialIcons name="close" size={24} color={textColor} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: textColor }]}>Booking Meja</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {/* Date */}
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Tanggal</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {Array.from({ length: 14 }).map((_, i) => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + i);
                                    const dateStr = d.toISOString().split('T')[0];
                                    const isSelected = selectedDate === dateStr;
                                    const dayName = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()];

                                    return (
                                        <TouchableOpacity
                                            key={dateStr}
                                            style={[
                                                styles.dateOption,
                                                {
                                                    backgroundColor: isSelected ? Colors.primary : cardColor,
                                                    borderColor: isSelected ? Colors.primary : borderColor
                                                }
                                            ]}
                                            onPress={() => setSelectedDate(dateStr)}
                                        >
                                            <Text style={[styles.dateDay, { color: isSelected ? "#fff" : mutedColor }]}>
                                                {dayName}
                                            </Text>
                                            <Text style={[styles.dateNum, { color: isSelected ? "#fff" : textColor }]}>
                                                {d.getDate()}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Time Slots */}
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Jam Mulai</Text>
                            <View style={styles.timeGrid}>
                                {timeSlots.map((time) => (
                                    <TouchableOpacity
                                        key={time}
                                        style={[
                                            styles.timeSlot,
                                            {
                                                backgroundColor: selectedTime === time ? Colors.primary : cardColor,
                                                borderColor: selectedTime === time ? Colors.primary : borderColor,
                                            },
                                        ]}
                                        onPress={() => setSelectedTime(time)}
                                    >
                                        <Text style={[
                                            styles.timeSlotText,
                                            { color: selectedTime === time ? "#fff" : textColor }
                                        ]}>
                                            {time}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Duration */}
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: textColor }]}>Durasi (jam)</Text>
                            <View style={styles.durationRow}>
                                {[1, 2, 3, 4].map((d) => (
                                    <TouchableOpacity
                                        key={d}
                                        style={[
                                            styles.durationBtn,
                                            {
                                                backgroundColor: duration === d ? Colors.primary : cardColor,
                                                borderColor: duration === d ? Colors.primary : borderColor,
                                            },
                                        ]}
                                        onPress={() => setDuration(d)}
                                    >
                                        <Text style={[
                                            styles.durationText,
                                            { color: duration === d ? "#fff" : textColor }
                                        ]}>
                                            {d} jam
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Summary */}
                        <View style={[styles.summaryCard, { backgroundColor: cardColor }]}>
                            <Text style={[styles.summaryTitle, { color: textColor }]}>Ringkasan Booking</Text>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Venue</Text>
                                <Text style={[styles.summaryValue, { color: textColor }]}>{venue.name}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Tanggal</Text>
                                <Text style={[styles.summaryValue, { color: textColor }]}>{selectedDate || "-"}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>Waktu</Text>
                                <Text style={[styles.summaryValue, { color: textColor }]}>
                                    {selectedTime ? `${selectedTime} - ${parseInt(selectedTime.split(":")[0]) + duration}:00` : "-"}
                                </Text>
                            </View>
                            <View style={[styles.summaryRow, styles.summaryTotal]}>
                                <Text style={[styles.totalLabel, { color: textColor }]}>Total</Text>
                                <Text style={[styles.totalValue, { color: Colors.primary }]}>
                                    Rp {(venue.price_per_hour * duration).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={[styles.modalFooter, { backgroundColor: cardColor, borderTopColor: borderColor }]}>
                        <TouchableOpacity
                            style={[styles.confirmBtn, isBooking && styles.confirmBtnDisabled]}
                            onPress={handleBooking}
                            disabled={isBooking}
                        >
                            <Text style={styles.confirmBtnText}>
                                {isBooking ? "Memproses..." : "Konfirmasi Booking"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingText: {
        textAlign: "center",
        marginTop: 100,
        fontSize: 16,
    },
    heroImage: {
        width: "100%",
        height: 250,
        backgroundColor: "#E5E7EB",
    },
    verifiedBadge: {
        position: "absolute",
        top: 100,
        left: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    verifiedText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    content: {
        marginTop: -20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    venueName: {
        fontSize: 24,
        fontWeight: "bold",
        flex: 1,
        marginRight: 12,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#92400E",
    },
    reviewCount: {
        fontSize: 12,
        color: "#92400E",
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 20,
    },
    address: {
        fontSize: 14,
        flex: 1,
    },
    infoCards: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    infoValue: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 8,
    },
    infoLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
    },
    facilitiesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    facilityItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    facilityText: {
        fontSize: 13,
    },
    description: {
        fontSize: 14,
        lineHeight: 22,
    },
    bottomCta: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderTopWidth: 1,
    },
    priceInfo: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: "bold",
    },
    bookBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    bookBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    formGroup: {
        marginBottom: 24,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    timeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    timeSlot: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    timeSlotText: {
        fontSize: 14,
        fontWeight: "500",
    },
    durationRow: {
        flexDirection: "row",
        gap: 12,
    },
    durationBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
    },
    durationText: {
        fontSize: 14,
        fontWeight: "600",
    },
    summaryCard: {
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: "500",
    },
    summaryTotal: {
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.1)",
        paddingTop: 12,
        marginTop: 4,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "bold",
    },
    totalValue: {
        fontSize: 20,
        fontWeight: "bold",
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
    },
    confirmBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    confirmBtnDisabled: {
        opacity: 0.7,
    },
    confirmBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    addReviewText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: "600",
    },
    reviewCard: {
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
    },
    reviewHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    reviewAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    reviewMeta: {
        flex: 1,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: "600",
    },
    reviewStars: {
        flexDirection: "row",
        marginTop: 2,
    },
    reviewComment: {
        fontSize: 13,
        lineHeight: 20,
    },
    noReviews: {
        alignItems: "center",
        paddingVertical: 24,
    },
    noReviewsText: {
        fontSize: 13,
        marginTop: 8,
    },

    dateOption: {
        width: 60,
        height: 70,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
    },
    dateDay: {
        fontSize: 12,
        marginBottom: 4,
    },
    dateNum: {
        fontSize: 18,
        fontWeight: "bold",
    },
});
