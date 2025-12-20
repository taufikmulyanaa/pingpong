import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Image,
    Switch,
    Alert,
    ActivityIndicator,
    Modal,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../../../src/lib/constants";
import { supabase } from "../../../src/lib/supabase";
import { useAuthStore } from "../../../src/stores/authStore";
import { useTournamentStore } from "../../../src/stores/tournamentStore";

type TournamentFormat = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "GROUP_STAGE";
type TournamentCategory = "OPEN" | "MALE" | "FEMALE" | "DOUBLES" | "U17" | "U21" | "VETERAN_40" | "VETERAN_50";
type TournamentStatus = "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const FORMATS: { key: TournamentFormat; label: string; desc: string }[] = [
    { key: "SINGLE_ELIMINATION", label: "Sistem Gugur", desc: "Kalah langsung tereliminasi" },
    { key: "DOUBLE_ELIMINATION", label: "Sistem Gugur Ganda", desc: "Kalah 2x baru tereliminasi" },
    { key: "ROUND_ROBIN", label: "Round Robin", desc: "Semua bertemu semua" },
    { key: "GROUP_STAGE", label: "Fase Grup", desc: "Grup lalu knockout" },
];

const CATEGORIES: { key: TournamentCategory; label: string; icon: string }[] = [
    { key: "OPEN", label: "Terbuka", icon: "public" },
    { key: "MALE", label: "Putra", icon: "male" },
    { key: "FEMALE", label: "Putri", icon: "female" },
    { key: "DOUBLES", label: "Ganda", icon: "people" },
    { key: "U17", label: "U-17", icon: "child-care" },
    { key: "U21", label: "U-21", icon: "school" },
    { key: "VETERAN_40", label: "Veteran 40+", icon: "elderly" },
    { key: "VETERAN_50", label: "Veteran 50+", icon: "elderly" },
];

const STATUSES: { key: TournamentStatus; label: string; color: string }[] = [
    { key: "DRAFT", label: "Draf", color: "#6B7280" },
    { key: "REGISTRATION_OPEN", label: "Pendaftaran Dibuka", color: "#10B981" },
    { key: "REGISTRATION_CLOSED", label: "Pendaftaran Ditutup", color: "#F59E0B" },
    { key: "IN_PROGRESS", label: "Berlangsung", color: "#3B82F6" },
    { key: "COMPLETED", label: "Selesai", color: "#6B7280" },
    { key: "CANCELLED", label: "Dibatalkan", color: "#EF4444" },
];

export default function EditTournamentScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    const { currentTournament, fetchTournament, updateTournament } = useTournamentStore();

    // Loading states
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOrganizer, setIsOrganizer] = useState(false);

    // Form state
    const [bannerUri, setBannerUri] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState("");
    const [format, setFormat] = useState<TournamentFormat>("SINGLE_ELIMINATION");
    const [category, setCategory] = useState<TournamentCategory>("OPEN");
    const [status, setStatus] = useState<TournamentStatus>("DRAFT");
    const [startDate, setStartDate] = useState("");
    const [maxParticipants, setMaxParticipants] = useState("16");
    const [registrationFee, setRegistrationFee] = useState("");
    const [prizePool, setPrizePool] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [isRanked, setIsRanked] = useState(true);

    // Popup state for web compatibility
    const [showPopup, setShowPopup] = useState(false);
    const [popupType, setPopupType] = useState<"success" | "error">("success");
    const [popupMessage, setPopupMessage] = useState("");

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handle delete tournament
    const handleDeleteTournament = async () => {
        if (!id) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from("tournaments")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setShowDeleteModal(false);
            if (Platform.OS === 'web') {
                alert("Turnamen berhasil dihapus!");
                router.replace("/tournament");
            } else {
                Alert.alert("Berhasil!", "Turnamen berhasil dihapus!", [
                    { text: "OK", onPress: () => router.replace("/tournament") }
                ]);
            }
        } catch (error) {
            console.error("Delete error:", error);
            showAlert("Error", "Gagal menghapus turnamen");
        } finally {
            setIsDeleting(false);
        }
    };

    // Cross-platform alert function
    const showAlert = (title: string, message: string, isSuccess: boolean = false) => {
        if (Platform.OS === 'web') {
            setPopupType(isSuccess ? "success" : "error");
            setPopupMessage(message);
            setShowPopup(true);
        } else {
            Alert.alert(title, message);
        }
    };

    // Colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    // Load tournament data
    useEffect(() => {
        const loadTournament = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            await fetchTournament(id);
            setLoading(false);
        };

        loadTournament();
    }, [id]);

    // Populate form when tournament is loaded
    useEffect(() => {
        if (currentTournament) {
            setIsOrganizer(currentTournament.organizer_id === user?.id);
            setBannerUri(currentTournament.banner_url);
            setName(currentTournament.name);
            setDescription(currentTournament.description || "");
            setRules(currentTournament.rules || "");
            setFormat(currentTournament.format as TournamentFormat);
            setCategory(currentTournament.category as TournamentCategory);
            setStatus(currentTournament.status as TournamentStatus);
            setMaxParticipants(currentTournament.max_participants.toString());
            setRegistrationFee(currentTournament.registration_fee?.toString() || "");
            setPrizePool(currentTournament.prize_pool?.toString() || "");
            setIsFree(!currentTournament.registration_fee || currentTournament.registration_fee === 0);
            setIsRanked(currentTournament.is_ranked);

            // Format date
            if (currentTournament.start_date) {
                const date = new Date(currentTournament.start_date);
                const day = date.getDate().toString().padStart(2, "0");
                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                const year = date.getFullYear();
                setStartDate(`${day}/${month}/${year}`);
            }
        }
    }, [currentTournament, user?.id]);

    const handleBannerUpload = async () => {
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
                setBannerUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Image picker error:", error);
            Alert.alert("Error", "Gagal memilih foto");
        }
    };

    const handleSubmit = async () => {
        if (!id || !isOrganizer) {
            showAlert("Error", "Anda tidak memiliki akses untuk mengedit turnamen ini");
            return;
        }

        if (!name.trim()) {
            showAlert("Validasi", "Nama turnamen wajib diisi!");
            return;
        }

        setIsSubmitting(true);
        try {
            // Parse date
            let parsedStartDate = currentTournament?.start_date;
            if (startDate) {
                const dateParts = startDate.split("/");
                if (dateParts.length === 3) {
                    parsedStartDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`).toISOString();
                }
            }

            const updateData = {
                name: name.trim(),
                description: description.trim() || null,
                rules: rules.trim() || null,
                banner_url: bannerUri,
                format,
                category,
                status,
                max_participants: parseInt(maxParticipants) || 16,
                registration_fee: isFree ? 0 : parseInt(registrationFee) || 0,
                prize_pool: parseInt(prizePool) || 0,
                start_date: parsedStartDate,
                is_ranked: isRanked,
            };

            const { error } = await updateTournament(id, updateData);

            if (error) {
                console.error("Update error:", error);
                showAlert("Error", "Gagal menyimpan perubahan");
            } else {
                if (Platform.OS === 'web') {
                    setPopupType("success");
                    setPopupMessage("Turnamen berhasil diperbarui!");
                    setShowPopup(true);
                } else {
                    Alert.alert("Berhasil!", "Turnamen berhasil diperbarui!", [
                        { text: "OK", onPress: () => router.back() }
                    ]);
                }
            }
        } catch (error) {
            console.error("Error:", error);
            showAlert("Error", "Terjadi kesalahan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePopupClose = () => {
        setShowPopup(false);
        if (popupType === "success") {
            router.back();
        }
    };

    // Loading state
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.loadingText, { color: mutedColor }]}>Memuat data turnamen...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Not authorized
    if (!isOrganizer) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorContainer}>
                    <MaterialIcons name="lock" size={64} color={mutedColor} />
                    <Text style={[styles.errorTitle, { color: textColor }]}>Akses Ditolak</Text>
                    <Text style={[styles.errorDesc, { color: mutedColor }]}>
                        Hanya penyelenggara yang dapat mengedit turnamen ini
                    </Text>
                    <TouchableOpacity
                        style={[styles.backBtn, { backgroundColor: Colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backBtnText}>Kembali</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Edit Turnamen",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Banner Upload */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Banner Turnamen</Text>
                        <TouchableOpacity
                            style={[styles.bannerUpload, { backgroundColor: cardColor, borderColor }]}
                            onPress={handleBannerUpload}
                        >
                            {bannerUri ? (
                                <Image source={{ uri: bannerUri }} style={styles.bannerPreview} />
                            ) : (
                                <View style={styles.bannerPlaceholder}>
                                    <MaterialIcons name="image" size={40} color={mutedColor} />
                                    <Text style={[styles.bannerText, { color: mutedColor }]}>Upload banner (16:9)</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Status */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Status Turnamen</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.statusButtons}>
                                {STATUSES.map(s => (
                                    <TouchableOpacity
                                        key={s.key}
                                        style={[
                                            styles.statusBtn,
                                            { backgroundColor: status === s.key ? s.color : cardColor, borderColor: s.color }
                                        ]}
                                        onPress={() => setStatus(s.key)}
                                    >
                                        <Text style={[styles.statusBtnText, { color: status === s.key ? "#fff" : s.color }]}>
                                            {s.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Name & Description */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Informasi Dasar</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Nama Turnamen *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Nama turnamen"
                                placeholderTextColor={mutedColor}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Deskripsi</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Deskripsi turnamen..."
                                placeholderTextColor={mutedColor}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Peraturan</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Aturan permainan..."
                                placeholderTextColor={mutedColor}
                                value={rules}
                                onChangeText={setRules}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>

                    {/* Format */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Format</Text>
                        <View style={styles.formatOptions}>
                            {FORMATS.map(f => (
                                <TouchableOpacity
                                    key={f.key}
                                    style={[
                                        styles.formatCard,
                                        { backgroundColor: format === f.key ? `${Colors.primary}15` : cardColor, borderColor: format === f.key ? Colors.primary : borderColor }
                                    ]}
                                    onPress={() => setFormat(f.key)}
                                >
                                    <View style={styles.formatInfo}>
                                        <Text style={[styles.formatLabel, { color: textColor }]}>{f.label}</Text>
                                        <Text style={[styles.formatDesc, { color: mutedColor }]}>{f.desc}</Text>
                                    </View>
                                    {format === f.key && <MaterialIcons name="check-circle" size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Category */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Kategori</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.categoryCard,
                                        { backgroundColor: category === cat.key ? Colors.primary : cardColor, borderColor: category === cat.key ? Colors.primary : borderColor }
                                    ]}
                                    onPress={() => setCategory(cat.key)}
                                >
                                    <Text style={[styles.categoryLabel, { color: category === cat.key ? "#fff" : textColor }]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Participants & Date */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Detail</Text>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: textColor }]}>Tanggal</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="DD/MM/YYYY"
                                    placeholderTextColor={mutedColor}
                                    value={startDate}
                                    onChangeText={setStartDate}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: textColor }]}>Max Peserta</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="16"
                                    placeholderTextColor={mutedColor}
                                    value={maxParticipants}
                                    onChangeText={setMaxParticipants}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: textColor }]}>Biaya (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={isFree ? "" : registrationFee}
                                    onChangeText={setRegistrationFee}
                                    keyboardType="numeric"
                                    editable={!isFree}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: textColor }]}>Hadiah (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={prizePool}
                                    onChangeText={setPrizePool}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Toggles */}
                    <View style={styles.section}>
                        <View style={[styles.toggleRow, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.toggleLabel, { color: textColor }]}>Gratis</Text>
                            <Switch
                                value={isFree}
                                onValueChange={(val) => {
                                    setIsFree(val);
                                    if (val) setRegistrationFee("");
                                }}
                                trackColor={{ false: "#E5E7EB", true: Colors.success }}
                            />
                        </View>
                        <View style={[styles.toggleRow, { borderBottomColor: borderColor }]}>
                            <View>
                                <Text style={[styles.toggleLabel, { color: textColor }]}>Ranked (Mempengaruhi MR)</Text>
                                <Text style={[styles.toggleDesc, { color: mutedColor }]}>Rating akan berubah</Text>
                            </View>
                            <Switch
                                value={isRanked}
                                onValueChange={setIsRanked}
                                trackColor={{ false: "#E5E7EB", true: Colors.primary }}
                            />
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Action Buttons */}
                <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        {/* Delete Button */}
                        <TouchableOpacity
                            style={[styles.deleteBtn, { borderColor: "#EF4444" }]}
                            onPress={() => setShowDeleteModal(true)}
                        >
                            <MaterialIcons name="delete" size={20} color="#EF4444" />
                            <Text style={styles.deleteBtnText}>Hapus</Text>
                        </TouchableOpacity>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: Colors.primary, flex: 1 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <MaterialIcons name="save" size={20} color="#fff" />
                                    <Text style={styles.submitBtnText}>Simpan Perubahan</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.popupOverlay}>
                    <View style={[styles.popupContainer, { backgroundColor: cardColor }]}>
                        <MaterialIcons name="warning" size={48} color="#EF4444" />
                        <Text style={[styles.popupTitle, { color: textColor }]}>Hapus Turnamen?</Text>
                        <Text style={[styles.popupMessage, { color: mutedColor }]}>
                            Tindakan ini tidak dapat dibatalkan. Semua data peserta dan pertandingan akan dihapus.
                        </Text>
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                            <TouchableOpacity
                                style={[styles.popupButton, { backgroundColor: "#E5E7EB" }]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={[styles.popupButtonText, { color: "#374151" }]}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.popupButton, { backgroundColor: "#EF4444" }]}
                                onPress={handleDeleteTournament}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.popupButtonText}>Hapus</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Popup Modal for Web */}
            <Modal
                visible={showPopup}
                transparent
                animationType="fade"
                onRequestClose={handlePopupClose}
            >
                <View style={styles.popupOverlay}>
                    <View style={[styles.popupContainer, { backgroundColor: cardColor }]}>
                        <MaterialIcons
                            name={popupType === "success" ? "check-circle" : "error"}
                            size={48}
                            color={popupType === "success" ? Colors.success : "#EF4444"}
                        />
                        <Text style={[styles.popupTitle, { color: textColor }]}>
                            {popupType === "success" ? "Berhasil!" : "Error"}
                        </Text>
                        <Text style={[styles.popupMessage, { color: mutedColor }]}>
                            {popupMessage}
                        </Text>
                        <TouchableOpacity
                            style={[styles.popupButton, { backgroundColor: Colors.primary }]}
                            onPress={handlePopupClose}
                        >
                            <Text style={styles.popupButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    content: { padding: 20 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 12, fontSize: 14 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    errorTitle: { fontSize: 18, fontWeight: "600", marginTop: 16 },
    errorDesc: { fontSize: 14, marginTop: 8, textAlign: "center" },
    backBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    backBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    bannerUpload: { height: 140, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", overflow: "hidden" },
    bannerPreview: { width: "100%", height: "100%" },
    bannerPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
    bannerText: { marginTop: 8, fontSize: 14 },
    statusButtons: { flexDirection: "row", gap: 8 },
    statusBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    statusBtnText: { fontSize: 13, fontWeight: "600" },
    inputGroup: { marginBottom: 16 },
    inputRow: { flexDirection: "row", gap: 12 },
    label: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    textArea: { minHeight: 80, textAlignVertical: "top" },
    formatOptions: { gap: 10 },
    formatCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1 },
    formatInfo: { flex: 1 },
    formatLabel: { fontSize: 15, fontWeight: "600" },
    formatDesc: { fontSize: 12, marginTop: 2 },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    categoryCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    categoryLabel: { fontSize: 13, fontWeight: "600" },
    toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
    toggleLabel: { fontSize: 15, fontWeight: "500" },
    toggleDesc: { fontSize: 12, marginTop: 2 },
    bottomAction: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
    submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    // Popup styles
    popupOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    popupContainer: { padding: 24, borderRadius: 16, alignItems: "center", minWidth: 280, maxWidth: "80%" },
    popupTitle: { fontSize: 18, fontWeight: "600", marginTop: 12 },
    popupMessage: { fontSize: 14, marginTop: 8, textAlign: "center" },
    popupButton: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
    popupButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    // Delete button styles
    deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8, borderWidth: 2, backgroundColor: "transparent" },
    deleteBtnText: { color: "#EF4444", fontSize: 14, fontWeight: "600" },
});
