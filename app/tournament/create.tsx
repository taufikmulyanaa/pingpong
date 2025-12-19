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
    Alert,
    ActivityIndicator,
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

    // Form state
    const [bannerUri, setBannerUri] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState("");
    const [format, setFormat] = useState<TournamentFormat>("KNOCKOUT");
    const [selectedCategories, setSelectedCategories] = useState<Category[]>(["SINGLES"]);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [location, setLocation] = useState("");
    const [registrationFee, setRegistrationFee] = useState("");
    const [isFree, setIsFree] = useState(false);
    const [publishToLeaderboard, setPublishToLeaderboard] = useState(true);

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

    const handleSubmit = async () => {
        if (!name || !location || !date) {
            Alert.alert("Validasi", "Nama, lokasi, dan tanggal wajib diisi!");
            return;
        }

        if (!profile) {
            Alert.alert("Error", "Anda harus login untuk membuat turnamen");
            return;
        }

        setIsSubmitting(true);
        try {
            // Parse date from DD/MM/YYYY to ISO format
            const dateParts = date.split("/");
            let startDate = new Date().toISOString();
            if (dateParts.length === 3) {
                startDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`).toISOString();
            }

            // Generate slug
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 50) + '-' + Date.now().toString(36);

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

            const tournamentData = {
                organizer_id: profile.id,
                name: name.trim(),
                slug: slug,
                description: description.trim() || null,
                rules: rules.trim() || null,
                banner_url: bannerUri,
                format: formatMap[format] || "SINGLE_ELIMINATION",
                category: categoryMap[selectedCategories[0]] || "OPEN",
                max_participants: 16,
                registration_fee: isFree ? 0 : parseInt(registrationFee) || 0,
                prize_pool: 0,
                registration_start: new Date().toISOString(),
                registration_end: startDate,
                start_date: startDate,
                status: "REGISTRATION_OPEN",
                is_ranked: publishToLeaderboard,
            };

            const { data, error } = await supabase
                .from("tournaments")
                .insert([tournamentData] as any)
                .select()
                .single();

            if (error) {
                console.error("Error creating tournament:", error);
                Alert.alert("Error", "Gagal membuat turnamen. Silakan coba lagi.");
            } else {
                Alert.alert(
                    "Berhasil!",
                    `Turnamen "${name}" berhasil dibuat!`,
                    [{ text: "OK", onPress: () => router.back() }]
                );
            }
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsSubmitting(false);
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
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Banner Kompetisi</Text>
                        <TouchableOpacity
                            style={[styles.bannerUpload, { backgroundColor: cardColor, borderColor }]}
                            onPress={handleBannerUpload}
                        >
                            {bannerUri ? (
                                <Image source={{ uri: bannerUri }} style={styles.bannerPreview} />
                            ) : (
                                <View style={styles.bannerPlaceholder}>
                                    <MaterialIcons name="image" size={40} color={mutedColor} />
                                    <Text style={[styles.bannerText, { color: mutedColor }]}>
                                        Upload banner (600x200)
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Name & Description */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Informasi Dasar</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Nama Kompetisi *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Contoh: Turnamen Ping Pong Cup 2024"
                                placeholderTextColor={mutedColor}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Deskripsi</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                placeholder="Deskripsi singkat tentang kompetisi..."
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
                                placeholder="Aturan permainan, scoring, dsb..."
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
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="DD/MM/YYYY"
                                    placeholderTextColor={mutedColor}
                                    value={date}
                                    onChangeText={setDate}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.label, { color: textColor }]}>Waktu</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                    placeholder="HH:MM"
                                    placeholderTextColor={mutedColor}
                                    value={time}
                                    onChangeText={setTime}
                                />
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

                    {/* Leaderboard Toggle */}
                    <View style={styles.section}>
                        <View style={[styles.leaderboardToggle, { backgroundColor: cardColor, borderColor }]}>
                            <View style={styles.leaderboardInfo}>
                                <MaterialIcons name="leaderboard" size={24} color={Colors.primary} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.leaderboardLabel, { color: textColor }]}>
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
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Submit Button */}
                <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: Colors.primary }]}
                        onPress={handleSubmit}
                    >
                        <MaterialIcons name="emoji-events" size={20} color="#fff" />
                        <Text style={styles.submitBtnText}>Buat Kompetisi</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    content: { padding: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    bannerUpload: { height: 140, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", overflow: "hidden" },
    bannerPreview: { width: "100%", height: "100%" },
    bannerPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
    bannerText: { marginTop: 8, fontSize: 14 },
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
    categoryCard: {
        width: "48%",
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    categoryLabel: { fontSize: 14, fontWeight: "600" },
    feeToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    feeLabel: { fontSize: 15, fontWeight: "500" },
    leaderboardToggle: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1 },
    leaderboardInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
    leaderboardLabel: { fontSize: 15, fontWeight: "600" },
    leaderboardDesc: { fontSize: 12, marginTop: 2 },
    bottomAction: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
    submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
