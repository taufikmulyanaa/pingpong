import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    RefreshControl,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface Club {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    city: string;
    member_count: number;
    avg_rating_mr: number;
    is_verified: boolean;
}

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

export default function ClubListScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();

    const [clubs, setClubs] = useState<Club[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showProvinceModal, setShowProvinceModal] = useState(false);
    const [showFacilitiesModal, setShowFacilitiesModal] = useState(false);

    // Facilities options
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

    // Form state - comprehensive with venue fields
    const [newClub, setNewClub] = useState({
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
        // Venue fields
        tableCount: "",
        pricePerHour: "",
        facilities: [] as string[],
    });
    const [isCreating, setIsCreating] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const fetchClubs = async () => {
        const { data, error } = await supabase
            .from("clubs")
            .select("id, name, slug, logo_url, city, member_count, avg_rating_mr, is_verified")
            .eq("is_active", true)
            .eq("is_public", true)
            .order("member_count", { ascending: false });

        if (data) {
            setClubs(data);
        }

        setIsLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchClubs();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchClubs();
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    };

    const validateForm = () => {
        if (!newClub.name.trim()) {
            Alert.alert("Validasi", "Nama PTM wajib diisi");
            return false;
        }
        if (newClub.name.trim().length < 3) {
            Alert.alert("Validasi", "Nama PTM minimal 3 karakter");
            return false;
        }
        if (!newClub.city.trim()) {
            Alert.alert("Validasi", "Kota wajib diisi");
            return false;
        }
        if (!newClub.province) {
            Alert.alert("Validasi", "Provinsi wajib dipilih");
            return false;
        }
        if (newClub.email && !newClub.email.includes("@")) {
            Alert.alert("Validasi", "Format email tidak valid");
            return false;
        }
        if (newClub.phone && newClub.phone.length < 10) {
            Alert.alert("Validasi", "Nomor telepon tidak valid");
            return false;
        }
        return true;
    };

    const handleCreateClub = async () => {
        if (!validateForm()) return;
        if (!profile?.id) {
            Alert.alert("Error", "Silakan login terlebih dahulu");
            return;
        }

        setIsCreating(true);

        const slug = generateSlug(newClub.name) + "-" + Date.now().toString(36);

        const socialMedia: any = {};
        if (newClub.instagram) socialMedia.instagram = newClub.instagram;
        if (newClub.facebook) socialMedia.facebook = newClub.facebook;

        const { data, error } = await (supabase.from("clubs") as any)
            .insert({
                name: newClub.name.trim(),
                slug: slug,
                city: newClub.city.trim(),
                province: newClub.province,
                address: newClub.address.trim() || null,
                description: newClub.description.trim() || null,
                phone: newClub.phone.trim() || null,
                email: newClub.email.trim() || null,
                website: newClub.website.trim() || null,
                social_media: Object.keys(socialMedia).length > 0 ? socialMedia : null,
                owner_id: profile.id,
                is_public: newClub.isPublic,
                // Venue fields
                table_count: parseInt(newClub.tableCount) || 0,
                price_per_hour: parseInt(newClub.pricePerHour) || 0,
                facilities: newClub.facilities.length > 0 ? newClub.facilities : null,
            })
            .select()
            .single();

        setIsCreating(false);

        if (error) {
            console.error("Error creating club:", error);
            Alert.alert("Error", "Gagal membuat PTM. Silakan coba lagi.");
        } else if (data) {
            // Auto-add owner as member
            await (supabase.from("club_members") as any).insert({
                club_id: data.id,
                user_id: profile.id,
                role: "OWNER",
                status: "APPROVED",
                joined_at: new Date().toISOString(),
            });

            Alert.alert("Berhasil", "PTM berhasil dibuat!");
            setShowCreateModal(false);
            resetForm();
            fetchClubs();
            router.push({ pathname: "/club/[id]", params: { id: data.id } });
        }
    };

    const resetForm = () => {
        setNewClub({
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
    };

    const toggleFacility = (facilityId: string) => {
        setNewClub(prev => ({
            ...prev,
            facilities: prev.facilities.includes(facilityId)
                ? prev.facilities.filter(f => f !== facilityId)
                : [...prev.facilities, facilityId]
        }));
    };

    const filteredClubs = clubs.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Custom Navy Header */}
                <LinearGradient
                    colors={[Colors.secondary, '#000830']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    {/* Abstract Background Decorations */}
                    <View style={styles.bgDecorationCircle1} />
                    <View style={styles.bgDecorationCircle2} />

                    <View style={styles.headerContent}>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                            <MaterialIcons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Klub PTM</Text>
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={() => setShowCreateModal(true)}
                        >
                            <MaterialIcons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: cardColor }]}>
                        <MaterialIcons name="search" size={20} color={mutedColor} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder="Cari PTM atau kota..."
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Club List */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {filteredClubs.map((club) => (
                        <TouchableOpacity
                            key={club.id}
                            style={[styles.clubCard, { backgroundColor: cardColor }]}
                            onPress={() => router.push({ pathname: "/club/[id]", params: { id: club.id } })}
                        >
                            <Image
                                source={{
                                    uri: club.logo_url ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=001064&color=fff&size=100`,
                                }}
                                style={styles.clubLogo}
                            />
                            <View style={styles.clubInfo}>
                                <View style={styles.clubHeader}>
                                    <Text style={[styles.clubName, { color: textColor }]}>
                                        {club.name}
                                    </Text>
                                    {club.is_verified && (
                                        <MaterialIcons name="verified" size={16} color={Colors.primary} />
                                    )}
                                </View>
                                <Text style={[styles.clubCity, { color: mutedColor }]}>
                                    <MaterialIcons name="location-on" size={12} color={mutedColor} /> {club.city}
                                </Text>
                                <View style={styles.clubStats}>
                                    <View style={styles.statItem}>
                                        <MaterialIcons name="people" size={14} color={Colors.primary} />
                                        <Text style={[styles.statText, { color: mutedColor }]}>
                                            {club.member_count} anggota
                                        </Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <MaterialIcons name="emoji-events" size={14} color="#F59E0B" />
                                        <Text style={[styles.statText, { color: mutedColor }]}>
                                            MR {club.avg_rating_mr}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                        </TouchableOpacity>
                    ))}

                    {/* Empty State */}
                    {filteredClubs.length === 0 && !isLoading && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="groups" size={48} color={mutedColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                Belum ada PTM
                            </Text>
                            <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                Buat PTM baru atau tunggu ada yang mendaftar
                            </Text>
                            <TouchableOpacity
                                style={[styles.createBtn, { backgroundColor: Colors.primary }]}
                                onPress={() => setShowCreateModal(true)}
                            >
                                <Text style={styles.createBtnText}>Buat PTM Baru</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>

            {/* Create Modal - Comprehensive Form */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                                <MaterialIcons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Buat PTM Baru</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {/* Form */}
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Section: Informasi Dasar */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="info" size={20} color={Colors.primary} />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Informasi Dasar</Text>
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Nama PTM *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Contoh: PTM Garuda Jaya"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.name}
                                    onChangeText={(v) => setNewClub({ ...newClub, name: v })}
                                    maxLength={50}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Deskripsi</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Ceritakan tentang sejarah, visi misi, dan kegiatan PTM kamu..."
                                    placeholderTextColor={mutedColor}
                                    value={newClub.description}
                                    onChangeText={(v) => setNewClub({ ...newClub, description: v })}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    maxLength={500}
                                />
                                <Text style={[styles.charCount, { color: mutedColor }]}>
                                    {newClub.description.length}/500
                                </Text>
                            </View>

                            {/* Section: Lokasi */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="location-on" size={20} color="#EF4444" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Lokasi</Text>
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Provinsi *</Text>
                                <TouchableOpacity
                                    style={[styles.selectInput, { backgroundColor: cardColor, borderColor }]}
                                    onPress={() => setShowProvinceModal(true)}
                                >
                                    <Text style={[styles.selectText, { color: newClub.province ? textColor : mutedColor }]}>
                                        {newClub.province || "Pilih Provinsi"}
                                    </Text>
                                    <MaterialIcons name="keyboard-arrow-down" size={24} color={mutedColor} />
                                </TouchableOpacity>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Kota/Kabupaten *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Contoh: Jakarta Selatan"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.city}
                                    onChangeText={(v) => setNewClub({ ...newClub, city: v })}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Alamat Lengkap</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.address}
                                    onChangeText={(v) => setNewClub({ ...newClub, address: v })}
                                    multiline
                                    numberOfLines={2}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Section: Kontak */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="phone" size={20} color="#10B981" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Kontak</Text>
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Nomor Telepon</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="081234567890"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.phone}
                                    onChangeText={(v) => setNewClub({ ...newClub, phone: v.replace(/[^0-9]/g, "") })}
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Email</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="ptm@example.com"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.email}
                                    onChangeText={(v) => setNewClub({ ...newClub, email: v.toLowerCase() })}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Website</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="https://ptm-example.com"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.website}
                                    onChangeText={(v) => setNewClub({ ...newClub, website: v })}
                                    keyboardType="url"
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Section: Media Sosial */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="share" size={20} color="#8B5CF6" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Media Sosial</Text>
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Instagram</Text>
                                <View style={[styles.socialInput, { backgroundColor: cardColor, borderColor }]}>
                                    <Text style={[styles.socialPrefix, { color: mutedColor }]}>@</Text>
                                    <TextInput
                                        style={[styles.socialTextInput, { color: textColor }]}
                                        placeholder="username_instagram"
                                        placeholderTextColor={mutedColor}
                                        value={newClub.instagram}
                                        onChangeText={(v) => setNewClub({ ...newClub, instagram: v.replace(/[^a-zA-Z0-9._]/g, "") })}
                                        autoCapitalize="none"
                                    />
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Facebook</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Nama halaman Facebook"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.facebook}
                                    onChangeText={(v) => setNewClub({ ...newClub, facebook: v })}
                                />
                            </View>

                            {/* Section: Info Venue */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="table-restaurant" size={20} color="#10B981" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Info Venue</Text>
                                </View>

                                <Text style={[styles.inputLabel, { color: mutedColor }]}>Jumlah Meja</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Contoh: 5"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.tableCount}
                                    onChangeText={(v) => setNewClub({ ...newClub, tableCount: v.replace(/[^0-9]/g, '') })}
                                    keyboardType="numeric"
                                />

                                <Text style={[styles.inputLabel, { color: mutedColor }]}>Harga per Jam (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="Contoh: 25000"
                                    placeholderTextColor={mutedColor}
                                    value={newClub.pricePerHour}
                                    onChangeText={(v) => setNewClub({ ...newClub, pricePerHour: v.replace(/[^0-9]/g, '') })}
                                    keyboardType="numeric"
                                />

                                <Text style={[styles.inputLabel, { color: mutedColor }]}>Fasilitas</Text>
                                <View style={styles.facilitiesGrid}>
                                    {FACILITIES_OPTIONS.map((facility) => (
                                        <TouchableOpacity
                                            key={facility.id}
                                            style={[
                                                styles.facilityChip,
                                                { borderColor },
                                                newClub.facilities.includes(facility.id) && {
                                                    backgroundColor: `${Colors.primary}15`,
                                                    borderColor: Colors.primary
                                                }
                                            ]}
                                            onPress={() => toggleFacility(facility.id)}
                                        >
                                            <MaterialIcons
                                                name={facility.icon as any}
                                                size={16}
                                                color={newClub.facilities.includes(facility.id) ? Colors.primary : mutedColor}
                                            />
                                            <Text style={[
                                                styles.facilityChipText,
                                                { color: newClub.facilities.includes(facility.id) ? Colors.primary : textColor }
                                            ]}>
                                                {facility.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Section: Privasi */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionHeader}>
                                    <MaterialIcons name="lock" size={20} color="#F59E0B" />
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>Pengaturan</Text>
                                </View>

                                <View style={styles.switchRow}>
                                    <View style={styles.switchInfo}>
                                        <Text style={[styles.switchLabel, { color: textColor }]}>PTM Publik</Text>
                                        <Text style={[styles.switchDesc, { color: mutedColor }]}>
                                            PTM dapat dilihat dan dicari oleh semua orang
                                        </Text>
                                    </View>
                                    <Switch
                                        value={newClub.isPublic}
                                        onValueChange={(v) => setNewClub({ ...newClub, isPublic: v })}
                                        trackColor={{ false: "#767577", true: Colors.primary }}
                                        thumbColor="#fff"
                                    />
                                </View>
                            </View>

                            <View style={{ height: 40 }} />
                        </ScrollView>

                        {/* Submit Button */}
                        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    { backgroundColor: Colors.primary },
                                    isCreating && { opacity: 0.7 },
                                ]}
                                onPress={handleCreateClub}
                                disabled={isCreating}
                            >
                                <MaterialIcons name="add-circle" size={20} color="#fff" />
                                <Text style={styles.submitBtnText}>
                                    {isCreating ? "Membuat..." : "Buat PTM"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Province Selection Modal */}
            <Modal
                visible={showProvinceModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowProvinceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.provinceModalContainer, { backgroundColor: bgColor }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <TouchableOpacity onPress={() => setShowProvinceModal(false)}>
                                <MaterialIcons name="close" size={24} color={textColor} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Pilih Provinsi</Text>
                            <View style={{ width: 24 }} />
                        </View>
                        <ScrollView style={styles.provinceList}>
                            {PROVINCES.map((prov) => (
                                <TouchableOpacity
                                    key={prov}
                                    style={[
                                        styles.provinceItem,
                                        newClub.province === prov && { backgroundColor: `${Colors.primary}15` },
                                    ]}
                                    onPress={() => {
                                        setNewClub({ ...newClub, province: prov });
                                        setShowProvinceModal(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.provinceText,
                                        { color: newClub.province === prov ? Colors.primary : textColor },
                                    ]}>
                                        {prov}
                                    </Text>
                                    {newClub.province === prov && (
                                        <MaterialIcons name="check" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
    headerGradient: {
        paddingBottom: 24,
        paddingTop: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    // Background Decorations for Ultra-Premium feel
    bgDecorationCircle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    bgDecorationCircle2: {
        position: 'absolute',
        top: 100,
        left: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: "center",
        alignItems: "center",
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    scrollView: {
        flex: 1,
    },
    listContent: {
        padding: 16,
    },
    clubCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        // Standard Card Style
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    clubLogo: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 14,
    },
    clubInfo: {
        flex: 1,
    },
    clubHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    clubName: {
        fontSize: 16,
        fontWeight: "600",
    },
    clubCity: {
        fontSize: 13,
        marginTop: 2,
    },
    clubStats: {
        flexDirection: "row",
        gap: 16,
        marginTop: 8,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 12,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 8,
        paddingHorizontal: 40,
    },
    createBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 20,
    },
    createBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: "95%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    formSection: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        borderWidth: 1,
    },
    textArea: {
        minHeight: 80,
    },
    charCount: {
        fontSize: 11,
        textAlign: "right",
        marginTop: 4,
    },
    selectInput: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
    },
    selectText: {
        fontSize: 15,
    },
    socialInput: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
    },
    socialPrefix: {
        paddingHorizontal: 14,
        fontSize: 15,
        fontWeight: "600",
    },
    socialTextInput: {
        flex: 1,
        padding: 14,
        fontSize: 15,
    },
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
    },
    switchInfo: {
        flex: 1,
        marginRight: 16,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: "500",
    },
    switchDesc: {
        fontSize: 12,
        marginTop: 4,
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
    },
    submitBtn: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Province modal
    provinceModalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: "70%",
    },
    provinceList: {
        flex: 1,
    },
    provinceItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    provinceText: {
        fontSize: 15,
    },
    // Facilities
    facilitiesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    facilityChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6,
    },
    facilityChipText: {
        fontSize: 13,
        fontWeight: "500",
    },
});
