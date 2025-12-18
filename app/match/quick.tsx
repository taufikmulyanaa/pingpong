import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Image,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";
import { LinearGradient } from "expo-linear-gradient";

// Mock AI Logic
const MATCHMAKING_STEPS = [
    "Menganalisis skill level...",
    "Mencari lawan seimbang...",
    "Memeriksa ping & koneksi...",
    "Menemukan lawan potensial...",
];

export default function QuickMatchScreen() {
    const router = useRouter();
    const [isSearching, setIsSearching] = useState(false);
    const [searchStep, setSearchStep] = useState(0);
    const [matchFound, setMatchFound] = useState<boolean>(false);

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

            // Step progression
            const stepInterval = setInterval(() => {
                setSearchStep((prev) => {
                    if (prev >= MATCHMAKING_STEPS.length - 1) {
                        clearInterval(stepInterval);
                        setTimeout(() => {
                            setMatchFound(true);
                            setIsSearching(false);
                        }, 1000);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1500);

            return () => clearInterval(stepInterval);
        } else {
            pulseAnim.setValue(1);
            rotateAnim.setValue(0);
        }
    }, [isSearching]);

    const handleStartSearch = () => {
        setIsSearching(true);
        setSearchStep(0);
        setMatchFound(false);
    };

    const handleCancel = () => {
        setIsSearching(false);
        setSearchStep(0);
        pulseAnim.stopAnimation();
        rotateAnim.stopAnimation();
    };

    const handleAcceptMatch = () => {
        // Navigate to match detail (simulated)
        router.replace("/match/demo-match");
    };

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

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
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    {!isSearching && !matchFound ? (
                        // 1. Initial State: Mode Selection
                        <View style={styles.modeSelection}>
                            <View style={styles.heroSection}>
                                <MaterialIcons name="flash-on" size={80} color="#F59E0B" />
                                <Text style={[styles.heroTitle, { color: textColor }]}>AI Matchmaking</Text>
                                <Text style={[styles.heroDesc, { color: mutedColor }]}>
                                    Sistem akan mencarikan lawan yang seimbang berdasarkan MR rating dan performa terakhirmu.
                                </Text>
                            </View>

                            <View style={styles.modeOptions}>
                                <TouchableOpacity
                                    style={[styles.modeCard, { backgroundColor: cardColor, borderColor: "#F59E0B", borderWidth: 2 }]}
                                    onPress={handleStartSearch}
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
                                    onPress={handleStartSearch}
                                >
                                    <View style={[styles.modeIcon, { backgroundColor: "#EFF6FF" }]}>
                                        <MaterialIcons name="sports-tennis" size={32} color={Colors.blueMid} />
                                    </View>
                                    <View style={styles.modeInfo}>
                                        <Text style={[styles.modeTitle, { color: textColor }]}>Casual Match</Text>
                                        <Text style={[styles.modeSub, { color: mutedColor }]}>Latihan tanpa risiko MR</Text>
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
                                    source={{ uri: "https://ui-avatars.com/api/?name=Me&background=random" }}
                                    style={styles.myAvatar}
                                />
                            </View>

                            <Text style={[styles.searchingTitle, { color: textColor }]}>Mencari Lawan...</Text>
                            <Text style={[styles.searchingStep, { color: mutedColor }]}>{MATCHMAKING_STEPS[searchStep]}</Text>

                            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                                <Text style={styles.cancelBtnText}>Batalkan</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // 3. Match Found State
                        <View style={styles.matchFoundState}>
                            <Text style={[styles.matchFoundTitle, { color: textColor }]}>Lawan Ditemukan!</Text>

                            <View style={styles.vsContainer}>
                                <View style={styles.playerBlock}>
                                    <Image
                                        source={{ uri: "https://ui-avatars.com/api/?name=Me&background=random" }}
                                        style={styles.playerAvatarLarge}
                                    />
                                    <Text style={[styles.playerName, { color: textColor }]}>Anda</Text>
                                    <Text style={[styles.playerRating, { color: mutedColor }]}>MR 1450</Text>
                                </View>

                                <View style={styles.vsBadge}>
                                    <Text style={styles.vsText}>VS</Text>
                                </View>

                                <View style={styles.playerBlock}>
                                    <Image
                                        source={{ uri: "https://ui-avatars.com/api/?name=Budi+Santoso&background=random" }}
                                        style={styles.playerAvatarLarge}
                                    />
                                    <Text style={[styles.playerName, { color: textColor }]}>Budi S.</Text>
                                    <Text style={[styles.playerRating, { color: mutedColor }]}>MR 1420</Text>
                                </View>
                            </View>

                            <View style={[styles.matchInfoCard, { backgroundColor: cardColor }]}>
                                <View style={styles.matchInfoRow}>
                                    <MaterialIcons name="place" size={20} color={mutedColor} />
                                    <Text style={[styles.matchInfoText, { color: textColor }]}>GOR Bulungan, Meja 3</Text>
                                </View>
                                <View style={styles.matchInfoRow}>
                                    <MaterialIcons name="timer" size={20} color={mutedColor} />
                                    <Text style={[styles.matchInfoText, { color: textColor }]}>Best of 5 Sets</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.acceptBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleAcceptMatch}
                            >
                                <Text style={styles.acceptBtnText}>Terima Pertandingan</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.declineBtn} onPress={handleCancel}>
                                <Text style={[styles.declineBtnText, { color: Colors.muted }]}>Tolak</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
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
