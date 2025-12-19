import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Image,
    Switch,
    Modal,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Colors, Facilities } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface Schedule {
    day: string;
    enabled: boolean;
    startTime: string;
    endTime: string;
}

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function HostTableScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();

    // Form state
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [pricePerHour, setPricePerHour] = useState("");
    const [tableType, setTableType] = useState<"INDOOR" | "OUTDOOR">("INDOOR");
    const [tableCount, setTableCount] = useState("1");
    const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<Schedule[]>(
        DAYS.map(day => ({ day, enabled: false, startTime: "08:00", endTime: "22:00" }))
    );
    const [privacy, setPrivacy] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("PUBLIC");
    const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
    const [showFriendsModal, setShowFriendsModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const toggleFacility = (id: string) => {
        setSelectedFacilities(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const toggleScheduleDay = (index: number) => {
        setSchedule(prev => {
            const updated = [...prev];
            updated[index].enabled = !updated[index].enabled;
            return updated;
        });
    };

    const handlePhotoUpload = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert("Izin Diperlukan", "Izinkan akses galeri untuk memilih foto");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Image picker error:", error);
            Alert.alert("Error", "Gagal memilih foto");
        }
    };

    const handleSubmit = async () => {
        if (!name || !address || !city) {
            Alert.alert("Validasi", "Nama, alamat, dan kota wajib diisi!");
            return;
        }

        if (!profile) {
            Alert.alert("Error", "Anda harus login untuk membuat venue");
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate slug from name
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

            // Build opening hours from schedule
            const openingHours: any = {};
            schedule.forEach(s => {
                if (s.enabled) {
                    openingHours[s.day] = { open: s.startTime, close: s.endTime };
                }
            });
            // Upload image to Supabase Storage if we have one
            let imageUrls: string[] = [];
            if (photoUri) {
                try {
                    console.log("Uploading image to Supabase Storage...");

                    // For web, we need to fetch the blob and upload
                    const response = await fetch(photoUri);
                    const blob = await response.blob();

                    // Generate unique filename - use user ID as folder  
                    const fileExt = blob.type.split("/")[1] || "jpg";
                    const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

                    // Upload to Supabase Storage (venue-images bucket)
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from("venue-images")
                        .upload(fileName, blob, {
                            contentType: blob.type,
                            upsert: false,
                        });

                    if (uploadError) {
                        console.error("Upload error:", uploadError);
                        // Continue without image if upload fails
                    } else {
                        // Get public URL
                        const { data: urlData } = supabase.storage
                            .from("venue-images")
                            .getPublicUrl(fileName);

                        if (urlData?.publicUrl) {
                            imageUrls = [urlData.publicUrl];
                            console.log("Image uploaded:", urlData.publicUrl);
                        }
                    }
                } catch (uploadErr) {
                    console.error("Error uploading image:", uploadErr);
                    // Continue without image if upload fails
                }
            }

            const venueData = {
                name,
                slug: `${slug}-${Date.now()}`,
                address,
                city,
                owner_id: profile.id,
                price_per_hour: parseInt(pricePerHour) || 0,
                facilities: selectedFacilities,
                opening_hours: openingHours,
                is_active: true,
                images: imageUrls,
                latitude: 0,
                longitude: 0,
                table_count: parseInt(tableCount) || 1,
            };

            console.log("Creating venue with data:", venueData);
            console.log("Profile ID:", profile.id);

            // Check auth session
            const { data: session } = await supabase.auth.getSession();
            console.log("Auth session:", session?.session?.user?.id || "NO SESSION");

            if (!session?.session) {
                Alert.alert("Error", "Sesi login tidak ditemukan. Silakan login ulang.");
                setIsSubmitting(false);
                return;
            }

            console.log("Starting insert...");

            // Add timeout to detect hanging requests
            const insertPromise = (supabase.from("venues") as any)
                .insert(venueData)
                .select();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timeout after 10 seconds")), 10000)
            );

            const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any;

            console.log("Insert completed!");
            console.log("Insert result - data:", data, "error:", error);

            if (error) {
                console.error("Error creating venue:", error);
                Alert.alert("Error", `Gagal membuat venue: ${error.message}\n\nCode: ${error.code}\n\nDetails: ${JSON.stringify(error.details || {})}`);
            } else {
                Alert.alert("Berhasil!", `Venue "${name}" berhasil dibuat!`, [
                    {
                        text: "OK",
                        onPress: () => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace("/host");
                            }
                        }
                    }
                ]);
            }
        } catch (error: any) {
            console.error("Submit error:", error);
            Alert.alert("Error", `Terjadi kesalahan: ${error?.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Mock friends list
    const mockFriends: any[] = [];

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Custom Header */}
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity
                        onPress={() => router.canGoBack() ? router.back() : router.replace("/host")}
                        style={styles.backButton}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Host Meja Baru</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Photo Upload */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Foto Lokasi</Text>
                        <TouchableOpacity
                            style={[styles.photoUpload, { backgroundColor: cardColor, borderColor }]}
                            onPress={handlePhotoUpload}
                        >
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <MaterialIcons name="add-a-photo" size={40} color={mutedColor} />
                                    <Text style={[styles.photoText, { color: mutedColor }]}>
                                        Tap untuk upload foto
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Details */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Detail Lokasi</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Nama Lokasi *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Contoh: GOR Bulungan"
                                placeholderTextColor={mutedColor}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Alamat Lengkap *</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Jl. Contoh No. 123"
                                placeholderTextColor={mutedColor}
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Kota *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Jakarta Selatan"
                                placeholderTextColor={mutedColor}
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Harga per Jam (Rp)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="50000"
                                placeholderTextColor={mutedColor}
                                value={pricePerHour}
                                onChangeText={setPricePerHour}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Tipe Lokasi</Text>
                            <View style={styles.typeButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.typeBtn,
                                        { backgroundColor: tableType === "INDOOR" ? Colors.primary : cardColor, borderColor }
                                    ]}
                                    onPress={() => setTableType("INDOOR")}
                                >
                                    <MaterialIcons
                                        name="home"
                                        size={20}
                                        color={tableType === "INDOOR" ? "#fff" : textColor}
                                    />
                                    <Text style={[
                                        styles.typeBtnText,
                                        { color: tableType === "INDOOR" ? "#fff" : textColor }
                                    ]}>Indoor</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.typeBtn,
                                        { backgroundColor: tableType === "OUTDOOR" ? Colors.primary : cardColor, borderColor }
                                    ]}
                                    onPress={() => setTableType("OUTDOOR")}
                                >
                                    <MaterialIcons
                                        name="park"
                                        size={20}
                                        color={tableType === "OUTDOOR" ? "#fff" : textColor}
                                    />
                                    <Text style={[
                                        styles.typeBtnText,
                                        { color: tableType === "OUTDOOR" ? "#fff" : textColor }
                                    ]}>Outdoor</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Jumlah Meja</Text>
                            <View style={styles.counterRow}>
                                <TouchableOpacity
                                    style={[styles.counterBtn, { backgroundColor: cardColor, borderColor }]}
                                    onPress={() => setTableCount(String(Math.max(1, parseInt(tableCount) - 1)))}
                                >
                                    <MaterialIcons name="remove" size={24} color={textColor} />
                                </TouchableOpacity>
                                <Text style={[styles.counterValue, { color: textColor }]}>{tableCount}</Text>
                                <TouchableOpacity
                                    style={[styles.counterBtn, { backgroundColor: cardColor, borderColor }]}
                                    onPress={() => setTableCount(String(parseInt(tableCount) + 1))}
                                >
                                    <MaterialIcons name="add" size={24} color={textColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Facilities */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Fasilitas</Text>
                        <View style={styles.facilityGrid}>
                            {Facilities.map(facility => (
                                <TouchableOpacity
                                    key={facility.id}
                                    style={[
                                        styles.facilityChip,
                                        {
                                            backgroundColor: selectedFacilities.includes(facility.id)
                                                ? Colors.primary
                                                : cardColor,
                                            borderColor: selectedFacilities.includes(facility.id)
                                                ? Colors.primary
                                                : borderColor,
                                        }
                                    ]}
                                    onPress={() => toggleFacility(facility.id)}
                                >
                                    <Text style={[
                                        styles.facilityText,
                                        { color: selectedFacilities.includes(facility.id) ? "#fff" : textColor }
                                    ]}>
                                        {facility.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Schedule */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Jadwal & Ketersediaan</Text>
                        {schedule.map((item, index) => (
                            <View key={item.day} style={[styles.scheduleRow, { borderBottomColor: borderColor }]}>
                                <View style={styles.scheduleLeft}>
                                    <Switch
                                        value={item.enabled}
                                        onValueChange={() => toggleScheduleDay(index)}
                                        trackColor={{ false: "#E5E7EB", true: Colors.primary }}
                                    />
                                    <Text style={[
                                        styles.scheduleDay,
                                        { color: item.enabled ? textColor : mutedColor }
                                    ]}>
                                        {item.day}
                                    </Text>
                                </View>
                                {item.enabled && (
                                    <View style={styles.scheduleTime}>
                                        <Text style={[styles.timeText, { color: textColor }]}>
                                            {item.startTime} - {item.endTime}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Privacy */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Privasi</Text>
                        <View style={styles.privacyOptions}>
                            {[
                                { key: "PUBLIC", label: "Publik", icon: "public", desc: "Semua orang bisa lihat" },
                                { key: "FRIENDS", label: "Hanya Teman", icon: "people", desc: "Hanya teman yang bisa lihat" },
                                { key: "PRIVATE", label: "Privat", icon: "lock", desc: "Hanya undangan" },
                            ].map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.privacyCard,
                                        {
                                            backgroundColor: privacy === opt.key ? `${Colors.primary}15` : cardColor,
                                            borderColor: privacy === opt.key ? Colors.primary : borderColor,
                                        }
                                    ]}
                                    onPress={() => setPrivacy(opt.key as any)}
                                >
                                    <MaterialIcons
                                        name={opt.icon as any}
                                        size={24}
                                        color={privacy === opt.key ? Colors.primary : mutedColor}
                                    />
                                    <View style={styles.privacyInfo}>
                                        <Text style={[styles.privacyLabel, { color: textColor }]}>{opt.label}</Text>
                                        <Text style={[styles.privacyDesc, { color: mutedColor }]}>{opt.desc}</Text>
                                    </View>
                                    {privacy === opt.key && (
                                        <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Invite Friends */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Undang Teman</Text>
                        <TouchableOpacity
                            style={[styles.inviteBtn, { backgroundColor: cardColor, borderColor }]}
                            onPress={() => setShowFriendsModal(true)}
                        >
                            <MaterialIcons name="person-add" size={20} color={Colors.primary} />
                            <Text style={[styles.inviteBtnText, { color: Colors.primary }]}>
                                {invitedFriends.length > 0
                                    ? `${invitedFriends.length} teman dipilih`
                                    : "Pilih teman untuk diundang"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Submit Button */}
                <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: Colors.primary }]}
                        onPress={handleSubmit}
                    >
                        <MaterialIcons name="check" size={20} color="#fff" />
                        <Text style={styles.submitBtnText}>Buat Meja</Text>
                    </TouchableOpacity>
                </View>

                {/* Friends Modal */}
                <Modal visible={showFriendsModal} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: textColor }]}>Undang Teman</Text>
                                <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
                                    <MaterialIcons name="close" size={24} color={mutedColor} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.friendsList}>
                                {mockFriends.map(friend => (
                                    <TouchableOpacity
                                        key={friend.id}
                                        style={[styles.friendItem, { borderBottomColor: borderColor }]}
                                        onPress={() => {
                                            setInvitedFriends(prev =>
                                                prev.includes(friend.id)
                                                    ? prev.filter(id => id !== friend.id)
                                                    : [...prev, friend.id]
                                            );
                                        }}
                                    >
                                        <View style={[styles.friendAvatar, { backgroundColor: Colors.blueLight }]}>
                                            <Text style={styles.friendInitial}>
                                                {friend.name.charAt(0)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.friendName, { color: textColor }]}>{friend.name}</Text>
                                        <MaterialIcons
                                            name={invitedFriends.includes(friend.id) ? "check-box" : "check-box-outline-blank"}
                                            size={24}
                                            color={invitedFriends.includes(friend.id) ? Colors.primary : mutedColor}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={[styles.modalSubmit, { backgroundColor: Colors.primary }]}
                                onPress={() => setShowFriendsModal(false)}
                            >
                                <Text style={styles.modalSubmitText}>Selesai</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "bold", textAlign: "center" },
    backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
    scrollView: { flex: 1 },
    content: { padding: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    photoUpload: { height: 160, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", overflow: "hidden" },
    photoPreview: { width: "100%", height: "100%" },
    photoPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
    photoText: { marginTop: 8, fontSize: 14 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    textArea: { minHeight: 80, textAlignVertical: "top" },
    typeButtons: { flexDirection: "row", gap: 12 },
    typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
    typeBtnText: { fontSize: 14, fontWeight: "600" },
    counterRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    counterBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
    counterValue: { fontSize: 20, fontWeight: "bold", minWidth: 40, textAlign: "center" },
    facilityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    facilityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    facilityText: { fontSize: 13, fontWeight: "500" },
    scheduleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1 },
    scheduleLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    scheduleDay: { fontSize: 15, fontWeight: "500" },
    scheduleTime: { flexDirection: "row", alignItems: "center" },
    timeText: { fontSize: 14 },
    privacyOptions: { gap: 10 },
    privacyCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
    privacyInfo: { flex: 1 },
    privacyLabel: { fontSize: 15, fontWeight: "600" },
    privacyDesc: { fontSize: 12, marginTop: 2 },
    inviteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 10, borderWidth: 1, gap: 8 },
    inviteBtnText: { fontSize: 15, fontWeight: "500" },
    bottomAction: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
    submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: "bold" },
    friendsList: { maxHeight: 300 },
    friendItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
    friendAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
    friendInitial: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    friendName: { flex: 1, fontSize: 15 },
    modalSubmit: { padding: 14, borderRadius: 10, alignItems: "center", marginTop: 16 },
    modalSubmitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
