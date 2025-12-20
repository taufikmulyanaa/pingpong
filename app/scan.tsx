import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    useColorScheme,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    Linking,
    Button,
    ScrollView,
    Modal,
    TextInput,
    Image,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { Colors, SharedStyles, ExtendedColors } from "../src/lib/constants";
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/authStore";

interface Club {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
}

interface OnlineUser {
    id: string;
    name: string;
    avatar_url: string | null;
    rating_mr: number;
    is_online: boolean;
}

export default function ScanQRScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();

    const [permission, requestPermission] = useCameraPermissions();
    const [isScanning, setIsScanning] = useState(false);
    const [scanned, setScanned] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const [showScoreModal, setShowScoreModal] = useState(false);
    const [scannedOpponent, setScannedOpponent] = useState<any>(null);
    const [matchScores, setMatchScores] = useState<{ me: string; opp: string }[]>(Array(5).fill({ me: "", opp: "" }));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Club Check-in State
    const [showClubModal, setShowClubModal] = useState(false);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [isLoadingClubs, setIsLoadingClubs] = useState(false);

    // Online Users State
    const [showUserModal, setShowUserModal] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");

    // My QR Code State
    const [showMyQR, setShowMyQR] = useState(false);

    // Live Scorer State
    const [activeSetIndex, setActiveSetIndex] = useState(0);
    const [currentPointMe, setCurrentPointMe] = useState(0);
    const [currentPointOpp, setCurrentPointOpp] = useState(0);

    const activeSetWinner = useMemo(() => {
        if (currentPointMe >= 11 && currentPointMe - currentPointOpp >= 2) return 'me';
        if (currentPointOpp >= 11 && currentPointOpp - currentPointMe >= 2) return 'opp';
        return null;
    }, [currentPointMe, currentPointOpp]);

    // Handle Barcode Scanned
    const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
        if (scanned || isScanning) return;

        setScanned(true);
        setIsScanning(true);

        console.log(`Bar code with type ${type} and data ${data} has been scanned!`);

        try {
            if (data.startsWith("v:")) {
                const venueId = data.split(":")[1];
                handleVenueCheckIn(venueId);
            } else if (data.startsWith("u:")) {
                const userId = data.split(":")[1];
                handleUserScan(userId);
            } else if (data.startsWith("m:")) {
                const matchId = data.split(":")[1];
                handleMatchConfirmation(matchId);
            } else if (data.startsWith("t:")) {
                const tournamentId = data.split(":")[1];
                handleTournamentJoin(tournamentId);
            } else {
                Alert.alert(
                    "QR Code Tidak Dikenali",
                    `Data: ${data}\nQR Code ini tidak dikenali.`,
                    [{ text: "Scan Lagi", onPress: resetScan }]
                );
            }
        } catch (error) {
            Alert.alert("Error", "Gagal memproses QR Code.", [{ text: "Scan Lagi", onPress: resetScan }]);
        }
    };

    const resetScan = () => {
        setScanned(false);
        setIsScanning(false);
    };

    // Handler Functions
    const handleVenueCheckIn = async (venueId: string) => {
        if (!profile) {
            Alert.alert("Error", "Anda harus login untuk check-in");
            return;
        }

        try {
            // Verify venue exists
            const { data: venue, error: venueError } = await supabase
                .from("venues")
                .select("name, city")
                .eq("id", venueId)
                .single();

            if (venueError || !venue) {
                Alert.alert("Venue Tidak Ditemukan", "QR Code venue ini tidak valid.", [
                    { text: "Scan Lagi", onPress: resetScan },
                ]);
                return;
            }

            // Create check-in record (using a generic table or we'd need a check_ins table)
            // For now, just update user's last location
            await (supabase.from("profiles") as any)
                .update({
                    last_venue_id: venueId,
                    last_check_in: new Date().toISOString(),
                })
                .eq("id", profile.id);

            Alert.alert(
                "Check-in Berhasil! ✅",
                `Anda berhasil check-in di ${(venue as any).name}, ${(venue as any).city}`,
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            console.error("Check-in error:", error);
            Alert.alert("Error", "Gagal melakukan check-in. Silakan coba lagi.", [
                { text: "OK", onPress: resetScan },
            ]);
        }
    };

    const handleMatchConfirmation = async (matchId: string) => {
        try {
            // Verify match exists and is valid
            const { data: match, error } = await supabase
                .from("matches")
                .select("*, player1:profiles!player1_id(name), player2:profiles!player2_id(name)")
                .eq("id", matchId)
                .single();

            if (error || !match) {
                Alert.alert("Match Tidak Ditemukan", "QR Code match ini tidak valid.", [
                    { text: "Scan Lagi", onPress: resetScan },
                ]);
                return;
            }

            const player1Name = (match as any).player1?.name || "Player 1";
            const player2Name = (match as any).player2?.name || "Player 2";

            Alert.alert(
                "Konfirmasi Match 🏓",
                `${player1Name} vs ${player2Name}\nStatus: ${(match as any).status}\n\nBuka detail match?`,
                [
                    { text: "Batal", style: "cancel", onPress: resetScan },
                    { text: "Buka", onPress: () => router.push({ pathname: "/match/[id]", params: { id: matchId } }) },
                ]
            );
        } catch (error) {
            Alert.alert("Error", "Gagal memverifikasi match.", [{ text: "OK", onPress: resetScan }]);
        }
    };

    const handleTournamentJoin = async (tournamentId: string) => {
        try {
            // Verify tournament exists
            const { data: tournament, error } = await supabase
                .from("tournaments")
                .select("name, status, current_participants, max_participants")
                .eq("id", tournamentId)
                .single();

            if (error || !tournament) {
                Alert.alert("Turnamen Tidak Ditemukan", "QR Code turnamen ini tidak valid.", [
                    { text: "Scan Lagi", onPress: resetScan },
                ]);
                return;
            }

            Alert.alert(
                "Turnamen Ditemukan 🏆",
                `${(tournament as any).name}\nPeserta: ${(tournament as any).current_participants}/${(tournament as any).max_participants}\nStatus: ${(tournament as any).status}`,
                [
                    { text: "Batal", style: "cancel", onPress: resetScan },
                    { text: "Buka", onPress: () => router.push({ pathname: "/tournament/[id]", params: { id: tournamentId } }) },
                ]
            );
        } catch (error) {
            Alert.alert("Error", "Gagal memverifikasi turnamen.", [{ text: "OK", onPress: resetScan }]);
        }
    };

    const handleUserScan = async (userId: string) => {
        if (!profile) return;
        try {
            const { data: user, error } = await supabase
                .from("profiles")
                .select("id, name, avatar_url, rating_mr")
                .eq("id", userId)
                .single();

            if (error || !user) {
                Alert.alert("User Tidak Ditemukan", "QR Code user tidak valid.", [{ text: "OK", onPress: resetScan }]);
                return;
            }

            setScannedOpponent(user);
            setShowScoreModal(true);
        } catch (error) {
            Alert.alert("Error", "Gagal memverifikasi user.", [{ text: "OK", onPress: resetScan }]);
        }
    };

    const handleScoreChange = (setIdx: number, player: 'me' | 'opp', value: string) => {
        const newScores = [...matchScores];
        newScores[setIdx] = { ...newScores[setIdx], [player]: value };
        setMatchScores(newScores);
    };

    const handleSubmitMatch = async () => {
        if (!profile || !scannedOpponent) return;

        setIsSubmitting(true);
        try {
            // Calculate winner
            let mySets = 0;
            let oppSets = 0;
            const validSets = matchScores.filter(s => s.me && s.opp);

            if (validSets.length === 0) {
                Alert.alert("Error", "Masukkan setidaknya skor 1 set");
                setIsSubmitting(false);
                return;
            }

            validSets.forEach(s => {
                const m = parseInt(s.me);
                const o = parseInt(s.opp);
                if (m > o) mySets++;
                else if (o > m) oppSets++;
            });

            const winnerId = mySets > oppSets ? profile.id : scannedOpponent.id;
            const scoreString = validSets.map(s => `${s.me}-${s.opp}`).join(", ");
            const status = "COMPLETED";

            // Insert Match
            const { data, error } = await supabase
                .from("matches")
                .insert({
                    player1_id: profile.id,
                    player2_id: scannedOpponent.id,
                    winner_id: winnerId,
                    score: scoreString,
                    status: status,
                    match_date: new Date().toISOString(),
                    type: "RANKED" // Changed to RANKED to enable stats/streak updates
                } as any)
                .select();

            if (error) throw error;

            // Call ELO Calculation RPC to update streaks, ratings, XP
            if (data && data[0]) {
                await (supabase as any).rpc('calculate_elo_rating', {
                    p_match_id: (data as any)[0].id,
                    p_winner_id: winnerId
                });
            }

            Alert.alert("Sukses", `Match Disimpan!\nPemenang: ${mySets > oppSets ? "Anda" : scannedOpponent.name}\nSkor: ${scoreString}`, [
                {
                    text: "OK", onPress: () => {
                        setShowScoreModal(false);
                        router.push("/" as any);
                    }
                }
            ]);

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Gagal menyimpan match.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        const hasData = matchScores.some(s => s.me !== "" || s.opp !== "");
        if (hasData) {
            setShowConfirmModal(true);
        } else {
            setShowScoreModal(false);
        }
    };

    // Live Scorer Logic
    const handlePointChange = (player: 'me' | 'opp', delta: number) => {
        // if (activeSetWinner && delta > 0) return; // Optional lock
        if (player === 'me') {
            setCurrentPointMe(Math.max(0, currentPointMe + delta));
        } else {
            setCurrentPointOpp(Math.max(0, currentPointOpp + delta));
        }
    };

    const finishSet = () => {
        // Save using current state
        const newScores = [...matchScores];
        newScores[activeSetIndex] = { me: currentPointMe.toString(), opp: currentPointOpp.toString() };
        setMatchScores(newScores);

        // Reset for next set
        if (activeSetIndex < 4) {
            setActiveSetIndex(prev => prev + 1);
            setCurrentPointMe(0);
            setCurrentPointOpp(0);
        }
    };

    // Also update confirm close to reset everything
    const confirmCloseAction = () => {
        setShowConfirmModal(false);
        setShowScoreModal(false);
        setMatchScores(Array(5).fill({ me: "", opp: "" }));
        setActiveSetIndex(0);
        setCurrentPointMe(0);
        setCurrentPointOpp(0);
    };

    // Fetch clubs for check-in
    const fetchClubs = async () => {
        setIsLoadingClubs(true);
        try {
            const { data, error } = await supabase
                .from("clubs")
                .select("id, name, city, address")
                .order("name")
                .limit(50);

            if (error) {
                console.error("Error fetching clubs:", error);
                Alert.alert("Error", "Gagal memuat daftar PTM");
            } else {
                setClubs(data || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoadingClubs(false);
        }
    };

    // Fetch online/recent users for on-the-spot match
    const fetchOnlineUsers = async () => {
        if (!profile?.id) return;

        setIsLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, name, avatar_url, rating_mr, is_online")
                .neq("id", profile.id)
                .order("is_online", { ascending: false })
                .order("last_active_at", { ascending: false, nullsFirst: false })
                .limit(30);

            if (error) {
                console.error("Error fetching users:", error);
                Alert.alert("Error", "Gagal memuat daftar pemain");
            } else {
                setOnlineUsers(data || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Open Club Check-in Modal
    const handleOpenClubCheckIn = () => {
        setShowClubModal(true);
        fetchClubs();
    };

    // Open Online Users Modal for On-the-spot Match
    const handleOpenOnTheSpot = () => {
        setShowUserModal(true);
        fetchOnlineUsers();
    };

    // Check-in to selected club
    const handleClubCheckIn = async (club: Club) => {
        if (!profile) {
            Alert.alert("Error", "Anda harus login untuk check-in");
            return;
        }

        try {
            await (supabase.from("profiles") as any)
                .update({
                    last_venue_id: club.id,
                    last_check_in: new Date().toISOString(),
                })
                .eq("id", profile.id);

            setShowClubModal(false);
            Alert.alert(
                "Check-in Berhasil! ✅",
                `Anda berhasil check-in di ${club.name}${club.city ? `, ${club.city}` : ""}`,
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (error) {
            console.error("Check-in error:", error);
            Alert.alert("Error", "Gagal melakukan check-in. Silakan coba lagi.");
        }
    };

    // Select user for on-the-spot match
    const handleSelectOpponent = (user: OnlineUser) => {
        setScannedOpponent(user);
        setShowUserModal(false);
        setShowScoreModal(true);
    };

    // Filter users by search query
    const filteredUsers = useMemo(() => {
        if (!userSearchQuery.trim()) return onlineUsers;
        const query = userSearchQuery.toLowerCase();
        return onlineUsers.filter(user =>
            user.name?.toLowerCase().includes(query)
        );
    }, [onlineUsers, userSearchQuery]);

    if (!permission) {
        // Camera permissions are still loading.
        return <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center' }]}><ActivityIndicator /></View>;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <MaterialIcons name="no-photography" size={64} color={mutedColor} style={{ marginBottom: 20 }} />
                <Text style={{ textAlign: 'center', color: textColor, marginBottom: 20, fontSize: 16 }}>
                    Kami membutuhkan izin kamera untuk memindai QR Code.
                </Text>
                <Button onPress={requestPermission} title="Izinkan Kamera" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Header */}
                <LinearGradient
                    colors={[Colors.secondary, '#000830']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: "#fff" }]}>Scan QR</Text>
                    <View style={{ width: 40 }} />
                </LinearGradient>

                {/* Camera View */}
                <View style={styles.cameraContainer}>
                    {Platform.OS === 'web' ? (
                        <View style={[styles.webCameraPlaceholder, { backgroundColor: '#000' }]}>
                            <Text style={{ color: '#fff' }}>Kamera tidak tersedia di preview web.</Text>
                            <Text style={{ color: '#aaa', fontSize: 12, marginTop: 8 }}>Gunakan opsi di bawah untuk check-in atau pilih lawan.</Text>
                        </View>
                    ) : (
                        <>
                            <CameraView
                                style={styles.camera}
                                facing="back"
                                barcodeScannerSettings={{
                                    barcodeTypes: ["qr"],
                                }}
                                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                            />
                            {/* Overlay needs to be absolutely positioned over the camera, not a child */}
                            <View style={[styles.scannerOverlay, StyleSheet.absoluteFillObject]}>
                                <View style={[styles.scannerFrame, { borderColor: scanned ? Colors.success : '#fff' }]} />
                                <Text style={styles.scanHint}>
                                    {scanned ? "Memproses..." : "Arahkan kamera ke QR Code"}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Actions - Real Features */}
                <View style={styles.actionsContainer}>
                    <View style={styles.dragHandle} />
                    <Text style={[styles.actionsTitle, { color: textColor }]}>Opsi Lain</Text>

                    <ScrollView style={{ maxHeight: 200 }}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: cardColor }]}
                            onPress={handleOpenClubCheckIn}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${Colors.primary}20` }]}>
                                <MaterialIcons name="place" size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.actionText}>
                                <Text style={[styles.actionTitle, { color: textColor }]}>Check-in PTM</Text>
                                <Text style={[styles.actionSubtitle, { color: mutedColor }]}>
                                    Pilih PTM untuk check-in
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: cardColor }]}
                            onPress={handleOpenOnTheSpot}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `#10B98120` }]}>
                                <MaterialIcons name="person-add" size={24} color="#10B981" />
                            </View>
                            <View style={styles.actionText}>
                                <Text style={[styles.actionTitle, { color: textColor }]}>Pilih Lawan</Text>
                                <Text style={[styles.actionSubtitle, { color: mutedColor }]}>
                                    Main langsung tanpa scan QR
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: cardColor, borderColor: Colors.primary, borderWidth: 1 }]}
                            onPress={() => setShowMyQR(true)}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${Colors.primary}20` }]}>
                                <MaterialIcons name="qr-code" size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.actionText}>
                                <Text style={[styles.actionTitle, { color: textColor }]}>QR Saya</Text>
                                <Text style={[styles.actionSubtitle, { color: mutedColor }]}>
                                    Tunjukkan ke lawan untuk match
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                        </TouchableOpacity>

                        {scanned && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: cardColor, borderColor: Colors.primary }]}
                                onPress={resetScan}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: `${Colors.primary}20` }]}>
                                    <MaterialIcons name="refresh" size={24} color={Colors.primary} />
                                </View>
                                <View style={styles.actionText}>
                                    <Text style={[styles.actionTitle, { color: textColor }]}>Scan Ulang</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                {/* My QR Code Modal */}
                <Modal
                    visible={showMyQR}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowMyQR(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.myQRModal, { backgroundColor: cardColor }]}>
                            <Text style={[styles.myQRTitle, { color: textColor }]}>QR Code Saya</Text>

                            <View style={styles.myQRContainer}>
                                <Image
                                    style={styles.myQRImage}
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=u:${profile?.id}` }}
                                />
                            </View>

                            <Text style={[styles.myQRDesc, { color: mutedColor }]}>
                                Tunjukkan QR Code ini ke lawan untuk memulai match on-the-spot
                            </Text>

                            <TouchableOpacity
                                style={[styles.myQRCloseBtn, { backgroundColor: Colors.primary }]}
                                onPress={() => setShowMyQR(false)}
                            >
                                <Text style={styles.myQRCloseBtnText}>Tutup</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Club Check-in Modal */}
                <Modal
                    visible={showClubModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowClubModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.selectionModal, { backgroundColor: bgColor }]}>
                            <View style={styles.selectionHeader}>
                                <Text style={[styles.selectionTitle, { color: textColor }]}>Pilih PTM</Text>
                                <TouchableOpacity onPress={() => setShowClubModal(false)}>
                                    <MaterialIcons name="close" size={24} color={mutedColor} />
                                </TouchableOpacity>
                            </View>

                            {isLoadingClubs ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                    <Text style={[styles.loadingText, { color: mutedColor }]}>Memuat daftar PTM...</Text>
                                </View>
                            ) : clubs.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="store" size={48} color={mutedColor} />
                                    <Text style={[styles.emptyText, { color: mutedColor }]}>Belum ada PTM terdaftar</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={clubs}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.selectionItem, { backgroundColor: cardColor }]}
                                            onPress={() => handleClubCheckIn(item)}
                                        >
                                            <View style={[styles.selectionIcon, { backgroundColor: `${Colors.primary}20` }]}>
                                                <MaterialIcons name="store" size={24} color={Colors.primary} />
                                            </View>
                                            <View style={styles.selectionInfo}>
                                                <Text style={[styles.selectionName, { color: textColor }]}>{item.name}</Text>
                                                <Text style={[styles.selectionSub, { color: mutedColor }]}>
                                                    {item.city || item.address || "Lokasi tidak tersedia"}
                                                </Text>
                                            </View>
                                            <MaterialIcons name="check-circle-outline" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Online Users Modal */}
                <Modal
                    visible={showUserModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowUserModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.selectionModal, { backgroundColor: bgColor }]}>
                            <View style={styles.selectionHeader}>
                                <Text style={[styles.selectionTitle, { color: textColor }]}>Pilih Lawan</Text>
                                <TouchableOpacity onPress={() => setShowUserModal(false)}>
                                    <MaterialIcons name="close" size={24} color={mutedColor} />
                                </TouchableOpacity>
                            </View>

                            {/* Search Input */}
                            <View style={[styles.searchContainer, { backgroundColor: cardColor }]}>
                                <MaterialIcons name="search" size={20} color={mutedColor} />
                                <TextInput
                                    style={[styles.searchInput, { color: textColor }]}
                                    placeholder="Cari nama pemain..."
                                    placeholderTextColor={mutedColor}
                                    value={userSearchQuery}
                                    onChangeText={setUserSearchQuery}
                                />
                            </View>

                            {isLoadingUsers ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                    <Text style={[styles.loadingText, { color: mutedColor }]}>Memuat daftar pemain...</Text>
                                </View>
                            ) : filteredUsers.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <MaterialIcons name="person-search" size={48} color={mutedColor} />
                                    <Text style={[styles.emptyText, { color: mutedColor }]}>Tidak ada pemain ditemukan</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredUsers}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={[styles.selectionItem, { backgroundColor: cardColor }]}
                                            onPress={() => handleSelectOpponent(item)}
                                        >
                                            <Image
                                                source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || "User")}&background=random` }}
                                                style={styles.userAvatar}
                                            />
                                            <View style={styles.selectionInfo}>
                                                <View style={styles.userNameRow}>
                                                    <Text style={[styles.selectionName, { color: textColor }]}>{item.name}</Text>
                                                    {item.is_online && (
                                                        <View style={styles.onlineBadge}>
                                                            <View style={styles.onlineDot} />
                                                            <Text style={styles.onlineText}>Online</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={[styles.selectionSub, { color: mutedColor }]}>
                                                    MR {item.rating_mr || 1000}
                                                </Text>
                                            </View>
                                            <MaterialIcons name="sports-tennis" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Scoreboard Modal */}
                <Modal
                    visible={showScoreModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={handleCloseModal}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.scorerContainer}>
                            {/* Header */}
                            <View style={styles.scorerHeader}>
                                <View style={{ width: 40 }} /> {/* Spacer Left */}
                                <Text style={[styles.scorerTitle, { color: textColor }]}>Set {activeSetIndex + 1}</Text>
                                <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                                    <MaterialIcons name="close" size={24} color={mutedColor} />
                                </TouchableOpacity>
                            </View>

                            {/* Players & Scores - Premium Design */}
                            <View style={styles.scorerBody}>
                                {/* Player 1 (Me) */}
                                <View style={styles.playerColumn}>
                                    <Image
                                        source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "Me")}&background=009688&color=fff` }}
                                        style={styles.scorerAvatar}
                                    />
                                    <Text style={[styles.playerNameLarge, { color: textColor }]} numberOfLines={1}>{profile?.name || "Anda"}</Text>
                                    <Text style={[styles.playerMrText, { color: mutedColor }]}>MR {profile?.rating_mr || 1000}</Text>

                                    <View style={styles.scoreControlsRow}>
                                        <TouchableOpacity style={[styles.controlBtnRound, { backgroundColor: 'rgba(0,0,0,0.05)' }]} onPress={() => handlePointChange('me', -1)}>
                                            <MaterialIcons name="remove" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                        <Text style={[styles.scoreBigText, { color: Colors.primary }]}>{currentPointMe}</Text>
                                        <TouchableOpacity style={[styles.controlBtnRound, { backgroundColor: Colors.primary }]} onPress={() => handlePointChange('me', 1)}>
                                            <MaterialIcons name="add" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* VS Divider */}
                                <View style={styles.centerDivider}>
                                    <Text style={[styles.vsTextLarge, { color: mutedColor }]}>vs</Text>
                                </View>

                                {/* Player 2 (Opponent) */}
                                <View style={styles.playerColumn}>
                                    <Image
                                        source={{ uri: scannedOpponent?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(scannedOpponent?.name || "Opp")}&background=random` }}
                                        style={styles.scorerAvatar}
                                    />
                                    <Text style={[styles.playerNameLarge, { color: textColor }]} numberOfLines={1}>{scannedOpponent?.name || "Lawan"}</Text>
                                    <Text style={[styles.playerMrText, { color: mutedColor }]}>MR {scannedOpponent?.rating_mr || 1000}</Text>

                                    <View style={styles.scoreControlsRow}>
                                        <TouchableOpacity style={[styles.controlBtnRound, { backgroundColor: 'rgba(0,0,0,0.05)' }]} onPress={() => handlePointChange('opp', -1)}>
                                            <MaterialIcons name="remove" size={24} color={Colors.secondary} />
                                        </TouchableOpacity>
                                        <Text style={[styles.scoreBigText, { color: Colors.secondary }]}>{currentPointOpp}</Text>
                                        <TouchableOpacity style={[styles.controlBtnRound, { backgroundColor: Colors.secondary }]} onPress={() => handlePointChange('opp', 1)}>
                                            <MaterialIcons name="add" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Action Buttons */}
                            {/* Action Buttons */}
                            <View style={styles.scorerActions}>
                                {activeSetWinner ? (
                                    <TouchableOpacity style={[styles.nextSetBtn, { backgroundColor: Colors.primary }]} onPress={() => {
                                        finishSet();
                                        if (activeSetIndex === 4) handleSubmitMatch();
                                    }}>
                                        <Text style={styles.nextSetText}>
                                            {activeSetIndex === 4 ? "Selesai Match & Simpan" : "Lanjut Set Berikutnya"}
                                        </Text>
                                        <MaterialIcons name="arrow-forward" size={24} color="#fff" />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={{ height: 20 }} />
                                )}

                                <TouchableOpacity
                                    style={[styles.finishMatchBtn, { borderColor: Colors.primary }]}
                                    onPress={handleSubmitMatch}
                                >
                                    <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16 }}>Akhiri & Simpan Match</Text>
                                </TouchableOpacity>
                            </View>

                            {/* History Footer */}
                            <View style={{ height: 60, marginTop: 20 }}>
                                <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }} showsHorizontalScrollIndicator={false}>
                                    {matchScores.map((s, idx) => (
                                        <View key={idx} style={[styles.historyBadge, idx === activeSetIndex && { backgroundColor: Colors.primary }]}>
                                            <Text style={[styles.historyText, { color: idx === activeSetIndex ? '#fff' : textColor }]}>
                                                S{idx + 1}: {idx === activeSetIndex ? `${currentPointMe}-${currentPointOpp}` : `${s.me || 0}-${s.opp || 0}`}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>

                            {showConfirmModal && (
                                <View style={styles.confirmOverlay}>
                                    <View style={styles.confirmContent}>
                                        <Text style={[styles.confirmTitle, { color: textColor }]}>Batalkan Input Skor?</Text>
                                        <Text style={[styles.confirmDesc, { color: mutedColor }]}>Data skor yang sudah diisi akan hilang.</Text>

                                        <View style={styles.confirmActions}>
                                            <TouchableOpacity
                                                style={[styles.confirmBtn, { borderColor: Colors.muted }]}
                                                onPress={() => setShowConfirmModal(false)}
                                            >
                                                <Text style={[styles.confirmBtnText, { color: textColor }]}>Lanjut Main</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.confirmBtn, styles.confirmBtnDestructive]}
                                                onPress={confirmCloseAction}
                                            >
                                                <Text style={[styles.confirmBtnText, { color: '#fff' }]}>Ya, Keluar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            </SafeAreaView >
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
        paddingBottom: 16,
        paddingTop: 12,
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
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
    },
    webCameraPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    scanHint: {
        color: '#fff',
        marginTop: 20,
        fontSize: 14,
        fontWeight: '500',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    actionsContainer: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        marginTop: -24, // Overlap camera slightly
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.muted + '40',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    actionsTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 16,
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
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
        color: Colors.muted,
        marginTop: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        width: "90%",
        maxHeight: "80%",
        backgroundColor: Colors.background,
        borderRadius: 20,
        padding: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
    },
    vsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    playerBlock: {
        alignItems: "center",
        flex: 1,
    },
    playerName: {
        fontWeight: "bold",
        marginTop: 8,
        textAlign: "center",
    },
    vsText: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.muted,
        marginHorizontal: 10,
    },
    setRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    setLabel: {
        width: 50,
        fontWeight: "600",
    },
    scoreInput: {
        borderWidth: 1,
        borderColor: Colors.muted,
        borderRadius: 8,
        width: 60,
        height: 40,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "bold",
    },
    submitBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    closeBtn: {
        padding: 12,
    },
    // Confirm Modal
    confirmOverlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        borderRadius: 20, // Match modal radius
    },
    confirmContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmDesc: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        justifyContent: 'center',
    },
    confirmBtnDestructive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    confirmBtnText: {
        fontWeight: '600',
        fontSize: 14,
    },
    // Live Scorer Styles
    scorerContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.background,
        padding: 20,
    },
    scorerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },
    scorerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: -1, // Behind buttons
    },

    scorerBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
    },
    playerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    playerNameLarge: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    scoreBigBox: {
        width: 150, // Increased from 120
        height: 150, // Increased from 120
        borderRadius: 30,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginBottom: 20,
    },
    scoreBigText: {
        fontSize: 90, // Increased from 64
        fontWeight: 'bold',
    },
    scoreControls: {
        flexDirection: 'row',
        gap: 16,
    },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    centerDivider: {
        marginHorizontal: 10,
    },
    vsTextLarge: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    scorerActions: {
        alignItems: 'center',
        marginBottom: 30,
    },
    nextSetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 100,
        elevation: 5,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    nextSetText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 8,
    },
    helperText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    historyFooter: {
        height: 50,
    },
    historyBadge: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        marginRight: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activeHistoryBadge: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    historyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    finishMatchBtn: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        width: '80%',
    },
    // Premium Scorer Styles
    scorerAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginBottom: 8,
    },
    playerMrText: {
        fontSize: 12,
        marginBottom: 12,
    },
    scoreControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    controlBtnRound: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Selection Modal Styles
    selectionModal: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 24,
        padding: 20,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    selectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    selectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
    },
    selectionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    selectionInfo: {
        flex: 1,
    },
    selectionName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    selectionSub: {
        fontSize: 12,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#10B98115',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 4,
    },
    onlineText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '600',
    },
    // My QR Code Styles
    myQRModal: {
        width: '85%',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
    },
    myQRTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    myQRContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    myQRImage: {
        width: 220,
        height: 220,
    },
    myQRDesc: {
        textAlign: 'center',
        marginTop: 24,
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    myQRCloseBtn: {
        marginTop: 24,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 100,
    },
    myQRCloseBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

