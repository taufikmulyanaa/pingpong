import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    RefreshControl,
    Platform,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { Colors, GripStyles, PlayStyles, SharedStyles, ExtendedColors, BorderRadius } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { MapComponent } from "@/components/MapComponent";
import { LinearGradient } from 'expo-linear-gradient';

// Real Map View wrapper - uses platform-specific MapComponent
const RealMapView = ({
    userLocation,
    players,
    distance,
    onPlayerPress
}: {
    userLocation: { latitude: number; longitude: number } | null;
    players: Partial<Profile>[];
    distance: number;
    onPlayerPress: (playerId: string) => void;
}) => {
    return (
        <View style={styles.radarContainer}>
            <MapComponent
                userLocation={userLocation}
                players={players}
                distance={distance}
                onPlayerPress={onPlayerPress}
                showPlayersMode={true}
            />
            {/* Overlay Gradient for "Radar" effect style (optional, kept simple for now) */}
            <View style={styles.mapOverlay} pointerEvents="none" />
        </View>
    );
};

// Player card component - Refined
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

    const getStatusColor = () => {
        if (player.is_online) return "#10B981";
        return "#9CA3AF";
    };

    return (
        <View style={styles.playerCard}>
            <View style={styles.playerInfo}>
                <View style={styles.playerAvatar}>
                    <Image
                        source={{ uri: player.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || "User")}&background=random` }}
                        style={styles.playerImage}
                    />
                    {/* MR Badge Floating */}
                    <View style={styles.mrBadge}>
                        <Text style={styles.mrBadgeText}>{player.rating_mr}</Text>
                    </View>
                </View>

                <View style={styles.playerDetails}>
                    <View style={styles.playerHeader}>
                        <View>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <View style={styles.locationRow}>
                                <MaterialIcons name="location-on" size={12} color={Colors.muted} />
                                <Text style={styles.locationText}>
                                    {distance.toFixed(1)} km • {player.city || 'Unknown'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                    </View>

                    <View style={styles.styleTags}>
                        {player.play_style && (
                            <View style={styles.styleTag}>
                                <Text style={styles.styleTagText}>
                                    {PlayStyles[player.play_style as keyof typeof PlayStyles]}
                                </Text>
                            </View>
                        )}

                    </View>
                </View>
            </View>

            <View style={styles.playerActions}>
                <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={onProfile}
                >
                    <Text style={styles.profileBtnText}>Lihat Profil</Text>
                </TouchableOpacity>

                {player.is_online ? (
                    <TouchableOpacity style={styles.inviteBtn} onPress={onInvite}>
                        <Text style={styles.inviteBtnText}>Undang Main</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.notifyBtn}>
                        <MaterialIcons name="notifications-none" size={16} color={Colors.muted} />
                        <Text style={styles.notifyBtnText}>Ingatkan</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function CariScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();

    const [distance, setDistance] = useState(15);
    const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "pro">("beginner");
    const [players, setPlayers] = useState<Partial<Profile>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    // Entrance animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Auto-select skill level based on user's MR rating
    useEffect(() => {
        if (profile?.rating_mr) {
            const mr = profile.rating_mr;
            if (mr >= 1600) {
                setSkillLevel("pro");
            } else if (mr >= 1200) {
                setSkillLevel("intermediate");
            } else {
                setSkillLevel("beginner");
            }
        }
    }, [profile?.rating_mr]);

    // Get user location
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        })();

    }, []);

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

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

            // Build query - prioritize online users and those with location
            let query = supabase
                .from("profiles")
                .select("*")
                .neq("id", profile.id) // Exclude current user
                .gte("rating_mr", minMR)
                .lte("rating_mr", maxMR)
                .order("is_online", { ascending: false }) // Online users first
                .order("last_active_at", { ascending: false, nullsFirst: false }) // Recently active next
                .limit(50); // Get more to filter by distance

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching players:", error);
                setPlayers([]);
            } else if (data && data.length > 0) {
                // Filter by distance if user location is available
                const typedData = data as Profile[];
                let filteredPlayers: (Profile & { _distance?: number })[];

                if (userLocation) {
                    filteredPlayers = typedData
                        .map(player => {
                            // Calculate distance if player has location
                            let playerDistance = 999; // Default far distance
                            if (player.latitude && player.longitude) {
                                playerDistance = calculateDistance(
                                    userLocation.latitude,
                                    userLocation.longitude,
                                    player.latitude,
                                    player.longitude
                                );
                            }
                            return { ...player, _distance: playerDistance };
                        })
                        .filter(player => player._distance! <= distance) // Filter by max distance
                        .sort((a, b) => {
                            // Sort: online first, then by distance
                            if (a.is_online && !b.is_online) return -1;
                            if (!a.is_online && b.is_online) return 1;
                            return (a._distance || 999) - (b._distance || 999);
                        })
                        .slice(0, 20); // Limit results
                } else {
                    // No user location, just sort by online status
                    filteredPlayers = typedData
                        .sort((a, b) => {
                            if (a.is_online && !b.is_online) return -1;
                            if (!a.is_online && b.is_online) return 1;
                            return 0;
                        })
                        .slice(0, 20);
                }

                setPlayers(filteredPlayers);
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

    // Fetch players from Supabase based on skill level, distance and location
    useEffect(() => {
        fetchPlayers();
    }, [skillLevel, profile?.id, distance, userLocation]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchPlayers();
    }, [skillLevel, profile?.id, distance, userLocation]);

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

    // Premium Colors
    const bgColor = '#FFFFFF'; // Soft Slate
    const cardColor = '#FFFFFF';
    const textColor = Colors.secondary;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header with LinearGradient */}
            <LinearGradient
                colors={[Colors.secondary, '#000830']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <SafeAreaView edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                            <MaterialIcons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Cari Lawan</Text>
                        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                            <MaterialIcons name="tune" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {/* Map Section - Floating Card */}
                    <View style={[styles.radarSection, { backgroundColor: cardColor }]}>
                        <RealMapView
                            userLocation={userLocation}
                            players={players}
                            distance={distance}
                            onPlayerPress={handleProfile}
                        />

                        {/* Filters */}
                        <View style={styles.filters}>
                            {/* Distance Slider */}
                            <View style={styles.filterItem}>
                                <View style={styles.filterHeader}>
                                    <Text style={styles.filterLabel}>Jarak Maksimal</Text>
                                    <View style={styles.filterValueBadge}>
                                        <Text style={styles.filterValueText}>{distance} km</Text>
                                    </View>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={1}
                                    maximumValue={50}
                                    value={distance}
                                    onValueChange={setDistance}
                                    minimumTrackTintColor={Colors.primary}
                                    maximumTrackTintColor={'#E2E8F0'}
                                    thumbTintColor={Colors.primary}
                                />
                            </View>

                            {/* Skill Range */}
                            <View style={styles.filterItem}>
                                <View style={styles.filterHeader}>
                                    <Text style={styles.filterLabel}>Rating (MR)</Text>
                                    <View style={[styles.filterValueBadge, { backgroundColor: '#EEF2FF' }]}>
                                        <Text style={[styles.filterValueText, { color: '#4F46E5' }]}>{getSkillRange()}</Text>
                                    </View>
                                </View>
                                <View style={styles.skillButtons}>
                                    {(["beginner", "intermediate", "pro"] as const).map((level) => (
                                        <TouchableOpacity
                                            key={level}
                                            style={[
                                                styles.skillBtn,
                                                skillLevel === level && styles.skillBtnActive
                                            ]}
                                            onPress={() => setSkillLevel(level)}
                                        >
                                            <Text
                                                style={[
                                                    styles.skillBtnText,
                                                    skillLevel === level && styles.skillBtnTextActive
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
                            <Text style={styles.resultsTitle}>Ditemukan</Text>
                            <View style={styles.resultsBadge}>
                                <Text style={styles.resultsBadgeText}>{players.length} Pemain</Text>
                            </View>
                        </View>

                        {players.length > 0 ? (
                            players.map((player) => (
                                <PlayerCard
                                    key={player.id}
                                    player={player}
                                    distance={(player as any)._distance || 0}
                                    onInvite={() => handleInvite(player.id!)}
                                    onProfile={() => handleProfile(player.id!)}
                                />
                            ))
                        ) : (
                            <View style={[styles.emptyState, { backgroundColor: cardColor }]}>
                                <MaterialIcons name="person-search" size={48} color={Colors.muted} />
                                <Text style={styles.emptyStateText}>
                                    Tidak ada pemain ditemukan dalam kriteria ini
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Bottom padding */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 12,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: "#fff",
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: 20,
    },
    radarSection: {
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 24,
        padding: 16,
        // Soft Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    radarContainer: {
        height: 180,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },

    // Filters
    filters: {
        gap: 20,
    },
    filterItem: {
        gap: 8,
    },
    filterHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    filterLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: Colors.secondary,
    },
    filterValueBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: '#F0FDF4',
    },
    filterValueText: {
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        color: '#15803D',
    },
    slider: {
        width: "100%",
        height: 40,
    },
    skillButtons: {
        flexDirection: "row",
        gap: 8,
    },
    skillBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: "center",
        backgroundColor: '#F8FAFC',
    },
    skillBtnActive: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
    },
    skillBtnText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
    },
    skillBtnTextActive: {
        color: Colors.primary,
        fontFamily: 'Inter-SemiBold',
    },

    // Results
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
        fontFamily: 'Outfit-Bold',
        color: Colors.secondary,
    },
    resultsBadge: {
        backgroundColor: Colors.secondary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    resultsBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontFamily: 'Inter-Bold',
    },

    // Player Card
    playerCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        // Card Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    playerInfo: {
        flexDirection: "row",
        gap: 16,
    },
    playerAvatar: {
        position: "relative",
    },
    playerImage: {
        width: 60,
        height: 60,
        borderRadius: 20,
    },
    mrBadge: {
        position: "absolute",
        bottom: -6,
        right: -6,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#fff",
    },
    mrBadgeText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
        color: '#fff',
    },
    playerDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    playerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    playerName: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Colors.secondary,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    locationText: {
        fontSize: 11,
        fontFamily: 'Inter-Regular',
        color: Colors.muted,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    styleTags: {
        flexDirection: "row",
        gap: 6,
        marginTop: 8,
    },
    styleTag: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    styleTagText: {
        fontSize: 10,
        fontFamily: 'Inter-Medium',
        color: Colors.secondary,
    },

    // Player Actions
    playerActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    profileBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: "center",
    },
    profileBtnText: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
    },
    inviteBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    inviteBtnText: {
        color: "#fff",
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
    },
    notifyBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        backgroundColor: '#F8FAFC',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: 'center',
    },
    notifyBtnText: {
        color: Colors.muted,
        fontSize: 13,
        fontFamily: 'Inter-Medium',
    },

    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        borderRadius: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    emptyStateText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        textAlign: "center",
        paddingHorizontal: 20,
        color: Colors.muted,
    },
});
