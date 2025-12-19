import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface ScheduleItem {
    id: string;
    time: string;
    event: string;
    day: number;
}

export default function ScheduleEditScreen() {
    const router = useRouter();
    const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
    const { user } = useAuthStore();

    // States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tournament, setTournament] = useState<any>(null);
    const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
    const [isOrganizer, setIsOrganizer] = useState(false);

    // Popup state
    const [showPopup, setShowPopup] = useState(false);
    const [popupType, setPopupType] = useState<"success" | "error">("success");
    const [popupMessage, setPopupMessage] = useState("");

    // New item form
    const [newTime, setNewTime] = useState("");
    const [newEvent, setNewEvent] = useState("");
    const [selectedDay, setSelectedDay] = useState(1);

    // Colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    // Default schedule template
    const getDefaultSchedule = (startDate: string): ScheduleItem[] => {
        return [
            { id: "1", time: "08:00", event: "Registrasi & Check-in", day: 1 },
            { id: "2", time: "09:00", event: "Babak Penyisihan Round 1", day: 1 },
            { id: "3", time: "12:00", event: "Istirahat", day: 1 },
            { id: "4", time: "13:00", event: "Quarter Final", day: 1 },
            { id: "5", time: "15:00", event: "Semi Final", day: 1 },
            { id: "6", time: "17:00", event: "Final & Perebutan Juara 3", day: 1 },
        ];
    };

    // Load tournament and schedule
    useEffect(() => {
        const loadData = async () => {
            if (!tournamentId) {
                setLoading(false);
                return;
            }

            try {
                // Fetch tournament
                const { data: tournamentData, error: tournamentError } = await supabase
                    .from("tournaments")
                    .select("*")
                    .eq("id", tournamentId)
                    .single() as { data: any, error: any };

                if (tournamentError) {
                    console.error("Error fetching tournament:", tournamentError);
                    setLoading(false);
                    return;
                }

                setTournament(tournamentData);
                setIsOrganizer(tournamentData.organizer_id === user?.id);

                // Load schedule from tournament (stored as JSON) or use default
                if (tournamentData.schedule) {
                    try {
                        const parsed = JSON.parse(tournamentData.schedule);
                        setScheduleItems(parsed);
                    } catch {
                        setScheduleItems(getDefaultSchedule(tournamentData.start_date));
                    }
                } else {
                    setScheduleItems(getDefaultSchedule(tournamentData.start_date));
                }
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [tournamentId, user?.id]);

    // Add new schedule item
    const handleAddItem = () => {
        if (!newTime.trim() || !newEvent.trim()) {
            showAlert("Validasi", "Waktu dan acara harus diisi!");
            return;
        }

        const newItem: ScheduleItem = {
            id: Date.now().toString(),
            time: newTime.trim(),
            event: newEvent.trim(),
            day: selectedDay,
        };

        setScheduleItems([...scheduleItems, newItem].sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.time.localeCompare(b.time);
        }));

        setNewTime("");
        setNewEvent("");
    };

    // Remove schedule item
    const handleRemoveItem = (id: string) => {
        setScheduleItems(scheduleItems.filter(item => item.id !== id));
    };

    // Update schedule item
    const handleUpdateItem = (id: string, field: "time" | "event", value: string) => {
        setScheduleItems(scheduleItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // Show alert (cross-platform)
    const showAlert = (title: string, message: string, isSuccess: boolean = false) => {
        if (Platform.OS === 'web') {
            setPopupType(isSuccess ? "success" : "error");
            setPopupMessage(message);
            setShowPopup(true);
        } else {
            Alert.alert(title, message);
        }
    };

    // Save schedule
    const handleSave = async () => {
        if (!tournamentId || !isOrganizer) return;

        setSaving(true);
        try {
            const { error } = await (supabase.from("tournaments") as any)
                .update({ schedule: JSON.stringify(scheduleItems) })
                .eq("id", tournamentId);

            if (error) {
                console.error("Save error:", error);
                showAlert("Error", "Gagal menyimpan jadwal");
            } else {
                if (Platform.OS === 'web') {
                    setPopupType("success");
                    setPopupMessage("Jadwal berhasil disimpan!");
                    setShowPopup(true);
                } else {
                    Alert.alert("Berhasil!", "Jadwal berhasil disimpan!", [
                        { text: "OK", onPress: () => router.back() }
                    ]);
                }
            }
        } catch (err) {
            console.error("Error:", err);
            showAlert("Error", "Terjadi kesalahan");
        } finally {
            setSaving(false);
        }
    };

    const handlePopupClose = () => {
        setShowPopup(false);
        if (popupType === "success") {
            router.back();
        }
    };

    // Format date for display
    const formatDate = (dateStr: string, dayOffset: number = 0) => {
        if (!dateStr) return "TBD";
        const date = new Date(dateStr);
        date.setDate(date.getDate() + dayOffset);
        return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    // Get unique days
    const days = [...new Set(scheduleItems.map(item => item.day))].sort();

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={[styles.loadingText, { color: mutedColor }]}>Memuat jadwal...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!isOrganizer) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorContainer}>
                    <MaterialIcons name="lock" size={64} color={mutedColor} />
                    <Text style={[styles.errorTitle, { color: textColor }]}>Akses Ditolak</Text>
                    <Text style={[styles.errorDesc, { color: mutedColor }]}>
                        Hanya penyelenggara yang dapat mengedit jadwal
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
                    headerTitle: "Edit Jadwal",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace(`/tournament/${tournamentId}`);
                                }
                            }}
                            style={{ marginRight: 16, padding: 4 }}
                        >
                            <MaterialIcons name="arrow-back" size={24} color={textColor} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Tournament Info */}
                    <View style={[styles.tournamentCard, { backgroundColor: cardColor, borderColor }]}>
                        <Text style={[styles.tournamentName, { color: textColor }]}>
                            {tournament?.name || "Turnamen"}
                        </Text>
                        <Text style={[styles.tournamentDate, { color: mutedColor }]}>
                            {formatDate(tournament?.start_date)}
                        </Text>
                    </View>

                    {/* Add New Item */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Tambah Jadwal</Text>
                        <View style={[styles.addForm, { backgroundColor: cardColor, borderColor }]}>
                            <View style={styles.daySelector}>
                                {[1, 2, 3].map(day => (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.dayBtn,
                                            { borderColor: selectedDay === day ? Colors.primary : borderColor },
                                            selectedDay === day && { backgroundColor: Colors.primary }
                                        ]}
                                        onPress={() => setSelectedDay(day)}
                                    >
                                        <Text style={[
                                            styles.dayBtnText,
                                            { color: selectedDay === day ? "#fff" : textColor }
                                        ]}>
                                            Hari {day}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.timeInput, { backgroundColor: bgColor, color: textColor, borderColor }]}
                                    placeholder="08:00"
                                    placeholderTextColor={mutedColor}
                                    value={newTime}
                                    onChangeText={setNewTime}
                                />
                                <TextInput
                                    style={[styles.eventInput, { backgroundColor: bgColor, color: textColor, borderColor }]}
                                    placeholder="Nama acara..."
                                    placeholderTextColor={mutedColor}
                                    value={newEvent}
                                    onChangeText={setNewEvent}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.addBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleAddItem}
                            >
                                <MaterialIcons name="add" size={20} color="#fff" />
                                <Text style={styles.addBtnText}>Tambah</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Schedule List by Day */}
                    {days.map(day => (
                        <View key={day} style={styles.section}>
                            <View style={styles.dayHeader}>
                                <Text style={[styles.sectionTitle, { color: textColor }]}>
                                    Hari {day}
                                </Text>
                                <Text style={[styles.dayDate, { color: mutedColor }]}>
                                    {formatDate(tournament?.start_date, day - 1)}
                                </Text>
                            </View>
                            <View style={[styles.scheduleList, { backgroundColor: cardColor, borderColor }]}>
                                {scheduleItems
                                    .filter(item => item.day === day)
                                    .sort((a, b) => a.time.localeCompare(b.time))
                                    .map((item, index) => (
                                        <View
                                            key={item.id}
                                            style={[
                                                styles.scheduleItem,
                                                index < scheduleItems.filter(i => i.day === day).length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor }
                                            ]}
                                        >
                                            <TextInput
                                                style={[styles.itemTime, { color: Colors.primary }]}
                                                value={item.time}
                                                onChangeText={(val) => handleUpdateItem(item.id, "time", val)}
                                            />
                                            <TextInput
                                                style={[styles.itemEvent, { color: textColor }]}
                                                value={item.event}
                                                onChangeText={(val) => handleUpdateItem(item.id, "event", val)}
                                            />
                                            <TouchableOpacity
                                                style={styles.deleteBtn}
                                                onPress={() => handleRemoveItem(item.id)}
                                            >
                                                <MaterialIcons name="close" size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                {scheduleItems.filter(item => item.day === day).length === 0 && (
                                    <Text style={[styles.emptyDay, { color: mutedColor }]}>
                                        Belum ada jadwal untuk hari ini
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}

                    {days.length === 0 && (
                        <View style={[styles.emptyState, { backgroundColor: cardColor, borderColor }]}>
                            <MaterialIcons name="event" size={48} color={mutedColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                Belum Ada Jadwal
                            </Text>
                            <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                Tambahkan jadwal menggunakan form di atas
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Save Button */}
                <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: Colors.primary }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="save" size={20} color="#fff" />
                                <Text style={styles.saveBtnText}>Simpan Jadwal</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

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
    tournamentCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
    tournamentName: { fontSize: 18, fontWeight: "600" },
    tournamentDate: { fontSize: 14, marginTop: 4 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
    addForm: { padding: 16, borderRadius: 12, borderWidth: 1 },
    daySelector: { flexDirection: "row", gap: 8, marginBottom: 12 },
    dayBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" },
    dayBtnText: { fontSize: 13, fontWeight: "600" },
    inputRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    timeInput: { width: 80, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlign: "center" },
    eventInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
    addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 8, gap: 6 },
    addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    dayDate: { fontSize: 13 },
    scheduleList: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    scheduleItem: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
    itemTime: { width: 60, fontSize: 14, fontWeight: "600" },
    itemEvent: { flex: 1, fontSize: 14 },
    deleteBtn: { padding: 6 },
    emptyDay: { padding: 20, textAlign: "center", fontSize: 14 },
    emptyState: { padding: 40, alignItems: "center", borderRadius: 12, borderWidth: 1 },
    emptyTitle: { fontSize: 16, fontWeight: "600", marginTop: 12 },
    emptyDesc: { fontSize: 14, marginTop: 8, textAlign: "center" },
    bottomAction: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1 },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, gap: 8 },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    popupOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
    popupContainer: { padding: 24, borderRadius: 16, alignItems: "center", minWidth: 280, maxWidth: "80%" },
    popupTitle: { fontSize: 18, fontWeight: "600", marginTop: 12 },
    popupMessage: { fontSize: 14, marginTop: 8, textAlign: "center" },
    popupButton: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
    popupButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
