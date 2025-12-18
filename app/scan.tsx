import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    useColorScheme,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../src/lib/constants";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/authStore";

// Note: For actual QR scanning, you would need to install expo-camera or expo-barcode-scanner
// This is a placeholder screen that simulates the scan flow

export default function ScanQRScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const handleSimulateScan = async (type: "venue" | "match") => {
        setIsScanning(true);

        // Simulate scanning delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (type === "venue") {
            // Simulate venue check-in
            Alert.alert(
                "Check-in Berhasil! ✅",
                "Anda telah check-in di GOR Bulungan.\n\nSelamat bermain!",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } else {
            // Simulate match confirmation
            Alert.alert(
                "Pertandingan Dikonfirmasi! 🏓",
                "Pertandingan dengan Budi Santoso telah dikonfirmasi.\n\nSemoga menang!",
                [
                    { text: "Mulai Scoring", onPress: () => router.push({ pathname: "/match/[id]", params: { id: "demo-match" } }) },
                    { text: "Nanti", style: "cancel" },
                ]
            );
        }

        setIsScanning(false);
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: "#fff" }]}>Scan QR</Text>
                    <View style={{ width: 40 }} />
                </View>
                {/* Scanner Placeholder */}
                <View style={styles.scannerArea}>
                    <View style={[styles.scannerFrame, { borderColor: Colors.primary }]}>
                        <View style={[styles.cornerTL, { borderColor: Colors.primary }]} />
                        <View style={[styles.cornerTR, { borderColor: Colors.primary }]} />
                        <View style={[styles.cornerBL, { borderColor: Colors.primary }]} />
                        <View style={[styles.cornerBR, { borderColor: Colors.primary }]} />

                        {isScanning ? (
                            <ActivityIndicator size="large" color={Colors.primary} />
                        ) : (
                            <MaterialIcons name="qr-code-scanner" size={80} color={mutedColor} />
                        )}
                    </View>
                    <Text style={[styles.scanHint, { color: mutedColor }]}>
                        {isScanning ? "Memproses..." : "Arahkan kamera ke QR Code"}
                    </Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsContainer}>
                    <Text style={[styles.actionsTitle, { color: textColor }]}>Simulasi Scan</Text>
                    <Text style={[styles.actionsDesc, { color: mutedColor }]}>
                        Untuk demo, gunakan tombol di bawah
                    </Text>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: cardColor }]}
                        onPress={() => handleSimulateScan("venue")}
                        disabled={isScanning}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: `${Colors.primary}20` }]}>
                            <MaterialIcons name="place" size={24} color={Colors.primary} />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: textColor }]}>Check-in Venue</Text>
                            <Text style={[styles.actionSubtitle, { color: mutedColor }]}>
                                Scan QR di meja untuk check-in
                            </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: cardColor }]}
                        onPress={() => handleSimulateScan("match")}
                        disabled={isScanning}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: `${Colors.secondary}20` }]}>
                            <MaterialIcons name="sports-tennis" size={24} color={Colors.secondary} />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: textColor }]}>Konfirmasi Match</Text>
                            <Text style={[styles.actionSubtitle, { color: mutedColor }]}>
                                Scan QR lawan untuk mulai pertandingan
                            </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: cardColor }]}
                        disabled={isScanning}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: "#F59E0B20" }]}>
                            <MaterialIcons name="emoji-events" size={24} color="#F59E0B" />
                        </View>
                        <View style={styles.actionText}>
                            <Text style={[styles.actionTitle, { color: textColor }]}>Daftar Turnamen</Text>
                            <Text style={[styles.actionSubtitle, { color: mutedColor }]}>
                                Scan untuk daftar turnamen cepat
                            </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                    </TouchableOpacity>
                </View>

                {/* My QR Code */}
                <TouchableOpacity style={styles.myQrBtn}>
                    <MaterialIcons name="qr-code" size={20} color={Colors.primary} />
                    <Text style={[styles.myQrText, { color: Colors.primary }]}>Tampilkan QR Code Saya</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: Colors.secondary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    scannerArea: {
        alignItems: "center",
        paddingVertical: 40,
    },
    scannerFrame: {
        width: 250,
        height: 250,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderRadius: 20,
        borderStyle: "dashed",
        position: "relative",
    },
    cornerTL: {
        position: "absolute",
        top: -2,
        left: -2,
        width: 30,
        height: 30,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    cornerTR: {
        position: "absolute",
        top: -2,
        right: -2,
        width: 30,
        height: 30,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    cornerBL: {
        position: "absolute",
        bottom: -2,
        left: -2,
        width: 30,
        height: 30,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    cornerBR: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 30,
        height: 30,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    scanHint: {
        fontSize: 14,
        marginTop: 20,
    },
    actionsContainer: {
        paddingHorizontal: 20,
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
    },
    actionsDesc: {
        fontSize: 13,
        marginBottom: 16,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    actionText: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: "600",
    },
    actionSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    myQrBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 24,
        paddingVertical: 14,
    },
    myQrText: {
        fontSize: 15,
        fontWeight: "600",
    },
});
