// AddVenueModal.tsx - Comprehensive modal for adding new venues
import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface AddVenueModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

// Venue categories
const VENUE_CATEGORIES = [
    { id: "indoor", label: "Indoor", icon: "house" },
    { id: "outdoor", label: "Outdoor", icon: "park" },
    { id: "club", label: "Club/Komunitas", icon: "groups" },
    { id: "school", label: "Sekolah/Kampus", icon: "school" },
    { id: "public", label: "Fasilitas Umum", icon: "public" },
];

// Facilities/amenities
const FACILITIES = [
    { id: "parking", label: "Parkir", icon: "local-parking" },
    { id: "wifi", label: "WiFi", icon: "wifi" },
    { id: "ac", label: "AC", icon: "ac-unit" },
    { id: "toilet", label: "Toilet", icon: "wc" },
    { id: "canteen", label: "Kantin", icon: "restaurant" },
    { id: "shower", label: "Shower", icon: "shower" },
    { id: "locker", label: "Locker", icon: "lock" },
    { id: "shop", label: "Pro Shop", icon: "store" },
];

export const AddVenueModal = ({ visible, onClose, onSuccess }: AddVenueModalProps) => {
    const { profile } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Form state
    const [formData, setFormData] = useState({
        // Basic Info
        name: "",
        description: "",
        categories: [] as string[],
        // Location
        address: "",
        city: "",
        province: "",
        postalCode: "",
        // Details
        tableCount: "",
        pricePerHour: "",
        openTime: "08:00",
        closeTime: "22:00",
        // Contact
        phone: "",
        whatsapp: "",
        email: "",
        website: "",
        // Facilities
        facilities: [] as string[],
        // Images
        images: [] as string[],
    });

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleFacility = (facilityId: string) => {
        setFormData(prev => ({
            ...prev,
            facilities: prev.facilities.includes(facilityId)
                ? prev.facilities.filter(f => f !== facilityId)
                : [...prev.facilities, facilityId],
        }));
    };

    const toggleCategory = (categoryId: string) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(categoryId)
                ? prev.categories.filter(c => c !== categoryId)
                : [...prev.categories, categoryId],
        }));
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.name.trim()) {
                    Alert.alert("Validasi", "Nama venue harus diisi");
                    return false;
                }
                if (formData.categories.length === 0) {
                    Alert.alert("Validasi", "Pilih minimal satu kategori venue");
                    return false;
                }
                return true;
            case 2:
                if (!formData.address.trim()) {
                    Alert.alert("Validasi", "Alamat harus diisi");
                    return false;
                }
                if (!formData.city.trim()) {
                    Alert.alert("Validasi", "Kota harus diisi");
                    return false;
                }
                return true;
            case 3:
                if (!formData.tableCount || parseInt(formData.tableCount) < 1) {
                    Alert.alert("Validasi", "Jumlah meja minimal 1");
                    return false;
                }
                if (!formData.pricePerHour || parseInt(formData.pricePerHour) < 1000) {
                    Alert.alert("Validasi", "Harga per jam minimal Rp 1.000");
                    return false;
                }
                return true;
            case 4:
                if (!formData.phone.trim() && !formData.whatsapp.trim()) {
                    Alert.alert("Validasi", "Minimal isi nomor telepon atau WhatsApp");
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 5));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) return;

        setIsSubmitting(true);
        try {
            // Generate a URL-friendly slug from the name
            const slug = formData.name.trim().toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50) + '-' + Date.now().toString(36);

            const venueData = {
                name: formData.name.trim(),
                slug: slug,
                description: formData.description.trim() || null,
                address: formData.address.trim(),
                city: formData.city.trim(),
                province: formData.province.trim() || null,
                // Default coordinates for Jakarta - user can update later
                latitude: -6.2088,
                longitude: 106.8456,
                phone: formData.phone.trim() || formData.whatsapp.trim() || null,
                table_count: parseInt(formData.tableCount) || 1,
                price_per_hour: parseInt(formData.pricePerHour) || 0,
                opening_hours: {
                    open: formData.openTime,
                    close: formData.closeTime,
                    days: "Senin-Minggu"
                },
                facilities: formData.facilities,
                images: [],
                is_verified: false,
                is_active: false, // Pending approval
                owner_id: profile?.id || null,
            };

            const { data, error } = await supabase
                .from("venues")
                .insert([venueData] as any)
                .select()
                .single();

            if (error) {
                console.error("Error submitting venue:", error);
                Alert.alert("Error", "Gagal mengirim data venue. Silakan coba lagi.");
            } else {
                Alert.alert(
                    "Berhasil! 🎉",
                    "Pengajuan venue Anda telah dikirim dan akan direview oleh tim kami. Kami akan menghubungi Anda dalam 1-3 hari kerja.",
                    [{
                        text: "OK", onPress: () => {
                            resetForm();
                            onClose();
                            onSuccess?.();
                        }
                    }]
                );
            }
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            categories: [],
            address: "",
            city: "",
            province: "",
            postalCode: "",
            tableCount: "",
            pricePerHour: "",
            openTime: "08:00",
            closeTime: "22:00",
            phone: "",
            whatsapp: "",
            email: "",
            website: "",
            facilities: [],
            images: [],
        });
        setCurrentStep(1);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Izin Diperlukan', 'Kami membutuhkan izin untuk mengakses galeri foto Anda.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, result.assets[0].uri],
            }));
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
    };

    const handleClose = () => {
        if (formData.name || formData.address) {
            Alert.alert(
                "Tutup Form?",
                "Data yang sudah diisi akan hilang. Yakin ingin menutup?",
                [
                    { text: "Batal", style: "cancel" },
                    { text: "Ya, Tutup", style: "destructive", onPress: () => { resetForm(); onClose(); } },
                ]
            );
        } else {
            onClose();
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            {[1, 2, 3, 4, 5].map(step => (
                <View key={step} style={styles.stepRow}>
                    <View style={[
                        styles.stepDot,
                        currentStep >= step && styles.stepDotActive,
                        currentStep === step && styles.stepDotCurrent,
                    ]}>
                        {currentStep > step ? (
                            <MaterialIcons name="check" size={14} color="#fff" />
                        ) : (
                            <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
                                {step}
                            </Text>
                        )}
                    </View>
                    {step < 5 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
                </View>
            ))}
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Informasi Dasar</Text>
            <Text style={styles.stepDescription}>Masukkan nama dan kategori venue Anda</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Venue *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Contoh: GOR Bulungan"
                    placeholderTextColor={Colors.muted}
                    value={formData.name}
                    onChangeText={(v) => updateField("name", v)}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Deskripsi</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Deskripsikan venue Anda..."
                    placeholderTextColor={Colors.muted}
                    value={formData.description}
                    onChangeText={(v) => updateField("description", v)}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Kategori Venue *</Text>
                <View style={styles.categoryGrid}>
                    {VENUE_CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryItem,
                                formData.categories.includes(cat.id) && styles.categoryItemActive,
                            ]}
                            onPress={() => toggleCategory(cat.id)}
                        >
                            <MaterialIcons
                                name={cat.icon as any}
                                size={24}
                                color={formData.categories.includes(cat.id) ? "#fff" : Colors.primary}
                            />
                            <Text style={[
                                styles.categoryLabel,
                                formData.categories.includes(cat.id) && styles.categoryLabelActive,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Image Upload Section */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Foto Venue</Text>
                <View style={styles.imageGrid}>
                    {formData.images.map((uri, index) => (
                        <View key={index} style={styles.imagePreview}>
                            <Image source={{ uri }} style={styles.previewImage} />
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => removeImage(index)}
                            >
                                <MaterialIcons name="close" size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {formData.images.length < 5 && (
                        <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                            <MaterialIcons name="add-photo-alternate" size={32} color={Colors.primary} />
                            <Text style={styles.addImageText}>Tambah Foto</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={[styles.imageHint, { color: Colors.muted }]}>
                    Tambahkan hingga 5 foto venue Anda
                </Text>
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Lokasi</Text>
            <Text style={styles.stepDescription}>Alamat lengkap venue Anda</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Alamat Lengkap *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Jalan, nomor, gedung, lantai..."
                    placeholderTextColor={Colors.muted}
                    value={formData.address}
                    onChangeText={(v) => updateField("address", v)}
                    multiline
                    numberOfLines={2}
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Kota *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Jakarta Selatan"
                        placeholderTextColor={Colors.muted}
                        value={formData.city}
                        onChangeText={(v) => updateField("city", v)}
                    />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Kode Pos</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="12345"
                        placeholderTextColor={Colors.muted}
                        value={formData.postalCode}
                        onChangeText={(v) => updateField("postalCode", v)}
                        keyboardType="number-pad"
                        maxLength={5}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Provinsi</Text>
                <TextInput
                    style={styles.input}
                    placeholder="DKI Jakarta"
                    placeholderTextColor={Colors.muted}
                    value={formData.province}
                    onChangeText={(v) => updateField("province", v)}
                />
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Detail Venue</Text>
            <Text style={styles.stepDescription}>Informasi meja dan harga</Text>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Jumlah Meja *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="4"
                        placeholderTextColor={Colors.muted}
                        value={formData.tableCount}
                        onChangeText={(v) => updateField("tableCount", v.replace(/[^0-9]/g, ""))}
                        keyboardType="number-pad"
                    />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Harga/Jam (Rp) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="50000"
                        placeholderTextColor={Colors.muted}
                        value={formData.pricePerHour}
                        onChangeText={(v) => updateField("pricePerHour", v.replace(/[^0-9]/g, ""))}
                        keyboardType="number-pad"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Jam Buka</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="08:00"
                        placeholderTextColor={Colors.muted}
                        value={formData.openTime}
                        onChangeText={(v) => updateField("openTime", v)}
                    />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Jam Tutup</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="22:00"
                        placeholderTextColor={Colors.muted}
                        value={formData.closeTime}
                        onChangeText={(v) => updateField("closeTime", v)}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Fasilitas</Text>
                <View style={styles.facilitiesGrid}>
                    {FACILITIES.map(fac => (
                        <TouchableOpacity
                            key={fac.id}
                            style={[
                                styles.facilityItem,
                                formData.facilities.includes(fac.id) && styles.facilityItemActive,
                            ]}
                            onPress={() => toggleFacility(fac.id)}
                        >
                            <MaterialIcons
                                name={fac.icon as any}
                                size={18}
                                color={formData.facilities.includes(fac.id) ? "#fff" : Colors.primary}
                            />
                            <Text style={[
                                styles.facilityLabel,
                                formData.facilities.includes(fac.id) && styles.facilityLabelActive,
                            ]}>
                                {fac.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Kontak</Text>
            <Text style={styles.stepDescription}>Informasi kontak untuk booking</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Nomor Telepon *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="021-1234567"
                    placeholderTextColor={Colors.muted}
                    value={formData.phone}
                    onChangeText={(v) => updateField("phone", v)}
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>WhatsApp</Text>
                <TextInput
                    style={styles.input}
                    placeholder="08123456789"
                    placeholderTextColor={Colors.muted}
                    value={formData.whatsapp}
                    onChangeText={(v) => updateField("whatsapp", v)}
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    placeholder="venue@email.com"
                    placeholderTextColor={Colors.muted}
                    value={formData.email}
                    onChangeText={(v) => updateField("email", v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Website / Instagram</Text>
                <TextInput
                    style={styles.input}
                    placeholder="@instagram atau website.com"
                    placeholderTextColor={Colors.muted}
                    value={formData.website}
                    onChangeText={(v) => updateField("website", v)}
                    autoCapitalize="none"
                />
            </View>
        </View>
    );

    const renderStep5 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Konfirmasi</Text>
            <Text style={styles.stepDescription}>Review data venue sebelum dikirim</Text>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{formData.name}</Text>
                <Text style={styles.summaryCategory}>
                    {formData.categories.map(cId => VENUE_CATEGORIES.find(c => c.id === cId)?.label).filter(Boolean).join(", ") || "-"}
                </Text>

                <View style={styles.summaryRow}>
                    <MaterialIcons name="place" size={16} color={Colors.muted} />
                    <Text style={styles.summaryText}>{formData.address}, {formData.city}</Text>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialIcons name="sports-tennis" size={16} color={Colors.muted} />
                    <Text style={styles.summaryText}>{formData.tableCount} meja</Text>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialIcons name="attach-money" size={16} color={Colors.muted} />
                    <Text style={styles.summaryText}>
                        Rp {parseInt(formData.pricePerHour || "0").toLocaleString("id-ID")}/jam
                    </Text>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialIcons name="schedule" size={16} color={Colors.muted} />
                    <Text style={styles.summaryText}>{formData.openTime} - {formData.closeTime}</Text>
                </View>

                <View style={styles.summaryRow}>
                    <MaterialIcons name="phone" size={16} color={Colors.muted} />
                    <Text style={styles.summaryText}>{formData.phone || formData.whatsapp || "-"}</Text>
                </View>

                {formData.facilities.length > 0 && (
                    <View style={styles.summaryFacilities}>
                        {formData.facilities.map(fId => {
                            const fac = FACILITIES.find(f => f.id === fId);
                            return fac ? (
                                <View key={fId} style={styles.summaryFacilityTag}>
                                    <Text style={styles.summaryFacilityText}>{fac.label}</Text>
                                </View>
                            ) : null;
                        })}
                    </View>
                )}
            </View>

            <View style={styles.disclaimerBox}>
                <MaterialIcons name="info" size={20} color={Colors.primary} />
                <Text style={styles.disclaimerText}>
                    Data venue akan direview oleh tim kami sebelum ditampilkan di aplikasi.
                    Proses review membutuhkan waktu 1-3 hari kerja.
                </Text>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                {/* Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Daftarkan Venue</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Step Indicator */}
                {renderStepIndicator()}

                {/* Content */}
                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    {currentStep > 1 && (
                        <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
                            <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
                            <Text style={styles.backBtnText}>Kembali</Text>
                        </TouchableOpacity>
                    )}

                    {currentStep < 5 ? (
                        <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
                            <Text style={styles.nextBtnText}>Lanjut</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialIcons name="send" size={20} color="#fff" />
                                    <Text style={styles.submitBtnText}>Kirim Pengajuan</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    closeBtn: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.text,
    },
    stepIndicator: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        paddingHorizontal: 40,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    stepDotActive: {
        backgroundColor: Colors.primary,
    },
    stepDotCurrent: {
        borderWidth: 2,
        borderColor: Colors.accent,
    },
    stepNumber: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.muted,
    },
    stepNumberActive: {
        color: "#fff",
    },
    stepLine: {
        width: 24,
        height: 2,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 4,
    },
    stepLineActive: {
        backgroundColor: Colors.primary,
    },
    scrollContent: {
        flex: 1,
    },
    stepContent: {
        padding: 20,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 14,
        color: Colors.muted,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.text,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    row: {
        flexDirection: "row",
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    categoryItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
    },
    categoryItemActive: {
        backgroundColor: Colors.primary,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: "500",
        color: Colors.primary,
    },
    categoryLabelActive: {
        color: "#fff",
    },
    facilitiesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    facilityItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    facilityItemActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    facilityLabel: {
        fontSize: 12,
        color: Colors.text,
    },
    facilityLabelActive: {
        color: "#fff",
    },
    summaryCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    summaryTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 4,
    },
    summaryCategory: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: "500",
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 14,
        color: Colors.text,
        flex: 1,
    },
    summaryFacilities: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    summaryFacilityTag: {
        backgroundColor: `${Colors.primary}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    summaryFacilityText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: "500",
    },
    disclaimerBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: `${Colors.primary}10`,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 13,
        color: Colors.text,
        lineHeight: 20,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        backgroundColor: Colors.background,
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    backBtnText: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: "600",
    },
    nextBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginLeft: "auto",
    },
    nextBtnText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
    },
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.success,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginLeft: "auto",
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
    },
    // Image upload styles
    imageGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
    },
    previewImage: {
        width: "100%",
        height: "100%",
    },
    removeImageBtn: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    addImageBtn: {
        width: 100,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.primary,
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: `${Colors.primary}10`,
    },
    addImageText: {
        fontSize: 10,
        color: Colors.primary,
        marginTop: 4,
        fontWeight: "500",
    },
    imageHint: {
        fontSize: 12,
        marginTop: 8,
    },
});

export default AddVenueModal;
