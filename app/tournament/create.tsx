import React, { useState, useRef } from "react";
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
    Platform,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

type TournamentFormat = "KNOCKOUT" | "HALF_COMP" | "ROUND_ROBIN";
type Category = "SINGLES" | "DOUBLES" | "U17" | "VETERAN45";

const FORMATS: { key: TournamentFormat; label: string; desc: string }[] = [
    { key: "KNOCKOUT", label: "Sistem Gugur", desc: "Kalah langsung tereliminasi" },
    { key: "HALF_COMP", label: "Setengah Kompetisi", desc: "Setiap tim bertemu 1x" },
    { key: "ROUND_ROBIN", label: "Round Robin", desc: "Semua bertemu semua" },
];

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
    { key: "SINGLES", label: "Tunggal", icon: "person" },
    { key: "DOUBLES", label: "Ganda", icon: "people" },
    { key: "U17", label: "U-17", icon: "child-care" },
    { key: "VETERAN45", label: "Veteran 45+", icon: "elderly" },
];

export default function CreateCompetitionScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Popup state
    const [showPopup, setShowPopup] = useState(false);
    const [popupType, setPopupType] = useState<"success" | "error">("success");
    const [popupMessage, setPopupMessage] = useState("");

    // Form state
    const [bannerUri, setBannerUri] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState("");
    const [format, setFormat] = useState<TournamentFormat>("KNOCKOUT");
    const [selectedCategories, setSelectedCategories] = useState<Category[]>(["SINGLES"]);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD format
    });
    const [selectedTime, setSelectedTime] = useState<string>("09:00");
    const [location, setLocation] = useState("");
    const [registrationFee, setRegistrationFee] = useState("");
    const [prizePool, setPrizePool] = useState("");
    const [prize1st, setPrize1st] = useState("");
    const [prize2nd, setPrize2nd] = useState("");
    const [prize3rd, setPrize3rd] = useState("");
    const [prizeHarapan1, setPrizeHarapan1] = useState("");
    const [prizeHarapan2, setPrizeHarapan2] = useState("");
    const [prizeHarapan3, setPrizeHarapan3] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [publishToLeaderboard, setPublishToLeaderboard] = useState(true);
    const [maxParticipants, setMaxParticipants] = useState("16");

    // Refs for native HTML inputs (web)
    const dateInputRef = useRef<HTMLInputElement | null>(null);
    const timeInputRef = useRef<HTMLInputElement | null>(null);

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const toggleCategory = (cat: Category) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

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

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const openDatePicker = () => {
        if (Platform.OS === 'web' && dateInputRef.current) {
            dateInputRef.current.showPicker?.();
            dateInputRef.current.click();
        }
    };

    const openTimePicker = () => {
        if (Platform.OS === 'web' && timeInputRef.current) {
            timeInputRef.current.showPicker?.();
            timeInputRef.current.click();
        }
    };

    const handleSubmit = async () => {
        // Cross-platform alert helper
        const showAlert = (title: string, message: string) => {
            if (Platform.OS === 'web') {
                window.alert(`${title}: ${message}`);
            } else {
                Alert.alert(title, message);
            }
        };

        // Validation
        if (!name.trim()) {
            showAlert("Validasi", "Nama turnamen wajib diisi!");
            return;
        }

        if (!location.trim()) {
            showAlert("Validasi", "Lokasi wajib diisi!");
            return;
        }

        if (!selectedDate) {
            showAlert("Validasi", "Tanggal wajib dipilih!");
            return;
        }

        if (!profile) {
            showAlert("Error", "Anda harus login untuk membuat turnamen");
            return;
        }

        setIsSubmitting(true);
        try {
            // Combine date and time
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const startDateTime = new Date(selectedDate);
            startDateTime.setHours(hours || 9);
            startDateTime.setMinutes(minutes || 0);
            startDateTime.setSeconds(0);

            // Generate slug
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50) + '-' + Date.now().toString(36);

            // Upload banner to Supabase Storage if selected
            // NOTE: RLS policy requires folder name = tournament_id, so we create first then upload

            // Map format to database enum
            const formatMap: Record<string, string> = {
                "KNOCKOUT": "SINGLE_ELIMINATION",
                "HALF_COMP": "ROUND_ROBIN",
                "ROUND_ROBIN": "ROUND_ROBIN",
            };

            // Map category to database enum
            const categoryMap: Record<string, string> = {
                "SINGLES": "OPEN",
                "DOUBLES": "DOUBLES",
                "U17": "U17",
                "VETERAN45": "VETERAN_40",
            };

            // Step 1: Create tournament first (without banner)
            const tournamentData = {
                organizer_id: profile.id,
                name: name.trim(),
                slug: slug,
                description: description.trim() || null,
                rules: rules.trim() || null,
                banner_url: null, // Will update after upload
                format: formatMap[format] || "SINGLE_ELIMINATION",
                category: categoryMap[selectedCategories[0]] || "OPEN",
                max_participants: parseInt(maxParticipants) || 16,
                current_participants: 0,
                registration_fee: isFree ? 0 : parseInt(registrationFee) || 0,
                prize_pool: (parseInt(prize1st) || 0) + (parseInt(prize2nd) || 0) + (parseInt(prize3rd) || 0) +
                    (parseInt(prizeHarapan1) || 0) + (parseInt(prizeHarapan2) || 0) + (parseInt(prizeHarapan3) || 0),
                prize_1st: parseInt(prize1st) || 0,
                prize_2nd: parseInt(prize2nd) || 0,
                prize_3rd: parseInt(prize3rd) || 0,
                prize_harapan_1: parseInt(prizeHarapan1) || 0,
                prize_harapan_2: parseInt(prizeHarapan2) || 0,
                prize_harapan_3: parseInt(prizeHarapan3) || 0,
                registration_start: new Date().toISOString(),
                registration_end: startDateTime.toISOString(),
                start_date: startDateTime.toISOString(),
                status: "REGISTRATION_OPEN",
                is_ranked: publishToLeaderboard,
                has_third_place: false,
            };

            console.log("Creating tournament...", tournamentData);

            const { data, error } = await supabase
                .from("tournaments")
                .insert([tournamentData] as any)
                .select()
                .single() as { data: { id: string } | null, error: any };

            if (error) {
                console.error("Error creating tournament:", error);
                setPopupType("error");
                setPopupMessage(`Gagal membuat turnamen: ${error.message}`);
                setShowPopup(true);
            } else {
                console.log("Tournament created:", data);

                // Step 2: Upload banner using tournament ID as folder (satisfies RLS)
                if (bannerUri && data?.id) {
                    try {
                        const fileName = `banner_${Date.now()}.jpg`;
                        const filePath = `${data.id}/${fileName}`; // RLS requires folder = tournament_id

                        let uploadSuccess = false;

                        if (Platform.OS === 'web') {
                            const response = await fetch(bannerUri);
                            const blob = await response.blob();
                            const { error: uploadError } = await supabase.storage
                                .from('tournament-banners')
                                .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
                            uploadSuccess = !uploadError;
                            if (uploadError) console.error("Banner upload error:", uploadError);
                        } else {
                            const { error: uploadError } = await supabase.storage
                                .from('tournament-banners')
                                .upload(filePath, { uri: bannerUri, type: 'image/jpeg', name: fileName } as any, { contentType: 'image/jpeg', upsert: true });
                            uploadSuccess = !uploadError;
                            if (uploadError) console.error("Banner upload error:", uploadError);
                        }

                        // Step 3: Update tournament with banner URL
                        if (uploadSuccess) {
                            const { data: urlData } = supabase.storage.from('tournament-banners').getPublicUrl(filePath);
                            await (supabase.from("tournaments") as any).update({ banner_url: urlData.publicUrl }).eq("id", data.id);
                            console.log("Banner uploaded:", urlData.publicUrl);
                        }
                    } catch (uploadErr) {
                        console.error("Banner upload exception:", uploadErr);
                    }
                }

                setPopupType("success");
                setPopupMessage(`Turnamen "${name}" berhasil dibuat!`);
                setShowPopup(true);
            }
        } catch (error: any) {
            console.error("Error:", error);
            setPopupType("error");
            setPopupMessage(`Terjadi kesalahan: ${error.message}`);
            setShowPopup(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePopupClose = () => {
        setShowPopup(false);
        if (popupType === "success") {
            router.replace("/tournament" as any);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Buat Kompetisi",
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
                                    <MaterialIcons name="add-photo-alternate" size={40} color={mutedColor} />
                                    <Text style={[styles.bannerText, { color: mutedColor }]}>
                                        Tap untuk upload banner (16:9)
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Informasi Dasar</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Nama Turnamen *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Contoh: Liga Pingpong Jakarta 2025"
                                placeholderTextColor={mutedColor}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Deskripsi</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Jelaskan tentang turnamen ini..."
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
                                placeholder="Aturan dan regulasi turnamen..."
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
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Format Kompetisi</Text>
                        <View style={styles.formatOptions}>
                            {FORMATS.map(f => (
                                <TouchableOpacity
                                    key={f.key}
                                    style={[
                                        styles.formatCard,
                                        {
                                            backgroundColor: format === f.key ? `${Colors.primary}15` : cardColor,
                                            borderColor: format === f.key ? Colors.primary : borderColor,
                                        }
                                    ]}
                                    onPress={() => setFormat(f.key)}
                                >
                                    <View style={styles.formatInfo}>
                                        <Text style={[styles.formatLabel, { color: textColor }]}>{f.label}</Text>
                                        <Text style={[styles.formatDesc, { color: mutedColor }]}>{f.desc}</Text>
                                    </View>
                                    {format === f.key && (
                                        <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Categories */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Kategori</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.categoryCard,
                                        {
                                            backgroundColor: selectedCategories.includes(cat.key)
                                                ? Colors.primary
                                                : cardColor,
                                            borderColor: selectedCategories.includes(cat.key)
                                                ? Colors.primary
                                                : borderColor,
                                        }
                                    ]}
                                    onPress={() => toggleCategory(cat.key)}
                                >
                                    <MaterialIcons
                                        name={cat.icon as any}
                                        size={24}
                                        color={selectedCategories.includes(cat.key) ? "#fff" : textColor}
                                    />
                                    <Text style={[
                                        styles.categoryLabel,
                                        { color: selectedCategories.includes(cat.key) ? "#fff" : textColor }
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Time & Location */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Waktu & Lokasi</Text>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: textColor }]}>Tanggal *</Text>
                                <View style={[styles.dateInputWrapper, { backgroundColor: cardColor, borderColor }]}>
                                    <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
                                    {Platform.OS === 'web' ? (
                                        <input
                                            ref={dateInputRef as any}
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                outline: 'none',
                                                backgroundColor: 'transparent',
                                                fontSize: 15,
                                                color: textColor,
                                                padding: 0,
                                                marginLeft: 10,
                                                cursor: 'pointer',
                                            }}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    ) : (
                                        <TouchableOpacity onPress={openDatePicker} style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={[styles.dateText, { color: textColor }]}>
                                                {formatDateDisplay(selectedDate)}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: textColor }]}>Waktu</Text>
                                <View style={[styles.dateInputWrapper, { backgroundColor: cardColor, borderColor }]}>
                                    <MaterialIcons name="access-time" size={20} color={Colors.primary} />
                                    {Platform.OS === 'web' ? (
                                        <input
                                            ref={timeInputRef as any}
                                            type="time"
                                            value={selectedTime}
                                            onChange={(e) => setSelectedTime(e.target.value)}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                outline: 'none',
                                                backgroundColor: 'transparent',
                                                fontSize: 15,
                                                color: textColor,
                                                padding: 0,
                                                marginLeft: 10,
                                                cursor: 'pointer',
                                            }}
                                        />
                                    ) : (
                                        <TouchableOpacity onPress={openTimePicker} style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={[styles.dateText, { color: textColor }]}>
                                                {selectedTime}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Lokasi *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Nama venue atau alamat"
                                placeholderTextColor={mutedColor}
                                value={location}
                                onChangeText={setLocation}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Maksimal Peserta</Text>
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

                    {/* Registration Fee */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Biaya Pendaftaran</Text>

                        <View style={styles.feeToggle}>
                            <Text style={[styles.feeLabel, { color: textColor }]}>Gratis</Text>
                            <Switch
                                value={isFree}
                                onValueChange={(val) => {
                                    setIsFree(val);
                                    if (val) setRegistrationFee("");
                                }}
                                trackColor={{ false: "#E5E7EB", true: Colors.success }}
                            />
                        </View>

                        {!isFree && (
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: textColor }]}>Biaya (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="50000"
                                    placeholderTextColor={mutedColor}
                                    value={registrationFee}
                                    onChangeText={setRegistrationFee}
                                    keyboardType="numeric"
                                />
                            </View>
                        )}
                    </View>

                    {/* Prize Pool / Hadiah */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Hadiah</Text>

                        {/* Juara Utama */}
                        <Text style={[styles.label, { color: textColor, marginBottom: 8 }]}>Juara Utama</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: mutedColor }]}>Juara 1 (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={prize1st}
                                    onChangeText={setPrize1st}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: mutedColor }]}>Juara 2 (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={prize2nd}
                                    onChangeText={setPrize2nd}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: mutedColor }]}>Juara 3 (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={prize3rd}
                                    onChangeText={setPrize3rd}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Juara Harapan */}
                        <Text style={[styles.label, { color: textColor, marginBottom: 8 }]}>Juara Harapan</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: mutedColor }]}>Harapan 1 (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={prizeHarapan1}
                                    onChangeText={setPrizeHarapan1}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: mutedColor }]}>Harapan 2 (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={prizeHarapan2}
                                    onChangeText={setPrizeHarapan2}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.smallLabel, { color: mutedColor }]}>Harapan 3 (Rp)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="0"
                                    placeholderTextColor={mutedColor}
                                    value={prizeHarapan3}
                                    onChangeText={setPrizeHarapan3}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Leaderboard Toggle */}
                    <View style={[styles.leaderboardToggle, { backgroundColor: cardColor, borderColor }]}>
                        <View style={styles.leaderboardInfo}>
                            <MaterialIcons name="leaderboard" size={24} color={Colors.primary} />
                            <View style={styles.leaderboardText}>
                                <Text style={[styles.leaderboardTitle, { color: textColor }]}>
                                    Publikasikan ke Leaderboard
                                </Text>
                                <Text style={[styles.leaderboardDesc, { color: mutedColor }]}>
                                    Hasil pertandingan akan mempengaruhi rating MR
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={publishToLeaderboard}
                            onValueChange={setPublishToLeaderboard}
                            trackColor={{ false: "#E5E7EB", true: Colors.primary }}
                        />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Submit Button */}
                <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: Colors.secondary }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="emoji-events" size={20} color="#fff" />
                                <Text style={styles.submitBtnText}>Buat Kompetisi</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Success/Error Popup Modal */}
            <Modal
                visible={showPopup}
                transparent={true}
                animationType="fade"
                onRequestClose={handlePopupClose}
            >
                <View style={styles.popupOverlay}>
                    <View style={[styles.popupContainer, { backgroundColor: cardColor }]}>
                        {/* Icon */}
                        <View style={[
                            styles.popupIconContainer,
                            { backgroundColor: popupType === "success" ? `${Colors.success}15` : `${Colors.error}15` }
                        ]}>
                            <MaterialIcons
                                name={popupType === "success" ? "check-circle" : "error"}
                                size={48}
                                color={popupType === "success" ? Colors.success : Colors.error}
                            />
                        </View>

                        {/* Title */}
                        <Text style={[styles.popupTitle, { color: textColor }]}>
                            {popupType === "success" ? "Berhasil!" : "Error"}
                        </Text>

                        {/* Message */}
                        <Text style={[styles.popupMessage, { color: mutedColor }]}>
                            {popupMessage}
                        </Text>

                        {/* Button */}
                        <TouchableOpacity
                            style={[
                                styles.popupButton,
                                { backgroundColor: popupType === "success" ? Colors.success : Colors.primary }
                            ]}
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
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    bannerUpload: {
        height: 140,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: "dashed",
        overflow: "hidden",
    },
    bannerPreview: { width: "100%", height: "100%" },
    bannerPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
    bannerText: { marginTop: 8, fontSize: 14 },
    inputGroup: { marginBottom: 16 },
    inputRow: { flexDirection: "row", gap: 12 },
    label: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
    smallLabel: { fontSize: 12, marginBottom: 4 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    textArea: { minHeight: 80, textAlignVertical: "top" },
    dateInputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    dateText: { fontSize: 15 },
    formatOptions: { gap: 10 },
    formatCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    formatInfo: { flex: 1 },
    formatLabel: { fontSize: 15, fontWeight: "600" },
    formatDesc: { fontSize: 12, marginTop: 2 },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    categoryCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    categoryLabel: { fontSize: 14, fontWeight: "500" },
    feeToggle: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    feeLabel: { fontSize: 15, fontWeight: "500" },
    leaderboardToggle: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    leaderboardInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    leaderboardText: { flex: 1 },
    leaderboardTitle: { fontSize: 15, fontWeight: "600" },
    leaderboardDesc: { fontSize: 12, marginTop: 2 },
    bottomAction: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
    },
    submitBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    // Popup styles
    popupOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    popupContainer: {
        width: "100%",
        maxWidth: 340,
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
    },
    popupIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    popupTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: "center",
    },
    popupMessage: {
        fontSize: 14,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 20,
    },
    popupButton: {
        width: "100%",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
    },
    popupButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
