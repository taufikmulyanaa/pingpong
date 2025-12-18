import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    Animated,
    Easing,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { Colors, GripStyles, PlayStyles, SharedStyles, ExtendedColors, BorderRadius } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";

// Mock data removed

// Radar animation component
const RadarView = () => {
    const spinValue = React.useRef(new Animated.Value(0)).current;
    const pulseValue = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseValue, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <View style={styles.radarContainer}>
            {/* Pulse rings */}
            {[0.3, 0.6, 0.9].map((scale, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.radarRing,
                        {
                            width: 48 + 80 * (index + 1),
                            height: 48 + 80 * (index + 1),
                            opacity: pulseValue.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.3, 0.1, 0],
                            }),
                            transform: [
                                {
                                    scale: pulseValue.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1.2],
                                    }),
                                },
                            ],
                        },
                    ]}
                />
            ))}

            {/* Center avatar */}
            <View style={styles.radarCenter}>
                <Image
                    source={{ uri: "https://ui-avatars.com/api/?name=Me&background=009688&color=fff" }}
                    style={styles.radarAvatar}
                />
            </View>

            {/* Scanning text */}
            <View style={styles.scanningBadge}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <MaterialIcons name="sync" size={14} color={Colors.primary} />
                </Animated.View>
                <Text style={styles.scanningText}>Memindai area sekitar...</Text>
            </View>
        </View>
    );
};

// Player card component
const PlayerCard = ({
    player,
    distance,
    onInvite,
    onProfile
}: {
    player: Partial<Profile>;
    distance: number;
    onInvite: () => void;
    onProfile: () => void;
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const getStatusColor = () => {
        if (player.is_online) return "#10B981";
        return "#9CA3AF";
    };

    return (
        <View style={[styles.playerCard, { backgroundColor: cardColor }]}>
            <View style={styles.playerInfo}>
                <View style={styles.playerAvatar}>
                    <Image
                        source={{ uri: player.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "User")}&background=random` }}
                        style={styles.playerImage}
                    />
                    <View style={[styles.mrBadge, { backgroundColor: player.rating_mr! > 1400 ? Colors.accent : "#E5E7EB" }]}>
                        <Text style={styles.mrBadgeText}>MR {player.rating_mr}</Text>
                    </View>
                </View>

                <View style={styles.playerDetails}>
                    <View style={styles.playerHeader}>
                        <View>
                            <Text style={[styles.playerName, { color: textColor }]}>{player.name}</Text>
                            <View style={styles.locationRow}>
                                <MaterialIcons name="near-me" size={12} color={mutedColor} />
                                <Text style={[styles.locationText, { color: mutedColor }]}>
                                    {distance.toFixed(1)} km • {player.city}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                    </View>

                    <View style={styles.styleTags}>
                        <View style={styles.styleTag}>
                            <Text style={styles.styleTagText}>
                                {GripStyles[player.grip_style as keyof typeof GripStyles]}
                            </Text>
                        </View>
                        <View style={styles.styleTag}>
                            <Text style={styles.styleTagText}>
                                {PlayStyles[player.play_style as keyof typeof PlayStyles]}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.playerActions}>
                <TouchableOpacity
                    style={[styles.profileBtn, { borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                    onPress={onProfile}
                >
                    <Text style={[styles.profileBtnText, { color: textColor }]}>Profil</Text>
                </TouchableOpacity>

                {player.is_online ? (
                    <TouchableOpacity style={styles.inviteBtn} onPress={onInvite}>
                        <MaterialIcons name="sports-tennis" size={16} color="#fff" />
                        <Text style={styles.inviteBtnText}>Undang Main</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.notifyBtn, { borderColor: isDark ? "#374151" : "#E5E7EB" }]}>
                        <MaterialIcons name="notifications-active" size={16} color={mutedColor} />
                        <Text style={[styles.notifyBtnText, { color: mutedColor }]}>Beritahu saat online</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function CariScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { profile } = useAuthStore();

    const [distance, setDistance] = useState(15);
    const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "pro">("intermediate");
    const [players, setPlayers] = useState<Partial<Profile>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPlayers = async () => {
        if (!profile?.id) return;

        setIsLoading(true);
        try {
            let minMR = 0;
            let maxMR = 9999;

            switch (skillLevel) {
                case "beginner":
                    minMR = 800;
                    maxMR = 1200;
                    break;
                case "intermediate":
                    minMR = 1200;
                    maxMR = 1600;
                    break;
                case "pro":
                    minMR = 1600;
                    maxMR = 9999;
                    break;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .neq("id", profile.id) // Exclude current user
                .gte("rating_mr", minMR)
                .lte("rating_mr", maxMR)
                .limit(20);

            if (error) {
                console.error("Error fetching players:", error);
                setPlayers([]);
            } else if (data && data.length > 0) {
                setPlayers(data);
            } else {
                setPlayers([]);
            }
        } catch (error) {
            console.error("Error:", error);
            setPlayers([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch players from Supabase based on skill level
    useEffect(() => {
        fetchPlayers();
    }, [skillLevel, profile?.id]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchPlayers();
    }, [skillLevel, profile?.id]);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const getSkillRange = () => {
        switch (skillLevel) {
            case "beginner":
                return "800 - 1200";
            case "intermediate":
                return "1200 - 1600";
            case "pro":
                return "1600+";
        }
    };

    const handleInvite = (playerId: string) => {
        router.push({
            pathname: "/challenge/new",
            params: { playerId },
        });
    };

    const handleProfile = (playerId: string) => {
        router.push({
            pathname: "/player/[id]",
            params: { id: playerId },
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cari Lawan</Text>
                <TouchableOpacity style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <MaterialIcons name="notifications" size={22} color="#fff" />
                    <View style={styles.notificationDot} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
            >
                {/* Radar Section */}
                <View style={[styles.radarSection, { backgroundColor: cardColor }]}>
                    <RadarView />

                    {/* Filters */}
                    <View style={styles.filters}>
                        {/* Distance */}
                        <View style={styles.filterItem}>
                            <View style={styles.filterHeader}>
                                <Text style={[styles.filterLabel, { color: Colors.darkblue }]}>Jarak Maksimal</Text>
                                <View style={[styles.filterValue, { backgroundColor: `${Colors.primary}20` }]}>
                                    <Text style={[styles.filterValueText, { color: Colors.primary }]}>{distance} km</Text>
                                </View>
                            </View>
                            <Slider
                                style={styles.slider}
                                minimumValue={1}
                                maximumValue={50}
                                value={distance}
                                onValueChange={setDistance}
                                minimumTrackTintColor={Colors.primary}
                                maximumTrackTintColor={isDark ? "#374151" : "#E5E7EB"}
                                thumbTintColor={Colors.primary}
                            />
                            <View style={styles.sliderLabels}>
                                <Text style={[styles.sliderLabel, { color: mutedColor }]}>1 km</Text>
                                <Text style={[styles.sliderLabel, { color: mutedColor }]}>50 km</Text>
                            </View>
                        </View>

                        {/* Skill Range */}
                        <View style={styles.filterItem}>
                            <View style={styles.filterHeader}>
                                <Text style={[styles.filterLabel, { color: Colors.darkblue }]}>Rentang Skill (MR)</Text>
                                <View style={[styles.filterValue, { backgroundColor: `${Colors.secondary}20` }]}>
                                    <Text style={[styles.filterValueText, { color: Colors.secondary }]}>{getSkillRange()}</Text>
                                </View>
                            </View>
                            <View style={styles.skillButtons}>
                                {(["beginner", "intermediate", "pro"] as const).map((level) => (
                                    <TouchableOpacity
                                        key={level}
                                        style={[
                                            styles.skillBtn,
                                            {
                                                borderColor: skillLevel === level ? Colors.primary : (isDark ? "#374151" : "#E5E7EB"),
                                                backgroundColor: skillLevel === level ? `${Colors.primary}10` : cardColor,
                                            },
                                        ]}
                                        onPress={() => setSkillLevel(level)}
                                    >
                                        <Text
                                            style={[
                                                styles.skillBtnText,
                                                {
                                                    color: skillLevel === level ? Colors.primary : mutedColor,
                                                    fontWeight: skillLevel === level ? "bold" : "500",
                                                },
                                            ]}
                                        >
                                            {level === "beginner" ? "Pemula" : level === "intermediate" ? "Menengah" : "Pro"}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Results */}
                <View style={styles.results}>
                    <View style={styles.resultsHeader}>
                        <Text style={[styles.resultsTitle, { color: Colors.darkblue }]}>Ditemukan</Text>
                        <View style={styles.resultsBadge}>
                            <Text style={styles.resultsBadgeText}>{players.length} Lawan</Text>
                        </View>
                    </View>

                    {players.length > 0 ? (
                        players.map((player, index) => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                distance={2.4 + index * 1.7} // Placeholder distance
                                onInvite={() => handleInvite(player.id!)}
                                onProfile={() => handleProfile(player.id!)}
                            />
                        ))
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="person-search" size={48} color={mutedColor} />
                            <Text style={[styles.emptyStateText, { color: mutedColor }]}>
                                Tidak ada pemain ditemukan dalam kriteria ini
                            </Text>
                        </View>
                    )}
                </View>

                {/* Bottom padding */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Filter FAB */}
            <TouchableOpacity style={styles.filterFab}>
                <MaterialIcons name="filter-list" size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
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
    locationBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    locationBadgeText: {
        fontSize: 12,
    },
    notificationBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    notificationDot: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#EF4444",
        borderWidth: 2,
        borderColor: "#fff",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: 20,
    },
    radarSection: {
        marginHorizontal: 20,
        marginTop: 24,
        borderRadius: 16,
        padding: 16,
    },
    radarContainer: {
        height: 192,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        marginBottom: 20,
        backgroundColor: "rgba(0,16,100,0.05)",
        borderRadius: 16,
        overflow: "hidden",
    },
    radarRing: {
        position: "absolute",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    radarCenter: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: "#fff",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    radarAvatar: {
        width: "100%",
        height: "100%",
    },
    scanningBadge: {
        position: "absolute",
        bottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    scanningText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: "500",
    },
    filters: {
        gap: 20,
    },
    filterItem: {},
    filterHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
    filterValue: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    filterValueText: {
        fontSize: 14,
        fontWeight: "bold",
    },
    slider: {
        width: "100%",
        height: 40,
    },
    sliderLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: -8,
    },
    sliderLabel: {
        fontSize: 10,
    },
    skillButtons: {
        flexDirection: "row",
        gap: 8,
    },
    skillBtn: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: "center",
    },
    skillBtnText: {
        fontSize: 12,
    },
    results: {
        paddingHorizontal: 20,
        marginTop: 24,
    },
    resultsHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    resultsBadge: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    resultsBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
    },
    playerCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    playerInfo: {
        flexDirection: "row",
        gap: 16,
    },
    playerAvatar: {
        position: "relative",
    },
    playerImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
    },
    mrBadge: {
        position: "absolute",
        bottom: -8,
        right: -8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#fff",
    },
    mrBadgeText: {
        fontSize: 10,
        fontWeight: "bold",
        color: Colors.darkblue,
    },
    playerDetails: {
        flex: 1,
    },
    playerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    playerName: {
        fontSize: 16,
        fontWeight: "bold",
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    locationText: {
        fontSize: 12,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: "#fff",
    },
    styleTags: {
        flexDirection: "row",
        gap: 6,
        marginTop: 12,
    },
    styleTag: {
        backgroundColor: "rgba(0,0,0,0.05)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    styleTagText: {
        fontSize: 10,
        fontWeight: "500",
    },
    playerActions: {
        flexDirection: "row",
        gap: 8,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
    },
    profileBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
    },
    profileBtnText: {
        fontSize: 14,
        fontWeight: "500",
    },
    inviteBtn: {
        flex: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    inviteBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    notifyBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    notifyBtnText: {
        fontSize: 12,
        fontWeight: "500",
    },
    filterFab: {
        position: "absolute",
        bottom: 100,
        right: 20,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.darkblue,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: Colors.darkblue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        borderRadius: 16,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: "center",
        paddingHorizontal: 20,
    },
});
