import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch,
    ActivityIndicator,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

const PROVINCES = [
    "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", "Sumatera Selatan",
    "Bengkulu", "Lampung", "Kepulauan Bangka Belitung", "Kepulauan Riau", "DKI Jakarta",
    "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Banten", "Bali",
    "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat", "Kalimantan Tengah",
    "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara",
    "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Gorontalo",
    "Sulawesi Barat", "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Tengah",
    "Papua Pegunungan", "Papua Selatan", "Papua Barat Daya"
];

const FACILITIES_OPTIONS = [
    { id: "ac", label: "AC", icon: "ac-unit" },
    { id: "parking", label: "Parkir", icon: "local-parking" },
    { id: "wifi", label: "WiFi", icon: "wifi" },
    { id: "toilet", label: "Toilet", icon: "wc" },
    { id: "canteen", label: "Kantin", icon: "restaurant" },
    { id: "musholla", label: "Musholla", icon: "mosque" },
    { id: "locker", label: "Locker", icon: "lock" },
    { id: "shower", label: "Shower", icon: "shower" },
];

interface ClubData {
    name: string;
    city: string;
    province: string;
    address: string;
    description: string;
    phone: string;
    email: string;
    website: string;
    instagram: string;
    facebook: string;
    isPublic: boolean;
    tableCount: string;
    pricePerHour: string;
    facilities: string[];
}

export default function EditClubScreen() {
    const router = useRouter();
    const { id: clubId } = useLocalSearchParams<{ id: string }>();
    const { profile } = useAuthStore();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showProvinceModal, setShowProvinceModal] = useState(false);
    const [showFacilitiesModal, setShowFacilitiesModal] = useState(false);

    const [clubData, setClubData] = useState<ClubData>({
        name: "",
        city: "",
        province: "",
        address: "",
        description: "",
        phone: "",
        email: "",
        website: "",
        instagram: "",
        facebook: "",
        isPublic: true,
        tableCount: "",
        pricePerHour: "",
        facilities: [],
    });

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    useEffect(() => {
        fetchClubData();
    }, [clubId]);

    const fetchClubData = async () => {
        if (!clubId) return;

        const { data, error } = await (supabase
            .from("clubs") as any)
            .select("*")
            .eq("id", clubId)
            .single();

        if (error) {
            Alert.alert("Error", "Gagal memuat data PTM");
            router.back();
            return;
        }

        if (data) {
            // Check if user is owner
            if (data.owner_id !== profile?.id) {
                Alert.alert("Error", "Anda tidak memiliki akses untuk mengedit PTM ini");
                router.back();
                return;
            }

            const socialMedia = data.social_media || {};
            setClubData({
                name: data.name || "",
                city: data.city || "",
                province: data.province || "",
                address: data.address || "",
                description: data.description || "",
                phone: data.phone || "",
                email: data.email || "",
                website: data.website || "",
                instagram: socialMedia.instagram || "",
                facebook: socialMedia.facebook || "",
                isPublic: data.is_public ?? true,
                tableCount: data.table_count?.toString() || "",
                pricePerHour: data.price_per_hour?.toString() || "",
                facilities: data.facilities || [],
            });
        }

        setIsLoading(false);
    };

    const validateForm = () => {
        if (!clubData.name.trim()) {
            Alert.alert("Validasi", "Nama PTM wajib diisi");
            return false;
        }
        if (clubData.name.trim().length < 3) {
            Alert.alert("Validasi", "Nama PTM minimal 3 karakter");
            return false;
        }
        if (!clubData.city.trim()) {
            Alert.alert("Validasi", "Kota wajib diisi");
            return false;
        }
        if (!clubData.province) {
            Alert.alert("Validasi", "Provinsi wajib dipilih");
            return false;
        }
        if (clubData.email && !clubData.email.includes("@")) {
            Alert.alert("Validasi", "Format email tidak valid");
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        if (!clubId) return;

        setIsSaving(true);

        const socialMedia: any = {};
        if (clubData.instagram) socialMedia.instagram = clubData.instagram;
        if (clubData.facebook) socialMedia.facebook = clubData.facebook;

        const { error } = await (supabase
            .from("clubs") as any)
            .update({
                name: clubData.name.trim(),
                city: clubData.city.trim(),
                province: clubData.province,
                address: clubData.address.trim() || null,
                description: clubData.description.trim() || null,
                phone: clubData.phone.trim() || null,
                email: clubData.email.trim() || null,
                website: clubData.website.trim() || null,
                social_media: Object.keys(socialMedia).length > 0 ? socialMedia : null,
                is_public: clubData.isPublic,
                table_count: parseInt(clubData.tableCount) || 0,
                price_per_hour: parseInt(clubData.pricePerHour) || 0,
                facilities: clubData.facilities.length > 0 ? clubData.facilities : null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", clubId);

        setIsSaving(false);

        if (error) {
            console.error("Error updating club:", error);
            Alert.alert("Error", "Gagal menyimpan perubahan");
        } else {
            Alert.alert("Berhasil", "Data PTM berhasil diperbarui");
            router.back();
        }
    };

    const toggleFacility = (facilityId: string) => {
        setClubData(prev => ({
            ...prev,
            facilities: prev.facilities.includes(facilityId)
                ? prev.facilities.filter(f => f !== facilityId)
                : [...prev.facilities, facilityId]
        }));
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.primary }]} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                    <MaterialIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit PTM</Text>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <MaterialIcons name="check" size={24} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={[styles.content, { backgroundColor: bgColor }]}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Basic Info Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Informasi Dasar</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Nama PTM *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.name}
                                onChangeText={(t) => setClubData(p => ({ ...p, name: t }))}
                                placeholder="Nama PTM"
                                placeholderTextColor={mutedColor}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Kota *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.city}
                                onChangeText={(t) => setClubData(p => ({ ...p, city: t }))}
                                placeholder="Kota"
                                placeholderTextColor={mutedColor}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Provinsi *</Text>
                            <TouchableOpacity
                                style={[styles.input, styles.selectInput, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => setShowProvinceModal(true)}
                            >
                                <Text style={{ color: clubData.province ? textColor : mutedColor }}>
                                    {clubData.province || "Pilih Provinsi"}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color={mutedColor} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Alamat Lengkap</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.address}
                                onChangeText={(t) => setClubData(p => ({ ...p, address: t }))}
                                placeholder="Alamat lengkap PTM"
                                placeholderTextColor={mutedColor}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Deskripsi</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.description}
                                onChangeText={(t) => setClubData(p => ({ ...p, description: t }))}
                                placeholder="Ceritakan tentang PTM Anda..."
                                placeholderTextColor={mutedColor}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>

                    {/* Venue Info Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Informasi Venue</Text>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: mutedColor }]}>Jumlah Meja</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    value={clubData.tableCount}
                                    onChangeText={(t) => setClubData(p => ({ ...p, tableCount: t }))}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: mutedColor }]}>Harga/Jam (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    value={clubData.pricePerHour}
                                    onChangeText={(t) => setClubData(p => ({ ...p, pricePerHour: t }))}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Fasilitas</Text>
                            <TouchableOpacity
                                style={[styles.input, styles.selectInput, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => setShowFacilitiesModal(true)}
                            >
                                <Text style={{ color: clubData.facilities.length > 0 ? textColor : mutedColor }}>
                                    {clubData.facilities.length > 0
                                        ? `${clubData.facilities.length} fasilitas dipilih`
                                        : "Pilih Fasilitas"}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color={mutedColor} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Contact Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Kontak</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Telepon</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.phone}
                                onChangeText={(t) => setClubData(p => ({ ...p, phone: t }))}
                                placeholder="08xxxxxxxxxx"
                                placeholderTextColor={mutedColor}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Email</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.email}
                                onChangeText={(t) => setClubData(p => ({ ...p, email: t }))}
                                placeholder="email@example.com"
                                placeholderTextColor={mutedColor}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Website</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.website}
                                onChangeText={(t) => setClubData(p => ({ ...p, website: t }))}
                                placeholder="https://..."
                                placeholderTextColor={mutedColor}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Social Media Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Media Sosial</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Instagram</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.instagram}
                                onChangeText={(t) => setClubData(p => ({ ...p, instagram: t }))}
                                placeholder="@username"
                                placeholderTextColor={mutedColor}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Facebook</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={clubData.facebook}
                                onChangeText={(t) => setClubData(p => ({ ...p, facebook: t }))}
                                placeholder="Nama atau URL halaman"
                                placeholderTextColor={mutedColor}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Visibility Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Visibilitas</Text>
                        <View style={[styles.switchRow, { backgroundColor: cardColor, borderColor }]}>
                            <View>
                                <Text style={[styles.switchLabel, { color: textColor }]}>PTM Publik</Text>
                                <Text style={[styles.switchHint, { color: mutedColor }]}>
                                    PTM dapat dilihat dan dicari oleh semua orang
                                </Text>
                            </View>
                            <Switch
                                value={clubData.isPublic}
                                onValueChange={(v) => setClubData(p => ({ ...p, isPublic: v }))}
                                trackColor={{ false: "#D1D5DB", true: Colors.primary }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Province Modal */}
            <Modal visible={showProvinceModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Pilih Provinsi</Text>
                            <TouchableOpacity onPress={() => setShowProvinceModal(false)}>
                                <MaterialIcons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {PROVINCES.map((prov) => (
                                <TouchableOpacity
                                    key={prov}
                                    style={[
                                        styles.modalItem,
                                        clubData.province === prov && { backgroundColor: Colors.primary + "20" }
                                    ]}
                                    onPress={() => {
                                        setClubData(p => ({ ...p, province: prov }));
                                        setShowProvinceModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.modalItemText,
                                        { color: clubData.province === prov ? Colors.primary : textColor }
                                    ]}>
                                        {prov}
                                    </Text>
                                    {clubData.province === prov && (
                                        <MaterialIcons name="check" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Facilities Modal */}
            <Modal visible={showFacilitiesModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Pilih Fasilitas</Text>
                            <TouchableOpacity onPress={() => setShowFacilitiesModal(false)}>
                                <MaterialIcons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {FACILITIES_OPTIONS.map((fac) => (
                                <TouchableOpacity
                                    key={fac.id}
                                    style={[
                                        styles.facilityItem,
                                        clubData.facilities.includes(fac.id) && { backgroundColor: Colors.primary + "20" }
                                    ]}
                                    onPress={() => toggleFacility(fac.id)}
                                >
                                    <MaterialIcons
                                        name={fac.icon as any}
                                        size={24}
                                        color={clubData.facilities.includes(fac.id) ? Colors.primary : mutedColor}
                                    />
                                    <Text style={[
                                        styles.facilityLabel,
                                        { color: clubData.facilities.includes(fac.id) ? Colors.primary : textColor }
                                    ]}>
                                        {fac.label}
                                    </Text>
                                    {clubData.facilities.includes(fac.id) && (
                                        <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.doneBtn, { backgroundColor: Colors.primary }]}
                            onPress={() => setShowFacilitiesModal(false)}
                        >
                            <Text style={styles.doneBtnText}>Selesai</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    headerBtn: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    content: {
        flex: 1,
        marginTop: -20,
        paddingTop: 30,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    selectInput: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    row: {
        flexDirection: "row",
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: "500",
    },
    switchHint: {
        fontSize: 12,
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        maxHeight: "70%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    modalItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    modalItemText: {
        fontSize: 16,
    },
    facilityItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    facilityLabel: {
        flex: 1,
        fontSize: 16,
    },
    doneBtn: {
        marginTop: 16,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    doneBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});
