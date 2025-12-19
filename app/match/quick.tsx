import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Image,
    Alert,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../src/lib/constants";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

type MatchType = "RANKED" | "FRIENDLY";

interface FoundOpponent {
    id: string;
    name: string;
    avatar_url: string | null;
    rating_mr: number;
    city: string | null;
}

const MATCHMAKING_STEPS = [
    "Menganalisis skill level...",
    "Mencari lawan seimbang...",
    "Memeriksa ketersediaan...",
    "Menemukan lawan potensial...",
];

export default function QuickMatchScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();
    const [isSearching, setIsSearching] = useState(false);
    const [searchStep, setSearchStep] = useState(0);
    const [matchType, setMatchType] = useState<MatchType>("RANKED");
    const [matchFound, setMatchFound] = useState<boolean>(false);
    const [opponent, setOpponent] = useState<FoundOpponent | null>(null);
    const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
    const [showMyQR, setShowMyQR] = useState(false);

    // Animation values
    const pulseAnim = useState(new Animated.Value(1))[0];
    const rotateAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (isSearching) {
            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Rotation animation
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            pulseAnim.setValue(1);
            rotateAnim.setValue(0);
        }
    }, [isSearching]);

    const findOpponent = async (): Promise<FoundOpponent | null> => {
        if (!profile) return null;

        const myRating = profile.rating_mr || 1000;
        const ratingRange = 200; // +/- 200 MR

        try {
            // Search for players within rating range, excluding self
            const { data, error } = await supabase
                .from("profiles")
                .select("id, name, avatar_url, rating_mr, city")
                .neq("id", profile.id)
                .gte("rating_mr", myRating - ratingRange)
                .lte("rating_mr", myRating + ratingRange)
                .eq("is_online", true) // Only search online players
                .order("rating_mr", { ascending: false })
                .limit(10);

            if (error) {
                console.error("Error finding opponent:", error);
                // If no online players, search without online filter
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from("profiles")
                    .select("id, name, avatar_url, rating_mr, city")
                    .neq("id", profile.id)
                    .gte("rating_mr", myRating - ratingRange)
                    .lte("rating_mr", myRating + ratingRange)
                    .order("rating_mr", { ascending: false })
                    .limit(10);

                if (fallbackError || !fallbackData || fallbackData.length === 0) {
                    return null;
                }
                // Pick random opponent from results
                const randomIndex = Math.floor(Math.random() * fallbackData.length);
                return fallbackData[randomIndex] as FoundOpponent;
            }

            if (!data || data.length === 0) {
                // Fallback: search without online filter
                const { data: allPlayers } = await supabase
                    .from("profiles")
                    .select("id, name, avatar_url, rating_mr, city")
                    .neq("id", profile.id)
                    .order("rating_mr", { ascending: false })
                    .limit(20);

                if (!allPlayers || allPlayers.length === 0) return null;
                const randomIndex = Math.floor(Math.random() * allPlayers.length);
                return allPlayers[randomIndex] as FoundOpponent;
            }

            // Pick random opponent from results
            const randomIndex = Math.floor(Math.random() * data.length);
            return data[randomIndex] as FoundOpponent;
        } catch (error) {
            console.error("Matchmaking error:", error);
            return null;
        }
    };

    const createMatch = async (opponentId: string): Promise<string | null> => {
        if (!profile) return null;

        try {
            const { data, error } = await supabase
                .from("matches")
                .insert({
                    player1_id: profile.id,
                    player2_id: opponentId,
                    type: matchType,
                    status: "PENDING",
                    best_of: 5,
                    player1_rating_before: profile.rating_mr || 1000,
                } as any)
                .select()
                .single();

            if (error) {
                console.error("Error creating match:", error);
                return null;
            }
            return (data as any)?.id || null;
        } catch (error) {
            console.error("Match creation error:", error);
            return null;
        }
    };

    const handleStartSearch = async (type: MatchType) => {
        setMatchType(type);
        setIsSearching(true);
        setSearchStep(0);
        setMatchFound(false);
        setOpponent(null);

        // Step progression with real matchmaking
        let step = 0;
        const stepInterval = setInterval(() => {
            step++;
            if (step < MATCHMAKING_STEPS.length) {
                setSearchStep(step);
            }
        }, 1500);

        // Wait a bit then find opponent
        setTimeout(async () => {
            const foundOpponent = await findOpponent();
            clearInterval(stepInterval);

            if (foundOpponent) {
                setOpponent(foundOpponent);
                const matchId = await createMatch(foundOpponent.id);
                setCreatedMatchId(matchId);
                setMatchFound(true);
                setIsSearching(false);
            } else {
                setIsSearching(false);
                Alert.alert(
                    "Tidak Ditemukan",
                    "Tidak ada lawan yang tersedia saat ini. Coba lagi nanti.",
                    [{ text: "OK" }]
                );
            }
        }, 4000);
    };

    const handleCancel = async () => {
        setIsSearching(false);
        setSearchStep(0);
        setMatchFound(false);
        setOpponent(null);
        pulseAnim.stopAnimation();
        rotateAnim.stopAnimation();

        // Cancel the pending match if created
        if (createdMatchId) {
            await (supabase as any)
                .from("matches")
                .update({ status: "CANCELLED" })
                .eq("id", createdMatchId);
            setCreatedMatchId(null);
        }
    };

    const handleAcceptMatch = () => {
        if (createdMatchId) {
            // Navigate to match detail
            router.replace(`/match/${createdMatchId}` as any);
        }
    };

    const handleDecline = async () => {
        if (createdMatchId) {
            await (supabase as any)
                .from("matches")
                .update({ status: "CANCELLED" })
                .eq("id", createdMatchId);
        }
        setMatchFound(false);
        setOpponent(null);
        setCreatedMatchId(null);
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const myRating = profile?.rating_mr || 1000;
    const myName = profile?.name || "Anda";
    const myAvatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=random`;

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Quick Match</Text>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMyQR(true)}>
                        <MaterialIcons name="qr-code" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {!isSearching && !matchFound ? (
                        // 1. Initial State: Mode Selection
                        <View style={styles.modeSelection}>
                            <View style={styles.heroSection}>
                                <MaterialIcons name="flash-on" size={80} color="#F59E0B" />
                                <Text style={[styles.heroTitle, { color: textColor }]}>Online Matchmaking</Text>
                                <Text style={[styles.heroDesc, { color: mutedColor }]}>
                                    Sistem akan mencarikan lawan yang seimbang berdasarkan MR rating dan performa terakhirmu.
                                </Text>
                            </View>

                            <View style={styles.modeOptions}>
                                <TouchableOpacity
                                    style={[styles.modeCard, { backgroundColor: cardColor, borderColor: "#F59E0B", borderWidth: 2 }]}
                                    onPress={() => handleStartSearch("RANKED")}
                                >
                                    <View style={[styles.modeIcon, { backgroundColor: "#FFFBEB" }]}>
                                        <MaterialIcons name="emoji-events" size={32} color="#F59E0B" />
                                    </View>
                                    <View style={styles.modeInfo}>
                                        <Text style={[styles.modeTitle, { color: textColor }]}>Ranked Match</Text>
                                        <Text style={[styles.modeSub, { color: mutedColor }]}>+25 MR per kemenangan</Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                                </TouchableOpacity>



                                <TouchableOpacity
                                    style={[styles.modeCard, { backgroundColor: cardColor, borderColor: "rgba(0,0,0,0.05)", borderWidth: 1 }]}
                                    onPress={() => router.push("/scan")}
                                >
                                    <View style={[styles.modeIcon, { backgroundColor: "#ECFDF5" }]}>
                                        <MaterialIcons name="qr-code-scanner" size={32} color="#10B981" />
                                    </View>
                                    <View style={styles.modeInfo}>
                                        <Text style={[styles.modeTitle, { color: textColor }]}>On the spot Match</Text>
                                        <Text style={[styles.modeSub, { color: mutedColor }]}>Main langsung via Scan QR</Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={24} color={mutedColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : isSearching ? (
                        // 2. Searching State
                        <View style={styles.searchingState}>
                            <View style={styles.radarContainer}>
                                <Animated.View style={[styles.radarPulse, { transform: [{ scale: pulseAnim }] }]} />
                                <Animated.View style={[styles.radarSpinner, { transform: [{ rotate: spin }] }]}>
                                    <LinearGradient
                                        colors={[Colors.primary, 'transparent']}
                                        style={styles.radarGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                </Animated.View>
                                <Image
                                    source={{ uri: myAvatar }}
                                    style={styles.myAvatar}
                                />
                            </View>

                            <Text style={[styles.searchingTitle, { color: textColor }]}>Mencari Lawan...</Text>
                            <Text style={[styles.searchingStep, { color: mutedColor }]}>{MATCHMAKING_STEPS[searchStep]}</Text>

                            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                                <Text style={styles.cancelBtnText}>Batalkan</Text>
                            </TouchableOpacity>
                        </View>
                    ) : opponent ? (
                        // 3. Match Found State
                        <View style={styles.matchFoundState}>
                            <Text style={[styles.matchFoundTitle, { color: textColor }]}>Lawan Ditemukan!</Text>

                            <View style={styles.vsContainer}>
                                <View style={styles.playerBlock}>
                                    <Image
                                        source={{ uri: myAvatar }}
                                        style={styles.playerAvatarLarge}
                                    />
                                    <Text style={[styles.playerName, { color: textColor }]}>{myName}</Text>
                                    <Text style={[styles.playerRating, { color: mutedColor }]}>MR {myRating}</Text>
                                </View>

                                <View style={styles.vsBadge}>
                                    <Text style={styles.vsText}>VS</Text>
                                </View>

                                <View style={styles.playerBlock}>
                                    <Image
                                        source={{ uri: opponent.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponent.name)}&background=random` }}
                                        style={styles.playerAvatarLarge}
                                    />
                                    <Text style={[styles.playerName, { color: textColor }]}>{opponent.name}</Text>
                                    <Text style={[styles.playerRating, { color: mutedColor }]}>MR {opponent.rating_mr}</Text>
                                </View>
                            </View>

                            <View style={[styles.matchInfoCard, { backgroundColor: cardColor }]}>
                                <View style={styles.matchInfoRow}>
                                    <MaterialIcons name="emoji-events" size={20} color={mutedColor} />
                                    <Text style={[styles.matchInfoText, { color: textColor }]}>
                                        {matchType === "RANKED" ? "Ranked Match" : "Casual Match"}
                                    </Text>
                                </View>
                                <View style={styles.matchInfoRow}>
                                    <MaterialIcons name="timer" size={20} color={mutedColor} />
                                    <Text style={[styles.matchInfoText, { color: textColor }]}>Best of 5 Sets</Text>
                                </View>
                                {opponent.city && (
                                    <View style={styles.matchInfoRow}>
                                        <MaterialIcons name="place" size={20} color={mutedColor} />
                                        <Text style={[styles.matchInfoText, { color: textColor }]}>{opponent.city}</Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.acceptBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleAcceptMatch}
                            >
                                <Text style={styles.acceptBtnText}>Terima Pertandingan</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                                <Text style={[styles.declineBtnText, { color: Colors.muted }]}>Tolak</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>


                {/* My QR Modal */}
                <Modal
                    visible={showMyQR}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowMyQR(false)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#fff', padding: 30, borderRadius: 24, alignItems: 'center', width: '80%' }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: Colors.text }}>Scan Saya</Text>

                            <View style={{ padding: 10, backgroundColor: '#fff', borderRadius: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}>
                                <Image
                                    style={{ width: 220, height: 220 }}
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=u:${profile?.id}` }}
                                />
                            </View>

                            <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.muted }}>
                                Tunjukkan QR Code ini ke lawan untuk match on-the-spot.
                            </Text>

                            <TouchableOpacity
                                onPress={() => setShowMyQR(false)}
                                style={{ marginTop: 30, paddingVertical: 12, paddingHorizontal: 30, backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.muted }}
                            >
                                <Text style={{ fontWeight: '600', color: Colors.text }}>Tutup</Text>
                            </TouchableOpacity>
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
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: Colors.secondary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
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
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
        padding: 24,
    },
    heroSection: {
        alignItems: "center",
        marginVertical: 40,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 16,
        marginBottom: 8,
    },
    heroDesc: {
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    modeSelection: {
        flex: 1,
    },
    modeOptions: {
        gap: 16,
    },
    modeCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
    },
    modeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    modeInfo: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    modeSub: {
        fontSize: 12,
    },
    searchingState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    radarContainer: {
        width: 200,
        height: 200,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 40,
    },
    radarPulse: {
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(59, 130, 246, 0.3)",
    },
    radarSpinner: {
        position: "absolute",
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    radarGradient: {
        flex: 1,
        borderRadius: 90,
        opacity: 0.2,
    },
    myAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
        borderColor: "#fff",
    },
    searchingTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
    },
    searchingStep: {
        fontSize: 14,
        marginBottom: 32,
    },
    cancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.muted,
    },
    cancelBtnText: {
        color: Colors.muted,
        fontWeight: "600",
    },
    matchFoundState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    matchFoundTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 40,
    },
    vsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 40,
        width: "100%",
    },
    playerBlock: {
        alignItems: "center",
        flex: 1,
    },
    playerAvatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: Colors.primary,
        marginBottom: 12,
    },
    playerName: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 4,
    },
    playerRating: {
        fontSize: 12,
    },
    vsBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.secondary,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 12,
        marginTop: -30,
    },
    vsText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    matchInfoCard: {
        width: "100%",
        padding: 20,
        borderRadius: 16,
        marginBottom: 32,
    },
    matchInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    matchInfoText: {
        fontSize: 14,
        fontWeight: "500",
    },
    acceptBtn: {
        width: "100%",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        marginBottom: 12,
    },
    acceptBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    declineBtn: {
        paddingVertical: 12,
    },
    declineBtnText: {
        fontWeight: "600",
    }
});
