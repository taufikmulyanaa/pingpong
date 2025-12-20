import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    Dimensions,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Club {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    banner_url: string | null;
    city: string;
    province: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    social_media: any;
    member_count: number;
    avg_rating_mr: number;
    is_verified: boolean;
    is_active: boolean;
    owner_id: string;
    created_at: string;
    // Venue fields (merged)
    table_count: number;
    price_per_hour: number;
    facilities: string[] | null;
    opening_hours: any;
    rating: number;
    review_count: number;
    owner: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
}

interface MembershipStatus {
    isMember: boolean;
    isPending: boolean;
    role: string | null;
}

interface ClubMember {
    id: string;
    role: string;
    joined_at: string;
    user: {
        id: string;
        name: string;
        avatar_url: string | null;
        rating_mr: number;
        level: number;
        is_online: boolean;
    };
}

interface ClubActivity {
    id: string;
    type: string;
    title: string;
    date: string;
    description: string;
}

const FACILITY_ICONS: Record<string, { icon: string; label: string; color: string }> = {
    ac: { icon: "ac-unit", label: "AC", color: "#3B82F6" },
    parking: { icon: "local-parking", label: "Parkir", color: "#10B981" },
    canteen: { icon: "restaurant", label: "Kantin", color: "#F59E0B" },
    wifi: { icon: "wifi", label: "WiFi", color: "#8B5CF6" },
    toilet: { icon: "wc", label: "Toilet", color: "#6366F1" },
    musholla: { icon: "mosque", label: "Musholla", color: "#059669" },
    locker: { icon: "lock", label: "Locker", color: "#EC4899" },
};

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Sample gallery images for clubs without photos
const DEFAULT_GALLERY = [
    "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    "https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?w=800",
];

export default function ClubDetailScreen() {
    const router = useRouter();
    const { id: clubId } = useLocalSearchParams<{ id: string }>();
    const { profile } = useAuthStore();

    const [club, setClub] = useState<Club | null>(null);
    const [membership, setMembership] = useState<MembershipStatus>({ isMember: false, isPending: false, role: null });
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Booking state
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState("");
    const [duration, setDuration] = useState(1);
    const [isBooking, setIsBooking] = useState(false);

    // Review state
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "#E5E7EB";

    const fetchClub = async () => {
        if (!clubId) return;

        const { data } = await supabase
            .from("clubs")
            .select(`
                *,
                owner:profiles!owner_id(id, name, avatar_url),
                venue:venues!venue_id(id, name, address, facilities, opening_hours)
            `)
            .eq("id", clubId)
            .single();

        if (data) setClub(data as any);
    };

    const fetchMembership = async () => {
        if (!clubId || !profile?.id) return;

        const { data } = await supabase
            .from("club_members")
            .select("role, status")
            .eq("club_id", clubId)
            .eq("user_id", profile.id)
            .single();

        if (data) {
            const memberData = data as any;
            setMembership({
                isMember: memberData.status === "APPROVED",
                isPending: memberData.status === "PENDING",
                role: memberData.role,
            });
        }
    };

    const fetchMembers = async () => {
        if (!clubId) return;

        const { data } = await supabase
            .from("club_members")
            .select(`
                id, role, joined_at,
                user:profiles!user_id(id, name, avatar_url, rating_mr, level, is_online)
            `)
            .eq("club_id", clubId)
            .eq("status", "APPROVED")
            .order("role", { ascending: true })
            .limit(10);

        if (data) {
            const roleOrder = { OWNER: 0, ADMIN: 1, COACH: 2, MEMBER: 3 };
            const sorted = (data as any[])
                .filter(m => m.user)
                .sort((a, b) => {
                    const roleCompare = roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
                    if (roleCompare !== 0) return roleCompare;
                    return (b.user?.rating_mr || 0) - (a.user?.rating_mr || 0);
                });
            setMembers(sorted);
        }

        setIsLoading(false);
        setRefreshing(false);
    };

    const fetchReviews = async () => {
        if (!clubId) return;
        const { data } = await supabase
            .from("club_reviews")
            .select("*, user:profiles(id, name, avatar_url)")
            .eq("club_id", clubId)
            .order("created_at", { ascending: false })
            .limit(10);
        if (data) setReviews(data);
    };

    useEffect(() => {
        fetchClub();
        fetchMembership();
        fetchMembers();
        fetchReviews();
    }, [clubId, profile?.id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchClub();
        fetchMembership();
        fetchMembers();
        fetchReviews();
    };

    const handleJoin = async () => {
        if (!clubId || !profile?.id) {
            console.log("handleJoin: Missing clubId or profile", { clubId, profileId: profile?.id });
            Alert.alert("Error", "Silakan login terlebih dahulu");
            return;
        }

        console.log("handleJoin: Attempting to join club", { clubId, profileId: profile.id });

        const { error } = await (supabase.from("club_members") as any)
            .insert({
                club_id: clubId,
                user_id: profile.id,
                role: "MEMBER",
                status: "PENDING",
            });

        if (error) {
            console.error("handleJoin error:", error);
            if (error.code === "23505") {
                Alert.alert("Info", "Anda sudah mengajukan permintaan bergabung");
            } else {
                Alert.alert("Error", error.message || "Gagal mengajukan bergabung");
            }
        } else {
            console.log("handleJoin: Success!");
            Alert.alert("Berhasil", "Permintaan bergabung telah dikirim!");
            setMembership({ isMember: false, isPending: true, role: "MEMBER" });
        }
    };

    const handleLeave = async () => {
        if (!clubId || !profile?.id) return;

        Alert.alert(
            "Keluar PTM",
            "Apakah kamu yakin ingin keluar dari PTM ini?",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Keluar",
                    style: "destructive",
                    onPress: async () => {
                        await (supabase.from("club_members") as any)
                            .delete()
                            .eq("club_id", clubId)
                            .eq("user_id", profile.id);

                        setMembership({ isMember: false, isPending: false, role: null });
                    },
                },
            ]
        );
    };

    const handleBooking = async () => {
        if (!profile?.id || !club || !selectedDate || !selectedTime) {
            Alert.alert("Error", "Lengkapi semua data booking");
            return;
        }

        setIsBooking(true);

        const [hours, minutes] = selectedTime.split(":").map(Number);
        const endHours = hours + duration;
        const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
        const startTime = `${selectedTime}:00`;

        const bookingData = {
            club_id: club.id,
            user_id: profile.id,
            booking_date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            duration_hours: duration,
            total_price: (club.price_per_hour || 0) * duration,
            status: "PENDING",
        };

        const { error } = await (supabase.from("club_bookings") as any).insert(bookingData);

        setIsBooking(false);

        if (error) {
            console.error(error);
            Alert.alert("Gagal", error.message);
        } else {
            setShowBookingModal(false);
            Alert.alert(
                "Booking Berhasil!",
                `Booking meja di ${club.name} pada ${selectedDate} jam ${selectedTime} selama ${duration} jam.\n\nTotal: Rp ${((club.price_per_hour || 0) * duration).toLocaleString()}`,
                [{ text: "OK" }]
            );
        }
    };

    const handleSubmitReview = async () => {
        if (!profile?.id || !club) {
            Alert.alert("Error", "Silakan login terlebih dahulu");
            return;
        }

        setIsSubmittingReview(true);

        const { error } = await (supabase.from("club_reviews") as any).insert({
            club_id: club.id,
            user_id: profile.id,
            rating: reviewRating,
            comment: reviewComment.trim() || null,
        });

        setIsSubmittingReview(false);

        if (error) {
            if (error.code === "23505") {
                Alert.alert("Error", "Anda sudah pernah memberikan ulasan untuk PTM ini");
            } else {
                Alert.alert("Error", "Gagal mengirim ulasan");
            }
        } else {
            setShowReviewModal(false);
            setReviewComment("");
            setReviewRating(5);
            fetchReviews();
            fetchClub();
            Alert.alert("Berhasil", "Terima kasih atas ulasannya!");
        }
    };

    const timeSlots = [
        "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
        "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
    ];

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "OWNER":
                return { label: "Owner", color: "#F59E0B", icon: "star" as const };
            case "ADMIN":
                return { label: "Admin", color: "#8B5CF6", icon: "admin-panel-settings" as const };
            case "COACH":
                return { label: "Pelatih", color: "#10B981", icon: "sports" as const };
            default:
                return null;
        }
    };

    // Default practice schedule for clubs
    const DEFAULT_SCHEDULE = {
        minggu: { open: "08:00", close: "17:00" },
        senin: { open: "16:00", close: "22:00" },
        selasa: { open: "16:00", close: "22:00" },
        rabu: { open: "16:00", close: "22:00" },
        kamis: { open: "16:00", close: "22:00" },
        jumat: { open: "16:00", close: "22:00" },
        sabtu: { open: "08:00", close: "22:00" },
    };

    // Default facilities for clubs
    const DEFAULT_FACILITIES = ["ac", "parking", "toilet", "wifi", "canteen"];

    const getOperatingHours = () => {
        const schedule = club?.opening_hours || DEFAULT_SCHEDULE;
        return DAYS.map((day, index) => {
            const dayKey = day.toLowerCase();
            const dayHours = schedule[dayKey];
            if (!dayHours || dayHours.closed) {
                return { day, hours: "Tutup", isToday: new Date().getDay() === index };
            }
            return {
                day,
                hours: `${dayHours.open || "08:00"} - ${dayHours.close || "22:00"}`,
                isToday: new Date().getDay() === index
            };
        });
    };

    const getClubFacilities = () => {
        return club?.facilities || DEFAULT_FACILITIES;
    };

    const isOwner = club?.owner_id === profile?.id;
    const onlineCount = members.filter(m => m.user?.is_online).length;
    const adminCount = members.filter(m => ["OWNER", "ADMIN", "COACH"].includes(m.role)).length;
    const galleryImages = club?.banner_url ? [club.banner_url, ...DEFAULT_GALLERY.slice(0, 2)] : DEFAULT_GALLERY;
    const operatingHours = getOperatingHours();
    const clubFacilities = getClubFacilities();

    if (!club) {
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
                    headerTransparent: true,
                    headerTitle: "",
                    headerTintColor: "#fff",
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {/* Gallery Section */}
                    <View style={styles.galleryContainer}>
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(e) => {
                                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                                setCurrentImageIndex(index);
                            }}
                        >
                            {galleryImages.map((img, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        setGalleryIndex(idx);
                                        setShowGalleryModal(true);
                                    }}
                                >
                                    <Image source={{ uri: img }} style={styles.galleryImage} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Premium Header Gradient Overlay */}
                        <LinearGradient
                            colors={['rgba(15,23,42,0.8)', 'transparent']}
                            style={styles.headerOverlay}
                        />

                        {/* Image Indicators */}
                        {galleryImages.length > 1 && (
                            <View style={styles.imageIndicators}>
                                {galleryImages.map((_, idx) => (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.indicator,
                                            currentImageIndex === idx && styles.indicatorActive,
                                        ]}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Photo Count Badge */}
                        <TouchableOpacity
                            style={styles.photoCountBadge}
                            onPress={() => setShowGalleryModal(true)}
                        >
                            <MaterialIcons name="photo-library" size={16} color="#fff" />
                            <Text style={styles.photoCountText}>{galleryImages.length} Foto</Text>
                        </TouchableOpacity>

                        {/* Gabung PTM Button - Top Right */}
                        {!isOwner && !membership.isMember && !membership.isPending && (
                            <TouchableOpacity
                                style={styles.joinBtnTopRight}
                                onPress={handleJoin}
                            >
                                <MaterialIcons name="group-add" size={18} color="#fff" />
                                <Text style={styles.joinBtnTopRightText}>Gabung PTM</Text>
                            </TouchableOpacity>
                        )}

                        {/* Pending Status Badge - Top Right */}
                        {!isOwner && membership.isPending && (
                            <View style={[styles.joinBtnTopRight, { backgroundColor: mutedColor }]}>
                                <MaterialIcons name="hourglass-empty" size={18} color="#fff" />
                                <Text style={styles.joinBtnTopRightText}>Menunggu</Text>
                            </View>
                        )}

                        {/* Verified Badge */}
                        {club?.is_verified && (
                            <View style={styles.verifiedBadge}>
                                <MaterialIcons name="verified" size={14} color="#fff" />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>

                    {/* Club Info */}
                    <View style={styles.infoSection}>
                        {/* Logo & Header */}
                        <View style={styles.logoContainer}>
                            <Image
                                source={{
                                    uri: club?.logo_url ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(club?.name || "PTM")}&background=001064&color=fff&size=100`,
                                }}
                                style={styles.logo}
                            />
                        </View>

                        <View style={styles.clubHeader}>
                            <View style={styles.nameRow}>
                                <Text style={[styles.clubName, { color: textColor }]}>
                                    {club?.name}
                                </Text>
                                {club?.is_verified && (
                                    <MaterialIcons name="verified" size={20} color={Colors.primary} />
                                )}
                            </View>
                            <View style={styles.locationRow}>
                                <MaterialIcons name="location-on" size={16} color={mutedColor} />
                                <Text style={[styles.clubLocation, { color: mutedColor }]}>
                                    {club?.city}{club?.province ? `, ${club.province}` : ""}
                                </Text>
                            </View>
                            {club?.address && (
                                <Text style={[styles.fullAddress, { color: mutedColor }]} numberOfLines={2}>
                                    {club.address}
                                </Text>
                            )}
                        </View>

                        {/* Quick Stats Cards */}
                        <View style={styles.statsRow}>
                            <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
                                <MaterialIcons name="groups" size={24} color="#fff" />
                                <Text style={styles.statValue}>{club?.member_count || 0}</Text>
                                <Text style={styles.statLabel}>Anggota</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: "#F59E0B" }]}>
                                <MaterialIcons name="emoji-events" size={24} color="#fff" />
                                <Text style={styles.statValue}>{club?.avg_rating_mr || 1000}</Text>
                                <Text style={styles.statLabel}>Rata-rata MR</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: "#10B981" }]}>
                                <MaterialIcons name="circle" size={24} color="#fff" />
                                <Text style={styles.statValue}>{onlineCount}</Text>
                                <Text style={styles.statLabel}>Online</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionRow}>
                            {isOwner ? (
                                <>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: Colors.primary, flex: 1 }]}
                                        onPress={() => router.push({ pathname: "/club/edit", params: { id: clubId } } as any)}
                                    >
                                        <MaterialIcons name="edit" size={20} color="#fff" />
                                        <Text style={styles.actionBtnText}>Edit Info</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: "#16610E", flex: 1 }]}
                                        onPress={() => router.push({ pathname: "/club/members", params: { id: clubId } } as any)}
                                    >
                                        <MaterialIcons name="settings" size={20} color="#fff" />
                                        <Text style={styles.actionBtnText}>Kelola</Text>
                                    </TouchableOpacity>
                                </>
                            ) : membership.isMember ? (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                                    onPress={handleLeave}
                                >
                                    <MaterialIcons name="logout" size={20} color="#fff" />
                                    <Text style={styles.actionBtnText}>Keluar PTM</Text>
                                </TouchableOpacity>
                            ) : membership.isPending ? (
                                <View style={[styles.actionBtn, { backgroundColor: mutedColor }]}>
                                    <MaterialIcons name="hourglass-empty" size={20} color="#fff" />
                                    <Text style={styles.actionBtnText}>Menunggu Persetujuan</Text>
                                </View>
                            ) : null}
                        </View>

                        {/* Description */}
                        {club?.description && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="info" size={20} color="#8B5CF6" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Tentang</Text>
                                </View>
                                <View style={[styles.sectionCard, { backgroundColor: cardColor }]}>
                                    <Text style={[styles.descText, { color: mutedColor }]}>
                                        {club.description}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Facilities */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="checklist" size={20} color={Colors.primary} />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Fasilitas</Text>
                            </View>
                            <View style={styles.facilitiesGrid}>
                                {clubFacilities.map((f: string) => {
                                    const facilityInfo = FACILITY_ICONS[f] || { icon: "check-circle", label: f, color: Colors.primary };
                                    return (
                                        <View key={f} style={[styles.facilityItem, { backgroundColor: cardColor }]}>
                                            <View style={[styles.facilityIconBg, { backgroundColor: `${facilityInfo.color}15` }]}>
                                                <MaterialIcons
                                                    name={facilityInfo.icon as any}
                                                    size={18}
                                                    color={facilityInfo.color}
                                                />
                                            </View>
                                            <Text style={[styles.facilityText, { color: textColor }]}>
                                                {facilityInfo.label}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Training Schedule */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="schedule" size={20} color="#F59E0B" />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Jadwal Latihan</Text>
                            </View>
                            <View style={[styles.hoursCard, { backgroundColor: cardColor }]}>
                                {operatingHours.map((item, index) => (
                                    <View
                                        key={item.day}
                                        style={[
                                            styles.hoursRow,
                                            item.isToday && styles.hoursRowToday,
                                            index < operatingHours.length - 1 && styles.hoursRowBorder
                                        ]}
                                    >
                                        <View style={styles.hoursDay}>
                                            <Text style={[
                                                styles.hoursDayText,
                                                { color: item.isToday ? Colors.primary : textColor }
                                            ]}>
                                                {item.day}
                                            </Text>
                                            {item.isToday && (
                                                <View style={styles.todayBadge}>
                                                    <Text style={styles.todayBadgeText}>Hari Ini</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[
                                            styles.hoursTime,
                                            { color: item.hours === "Tutup" ? "#EF4444" : mutedColor }
                                        ]}>
                                            {item.hours}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Contact Info */}
                        {(club?.phone || club?.email || club?.website || club?.social_media) && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="contact-phone" size={20} color="#10B981" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Kontak</Text>
                                </View>
                                <View style={[styles.contactCard, { backgroundColor: cardColor }]}>
                                    {club?.phone && (
                                        <View style={styles.contactRow}>
                                            <View style={[styles.contactIconBg, { backgroundColor: "#10B98115" }]}>
                                                <MaterialIcons name="phone" size={18} color="#10B981" />
                                            </View>
                                            <Text style={[styles.contactText, { color: textColor }]}>{club.phone}</Text>
                                        </View>
                                    )}
                                    {club?.email && (
                                        <View style={styles.contactRow}>
                                            <View style={[styles.contactIconBg, { backgroundColor: "#3B82F615" }]}>
                                                <MaterialIcons name="email" size={18} color="#3B82F6" />
                                            </View>
                                            <Text style={[styles.contactText, { color: textColor }]}>{club.email}</Text>
                                        </View>
                                    )}
                                    {club?.website && (
                                        <View style={styles.contactRow}>
                                            <View style={[styles.contactIconBg, { backgroundColor: "#8B5CF615" }]}>
                                                <MaterialIcons name="language" size={18} color="#8B5CF6" />
                                            </View>
                                            <Text style={[styles.contactText, { color: textColor }]}>{club.website}</Text>
                                        </View>
                                    )}
                                    {club?.social_media?.instagram && (
                                        <View style={styles.contactRow}>
                                            <View style={[styles.contactIconBg, { backgroundColor: "#E1306C15" }]}>
                                                <MaterialIcons name="camera-alt" size={18} color="#E1306C" />
                                            </View>
                                            <Text style={[styles.contactText, { color: textColor }]}>@{club.social_media.instagram}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Owner Info */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="person" size={20} color="#EF4444" />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Pemilik PTM</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.ownerCard, { backgroundColor: cardColor }]}
                                onPress={() => router.push({ pathname: "/player/[id]", params: { id: club.owner.id } })}
                            >
                                <Image
                                    source={{
                                        uri: club.owner?.avatar_url ||
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(club.owner?.name || "Owner")}&background=001064&color=fff`,
                                    }}
                                    style={styles.ownerAvatar}
                                />
                                <View style={styles.ownerInfo}>
                                    <Text style={[styles.ownerName, { color: textColor }]}>{club.owner?.name}</Text>
                                    <Text style={[styles.ownerRole, { color: Colors.primary }]}>Owner</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Top Members */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="leaderboard" size={20} color="#F59E0B" />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Top Anggota</Text>
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: "/club/members", params: { id: clubId } } as any)}
                                >
                                    <Text style={{ color: Colors.primary, fontWeight: "600" }}>Lihat Semua</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.membersCard, { backgroundColor: cardColor }]}>
                                {members.slice(0, 5).map((member, index) => {
                                    const roleBadge = getRoleBadge(member.role);
                                    return (
                                        <TouchableOpacity
                                            key={member.id}
                                            style={[
                                                styles.memberRow,
                                                index < Math.min(members.length, 5) - 1 && styles.memberRowBorder
                                            ]}
                                            onPress={() => router.push({ pathname: "/player/[id]", params: { id: member.user.id } })}
                                        >
                                            <View style={styles.memberLeft}>
                                                <Text style={[styles.memberRank, { color: mutedColor }]}>
                                                    #{index + 1}
                                                </Text>
                                                <View style={styles.memberAvatarContainer}>
                                                    <Image
                                                        source={{
                                                            uri: member.user?.avatar_url ||
                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.name || "User")}&background=001064&color=fff`,
                                                        }}
                                                        style={styles.memberAvatar}
                                                    />
                                                    {member.user?.is_online && <View style={styles.onlineDot} />}
                                                </View>
                                                <View style={styles.memberInfo}>
                                                    <View style={styles.memberNameRow}>
                                                        <Text style={[styles.memberName, { color: textColor }]}>
                                                            {member.user?.name}
                                                        </Text>
                                                        {roleBadge && (
                                                            <View style={[styles.roleBadge, { backgroundColor: `${roleBadge.color}20` }]}>
                                                                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>
                                                                    {roleBadge.label}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={[styles.memberLevel, { color: mutedColor }]}>
                                                        Level {member.user?.level || 1}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.mrBadge}>
                                                <MaterialIcons name="emoji-events" size={14} color="#F59E0B" />
                                                <Text style={styles.mrText}>{member.user?.rating_mr || 1000}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                {members.length === 0 && (
                                    <View style={styles.emptyMembers}>
                                        <MaterialIcons name="people-outline" size={40} color={mutedColor} />
                                        <Text style={[styles.emptyText, { color: mutedColor }]}>
                                            Belum ada anggota
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Reviews Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="rate-review" size={20} color="#EF4444" />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Ulasan</Text>
                                <TouchableOpacity
                                    style={styles.writeReviewBtn}
                                    onPress={() => setShowReviewModal(true)}
                                >
                                    <MaterialIcons name="edit" size={14} color={Colors.primary} />
                                    <Text style={styles.writeReviewText}>Tulis Ulasan</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Rating Summary */}
                            <View style={[styles.ratingSummary, { backgroundColor: cardColor }]}>
                                <View style={styles.ratingLeft}>
                                    <Text style={[styles.ratingBig, { color: textColor }]}>{(club?.rating || 0).toFixed(1)}</Text>
                                    <View style={styles.starsRow}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <MaterialIcons
                                                key={star}
                                                name={star <= Math.round(club?.rating || 0) ? "star" : "star-border"}
                                                size={16}
                                                color="#F59E0B"
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.totalReviews, { color: mutedColor }]}>
                                        {club?.review_count || 0} ulasan
                                    </Text>
                                </View>
                                <View style={styles.ratingBars}>
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = reviews.filter(r => r.rating === star).length;
                                        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                        return (
                                            <View key={star} style={styles.ratingBarRow}>
                                                <Text style={[styles.ratingBarLabel, { color: mutedColor }]}>{star}</Text>
                                                <View style={[styles.ratingBarBg, { backgroundColor: borderColor }]}>
                                                    <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Review List */}
                            {reviews.length > 0 ? (
                                reviews.slice(0, 5).map((review: any) => (
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
                                                    <Text style={[styles.reviewDate, { color: mutedColor }]}>
                                                        • {new Date(review.created_at).toLocaleDateString("id-ID")}
                                                    </Text>
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
                                    <MaterialIcons name="rate-review" size={40} color={mutedColor} />
                                    <Text style={[styles.noReviewsTitle, { color: textColor }]}>
                                        Belum ada ulasan
                                    </Text>
                                    <Text style={[styles.noReviewsText, { color: mutedColor }]}>
                                        Jadilah yang pertama memberikan ulasan!
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Established */}
                        <View style={[styles.establishedCard, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="event" size={20} color={mutedColor} />
                            <Text style={[styles.establishedText, { color: mutedColor }]}>
                                Didirikan {new Date(club.created_at).toLocaleDateString("id-ID", {
                                    year: "numeric",
                                    month: "long"
                                })}
                            </Text>
                        </View>

                        <View style={{ height: 140 }} />
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Bottom CTA - Booking */}
            <View style={[styles.bottomCta, { backgroundColor: cardColor, borderTopColor: borderColor }]}>
                <View style={styles.priceInfo}>
                    {club?.price_per_hour && club.price_per_hour > 0 ? (
                        <>
                            <Text style={[styles.priceLabel, { color: mutedColor }]}>Mulai dari</Text>
                            <Text style={[styles.priceValue, { color: Colors.primary }]}>
                                Rp {(club.price_per_hour).toLocaleString()}/jam
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.priceLabel, { color: mutedColor }]}>Booking</Text>
                            <Text style={[styles.priceValue, { color: textColor }]}>Hubungi PTM</Text>
                        </>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => setShowBookingModal(true)}
                >
                    <MaterialIcons name="event" size={20} color="#fff" />
                    <Text style={styles.bookBtnText}>Booking Meja</Text>
                </TouchableOpacity>
            </View>

            {/* Gallery Modal */}
            <Modal
                visible={showGalleryModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowGalleryModal(false)}
            >
                <View style={styles.galleryModalContainer}>
                    <TouchableOpacity
                        style={styles.galleryCloseBtn}
                        onPress={() => setShowGalleryModal(false)}
                    >
                        <MaterialIcons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <FlatList
                        data={galleryImages}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={galleryIndex}
                        getItemLayout={(_, index) => ({
                            length: SCREEN_WIDTH,
                            offset: SCREEN_WIDTH * index,
                            index,
                        })}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Image
                                source={{ uri: item }}
                                style={styles.galleryFullImage}
                                resizeMode="contain"
                            />
                        )}
                        keyExtractor={(_, index) => index.toString()}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                            setGalleryIndex(index);
                        }}
                    />
                    <Text style={styles.galleryCounter}>
                        {galleryIndex + 1} / {galleryImages.length}
                    </Text>
                </View>
            </Modal>

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
                                <Text style={[styles.summaryLabel, { color: mutedColor }]}>PTM</Text>
                                <Text style={[styles.summaryValue, { color: textColor }]}>{club?.name}</Text>
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
                                    Rp {((club?.price_per_hour || 0) * duration).toLocaleString()}
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

            {/* Review Modal */}
            <Modal
                visible={showReviewModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowReviewModal(false)}
            >
                <View style={styles.reviewModalOverlay}>
                    <View style={[styles.reviewModalContainer, { backgroundColor: bgColor }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                                <MaterialIcons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Tulis Ulasan</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.reviewFormContent}>
                            <Text style={[styles.reviewFormLabel, { color: textColor }]}>Rating</Text>
                            <View style={styles.ratingSelector}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                                        <MaterialIcons
                                            name={star <= reviewRating ? "star" : "star-border"}
                                            size={40}
                                            color="#F59E0B"
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.reviewFormLabel, { color: textColor }]}>Komentar (opsional)</Text>
                            <TextInput
                                style={[styles.reviewInput, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Bagikan pengalaman kamu..."
                                placeholderTextColor={mutedColor}
                                value={reviewComment}
                                onChangeText={setReviewComment}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                style={[styles.submitReviewBtn, isSubmittingReview && { opacity: 0.7 }]}
                                onPress={handleSubmitReview}
                                disabled={isSubmittingReview}
                            >
                                <Text style={styles.submitReviewText}>
                                    {isSubmittingReview ? "Mengirim..." : "Kirim Ulasan"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
    // Gallery
    galleryContainer: {
        position: "relative",
    },
    galleryImage: {
        width: SCREEN_WIDTH,
        height: 250,
        backgroundColor: '#1E1A4E',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    imageIndicators: {
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },
    indicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.5)",
    },
    indicatorActive: {
        width: 20,
        backgroundColor: "#fff",
    },
    photoCountBadge: {
        position: "absolute",
        bottom: 60,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0,0,0,0.6)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    photoCountText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },

    verifiedBadge: {
        position: "absolute",
        top: 16,
        right: 16,
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
    // Join PTM Button - Top Right
    joinBtnTopRight: {
        position: "absolute",
        top: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    joinBtnTopRightText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    infoSection: {
        marginTop: -40,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: Colors.background,
        paddingHorizontal: 16,
    },
    logoContainer: {
        alignSelf: "center",
        marginTop: -40,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 16,
        borderWidth: 4,
        borderColor: "#fff",
    },
    clubHeader: {
        alignItems: "center",
        marginTop: 12,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    clubName: {
        fontSize: 24,
        fontWeight: "700",
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
    },
    clubLocation: {
        fontSize: 14,
    },
    fullAddress: {
        fontSize: 13,
        textAlign: "center",
        marginTop: 4,
        paddingHorizontal: 20,
    },
    // Stats
    statsRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
    },
    statCard: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
        marginTop: 6,
    },
    statLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.8)",
        marginTop: 2,
    },
    actionRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    // Sections
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        flex: 1,
    },
    sectionCard: {
        padding: 16,
        borderRadius: 12,
    },
    descText: {
        fontSize: 14,
        lineHeight: 22,
    },
    // Facilities
    facilitiesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    facilityItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    facilityIconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    facilityText: {
        fontSize: 13,
        fontWeight: "500",
    },
    // Hours
    hoursCard: {
        borderRadius: 12,
        overflow: "hidden",
    },
    hoursRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    hoursRowToday: {
        backgroundColor: `${Colors.primary}10`,
    },
    hoursRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    hoursDay: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    hoursDayText: {
        fontSize: 14,
        fontWeight: "500",
    },
    todayBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    todayBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "600",
    },
    hoursTime: {
        fontSize: 14,
    },
    // Contact
    contactCard: {
        padding: 16,
        borderRadius: 12,
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    contactIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    contactText: {
        fontSize: 14,
        flex: 1,
    },
    // Owner
    ownerCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 12,
    },
    ownerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    ownerInfo: {
        flex: 1,
    },
    ownerName: {
        fontSize: 15,
        fontWeight: "600",
    },
    ownerRole: {
        fontSize: 12,
        marginTop: 2,
    },
    // Members
    membersCard: {
        borderRadius: 12,
        overflow: "hidden",
    },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    memberRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    memberLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    memberRank: {
        fontSize: 14,
        fontWeight: "600",
        width: 28,
    },
    memberAvatarContainer: {
        position: "relative",
        marginRight: 10,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    onlineDot: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#10B981",
        borderWidth: 2,
        borderColor: "#fff",
    },
    memberInfo: {
        flex: 1,
    },
    memberNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    memberName: {
        fontSize: 14,
        fontWeight: "500",
    },
    roleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: "600",
    },
    memberLevel: {
        fontSize: 12,
        marginTop: 2,
    },
    mrBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    mrText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#B45309",
    },
    emptyMembers: {
        alignItems: "center",
        paddingVertical: 24,
    },
    emptyText: {
        fontSize: 13,
        marginTop: 8,
    },
    // Stats Grid
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        borderRadius: 12,
        overflow: "hidden",
    },
    statGridItem: {
        width: "50%",
        padding: 16,
        alignItems: "center",
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: "#F3F4F6",
    },
    statGridValue: {
        fontSize: 24,
        fontWeight: "700",
    },
    statGridLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    // Established
    establishedCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
    },
    establishedText: {
        fontSize: 13,
    },
    // Gallery Modal
    galleryModalContainer: {
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
    },
    galleryCloseBtn: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    galleryFullImage: {
        width: SCREEN_WIDTH,
        height: "100%",
    },
    galleryCounter: {
        position: "absolute",
        bottom: 50,
        left: 0,
        right: 0,
        textAlign: "center",
        color: "#fff",
        fontSize: 14,
    },
    // Bottom CTA
    bottomCta: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderTopWidth: 1,
    },
    priceInfo: {},
    priceLabel: {
        fontSize: 11,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: "700",
    },
    bookBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    bookBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Reviews Section
    writeReviewBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginLeft: "auto",
    },
    writeReviewText: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: "500",
    },
    ratingSummary: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
    },
    ratingLeft: {
        alignItems: "center",
        paddingRight: 24,
        borderRightWidth: 1,
        borderRightColor: "#E5E7EB",
    },
    ratingBig: {
        fontSize: 40,
        fontWeight: "700",
    },
    starsRow: {
        flexDirection: "row",
        marginTop: 4,
    },
    totalReviews: {
        fontSize: 12,
        marginTop: 4,
    },
    ratingBars: {
        flex: 1,
        paddingLeft: 16,
        justifyContent: "center",
        gap: 4,
    },
    ratingBarRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    ratingBarLabel: {
        fontSize: 12,
        width: 12,
        textAlign: "center",
    },
    ratingBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
    },
    ratingBarFill: {
        height: 6,
        backgroundColor: "#F59E0B",
        borderRadius: 3,
    },
    reviewCard: {
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
    },
    reviewHeader: {
        flexDirection: "row",
        gap: 12,
    },
    reviewAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
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
        alignItems: "center",
        marginTop: 2,
    },
    reviewDate: {
        fontSize: 11,
        marginLeft: 8,
    },
    reviewComment: {
        fontSize: 13,
        marginTop: 10,
        lineHeight: 20,
    },
    noReviews: {
        alignItems: "center",
        paddingVertical: 32,
    },
    noReviewsTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 8,
    },
    noReviewsText: {
        fontSize: 13,
        marginTop: 4,
    },
    // Booking Modal
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    formLabel: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 10,
    },
    dateOption: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        minWidth: 60,
    },
    dateDay: {
        fontSize: 11,
        marginBottom: 2,
    },
    dateNum: {
        fontSize: 18,
        fontWeight: "600",
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
        gap: 10,
    },
    durationBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
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
        marginTop: 10,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: "500",
    },
    summaryTotal: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: "600",
    },
    totalValue: {
        fontSize: 20,
        fontWeight: "700",
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
        fontWeight: "600",
    },
    // Review Modal
    reviewModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    reviewModalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "80%",
    },
    reviewFormContent: {
        padding: 20,
    },
    reviewFormLabel: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 10,
    },
    ratingSelector: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 20,
    },
    reviewInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        minHeight: 100,
    },
    submitReviewBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 16,
    },
    submitReviewText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
