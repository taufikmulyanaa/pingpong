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
    const [opponents, setOpponents] = useState<FoundOpponent[]>([]);
    const [selectedOpponentIndex, setSelectedOpponentIndex] = useState<number>(0);
    const [bestOf, setBestOf] = useState<number>(5);
    const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
    const [showMyQR, setShowMyQR] = useState(false);

    // Animation values
    const pulseAnim = useState(new Animated.Value(1))[0];
    const rotateAnim = useState(new Animated.Value(0))[0];
    const ring1Opacity = useState(new Animated.Value(1))[0];
    const ring1Scale = useState(new Animated.Value(0.8))[0];
    const ring2Opacity = useState(new Animated.Value(1))[0];
    const ring2Scale = useState(new Animated.Value(0.8))[0];
    const ring3Opacity = useState(new Animated.Value(1))[0];
    const ring3Scale = useState(new Animated.Value(0.8))[0];
    const glowAnim = useState(new Animated.Value(0.5))[0];

    useEffect(() => {
        if (isSearching) {
            // Pulse animation for avatar
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Rotation animation
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: true,
                })
            ).start();

            // Ripple ring 1 animation
            Animated.loop(
                Animated.parallel([
                    Animated.timing(ring1Scale, {
                        toValue: 2.2,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ring1Opacity, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Ripple ring 2 animation (staggered)
            setTimeout(() => {
                Animated.loop(
                    Animated.parallel([
                        Animated.timing(ring2Scale, {
                            toValue: 2.2,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(ring2Opacity, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 666);

            // Ripple ring 3 animation (staggered)
            setTimeout(() => {
                Animated.loop(
                    Animated.parallel([
                        Animated.timing(ring3Scale, {
                            toValue: 2.2,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(ring3Opacity, {
                            toValue: 0,
                            duration: 2000,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            }, 1333);

            // Glow animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.5,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            rotateAnim.setValue(0);
            ring1Scale.setValue(0.8);
            ring1Opacity.setValue(1);
            ring2Scale.setValue(0.8);
            ring2Opacity.setValue(1);
            ring3Scale.setValue(0.8);
            ring3Opacity.setValue(1);
            glowAnim.setValue(0.5);
        }
    }, [isSearching]);

    const findOpponents = async (): Promise<FoundOpponent[]> => {
        if (!profile) return [];

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
                .order("rating_mr", { ascending: false })
                .limit(20);

            if (error || !data || data.length === 0) {
                // Fallback: search without rating filter
                const { data: allPlayers } = await supabase
                    .from("profiles")
                    .select("id, name, avatar_url, rating_mr, city")
                    .neq("id", profile.id)
                    .order("rating_mr", { ascending: false })
                    .limit(20);

                if (!allPlayers || allPlayers.length === 0) return [];
                // Pick up to 3 random opponents
                const shuffled = allPlayers.sort(() => 0.5 - Math.random());
                return shuffled.slice(0, Math.min(5, shuffled.length)) as FoundOpponent[];
            }

            // Pick up to 5 random opponents from results
            const shuffled = data.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(5, shuffled.length)) as FoundOpponent[];
        } catch (error) {
            console.error("Matchmaking error:", error);
            return [];
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
                    best_of: bestOf,
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
        setOpponents([]);
        setSelectedOpponentIndex(0);
        setBestOf(5);
        setCreatedMatchId(null);

        // Step progression with real matchmaking
        let step = 0;
        const stepInterval = setInterval(() => {
            step++;
            if (step < MATCHMAKING_STEPS.length) {
                setSearchStep(step);
            }
        }, 1500);

        // Wait a bit then find opponents
        setTimeout(async () => {
            const foundOpponents = await findOpponents();
            clearInterval(stepInterval);

            if (foundOpponents.length > 0) {
                setOpponents(foundOpponents);
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
        setOpponents([]);
        setSelectedOpponentIndex(0);
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

    const handleAcceptMatch = async () => {
        if (opponents.length > 0) {
            const selectedOpponent = opponents[selectedOpponentIndex];
            const matchId = await createMatch(selectedOpponent.id);
            if (matchId) {
                router.replace(`/match/${matchId}` as any);
            }
        }
    };

    const handleDecline = async () => {
        setMatchFound(false);
        setOpponents([]);
        setSelectedOpponentIndex(0);
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
                <LinearGradient
                    colors={[Colors.secondary, '#000830']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Quick Match</Text>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMyQR(true)}>
                        <MaterialIcons name="qr-code" size={24} color="#fff" />
                    </TouchableOpacity>
                </LinearGradient>

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
                        // 2. Searching State - Premium Animation
                        <View style={styles.searchingState}>
                            <View style={styles.radarContainer}>
                                {/* Ripple Ring 1 */}
                                <Animated.View
                                    style={[
                                        styles.rippleRing,
                                        {
                                            transform: [{ scale: ring1Scale }],
                                            opacity: ring1Opacity,
                                        }
                                    ]}
                                />
                                {/* Ripple Ring 2 */}
                                <Animated.View
                                    style={[
                                        styles.rippleRing,
                                        {
                                            transform: [{ scale: ring2Scale }],
                                            opacity: ring2Opacity,
                                        }
                                    ]}
                                />
                                {/* Ripple Ring 3 */}
                                <Animated.View
                                    style={[
                                        styles.rippleRing,
                                        {
                                            transform: [{ scale: ring3Scale }],
                                            opacity: ring3Opacity,
                                        }
                                    ]}
                                />

                                {/* Center Glow */}
                                <Animated.View
                                    style={[
                                        styles.avatarGlow,
                                        { opacity: glowAnim }
                                    ]}
                                />

                                {/* Rotating Gradient */}
                                <Animated.View style={[styles.radarSpinner, { transform: [{ rotate: spin }] }]}>
                                    <LinearGradient
                                        colors={[Colors.primary, '#F59E0B', 'transparent']}
                                        style={styles.radarGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                </Animated.View>

                                {/* Avatar */}
                                <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
                                    <Image
                                        source={{ uri: myAvatar }}
                                        style={styles.myAvatar}
                                    />
                                </Animated.View>
                            </View>

                            <Text style={[styles.searchingTitle, { color: textColor }]}>Mencari Lawan...</Text>
                            <Text style={[styles.searchingStep, { color: mutedColor }]}>{MATCHMAKING_STEPS[searchStep]}</Text>

                            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                                <Text style={styles.cancelBtnText}>Batalkan</Text>
                            </TouchableOpacity>
                        </View>
                    ) : opponents.length > 0 ? (
                        // 3. Match Found State with Opponent Selection
                        <View style={styles.matchFoundState}>
                            <Text style={[styles.matchFoundTitle, { color: textColor }]}>Lawan Ditemukan!</Text>
                            <Text style={[styles.matchFoundSub, { color: mutedColor }]}>Pilih lawan dan format pertandingan</Text>

                            {/* Opponent Selection Cards */}
                            <View style={styles.opponentSelectionContainer}>
                                <Text style={[styles.sectionLabel, { color: mutedColor }]}>PILIH LAWAN</Text>
                                <View style={styles.opponentCards}>
                                    {opponents.map((opp, index) => (
                                        <TouchableOpacity
                                            key={opp.id}
                                            style={[
                                                styles.opponentCard,
                                                { backgroundColor: cardColor },
                                                selectedOpponentIndex === index && styles.opponentCardSelected,
                                            ]}
                                            onPress={() => setSelectedOpponentIndex(index)}
                                        >
                                            <Image
                                                source={{ uri: opp.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(opp.name)}&background=random` }}
                                                style={styles.opponentCardAvatar}
                                            />
                                            <Text style={[styles.opponentCardName, { color: textColor }]} numberOfLines={1}>{opp.name}</Text>
                                            <Text style={[styles.opponentCardRating, { color: mutedColor }]}>MR {opp.rating_mr}</Text>
                                            {selectedOpponentIndex === index && (
                                                <View style={styles.selectedBadge}>
                                                    <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Best Of Selector */}
                            <View style={styles.bestOfContainer}>
                                <Text style={[styles.sectionLabel, { color: mutedColor }]}>FORMAT PERTANDINGAN</Text>
                                <View style={styles.bestOfButtons}>
                                    {[2, 3, 5].map((num) => (
                                        <TouchableOpacity
                                            key={num}
                                            style={[
                                                styles.bestOfBtn,
                                                { backgroundColor: cardColor },
                                                bestOf === num && styles.bestOfBtnActive,
                                            ]}
                                            onPress={() => setBestOf(num)}
                                        >
                                            <Text style={[styles.bestOfBtnNum, bestOf === num && styles.bestOfBtnNumActive]}>{num}</Text>
                                            <Text style={[styles.bestOfBtnText, { color: bestOf === num ? Colors.primary : mutedColor }]}>Set</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Match Info */}
                            <View style={[styles.matchInfoCard, { backgroundColor: cardColor }]}>
                                <View style={styles.matchInfoRow}>
                                    <MaterialIcons name="emoji-events" size={20} color={mutedColor} />
                                    <Text style={[styles.matchInfoText, { color: textColor }]}>
                                        {matchType === "RANKED" ? "Ranked Match" : "Casual Match"}
                                    </Text>
                                </View>
                                <View style={styles.matchInfoRow}>
                                    <MaterialIcons name="timer" size={20} color={mutedColor} />
                                    <Text style={[styles.matchInfoText, { color: textColor }]}>Best of {bestOf} Sets</Text>
                                </View>
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
        width: 220,
        height: 220,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 40,
    },
    rippleRing: {
        position: "absolute",
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: Colors.primary,
        backgroundColor: "transparent",
    },
    avatarGlow: {
        position: "absolute",
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 10,
    },
    radarSpinner: {
        position: "absolute",
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    radarGradient: {
        flex: 1,
        borderRadius: 80,
        opacity: 0.3,
    },
    avatarWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#fff",
        padding: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    myAvatar: {
        width: "100%",
        height: "100%",
        borderRadius: 33,
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
        marginBottom: 8,
    },
    matchFoundSub: {
        fontSize: 14,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 1,
        marginBottom: 12,
    },
    opponentSelectionContainer: {
        width: "100%",
        marginBottom: 24,
    },
    opponentCards: {
        flexDirection: "row",
        gap: 12,
    },
    opponentCard: {
        flex: 1,
        alignItems: "center",
        padding: 16,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: "transparent",
        position: "relative",
    },
    opponentCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: "rgba(0, 150, 136, 0.05)",
    },
    opponentCardAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginBottom: 8,
    },
    opponentCardName: {
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 4,
    },
    opponentCardRating: {
        fontSize: 10,
    },
    selectedBadge: {
        position: "absolute",
        top: 8,
        right: 8,
    },
    bestOfContainer: {
        width: "100%",
        marginBottom: 24,
    },
    bestOfButtons: {
        flexDirection: "row",
        gap: 12,
    },
    bestOfBtn: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "transparent",
    },
    bestOfBtnActive: {
        borderColor: Colors.primary,
        backgroundColor: "rgba(0, 150, 136, 0.05)",
    },
    bestOfBtnNum: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.muted,
    },
    bestOfBtnNumActive: {
        color: Colors.primary,
    },
    bestOfBtnText: {
        fontSize: 12,
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
