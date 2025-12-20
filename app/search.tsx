import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    RefreshControl,
    Platform,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { Colors, GripStyles, PlayStyles, ExtendedColors, BorderRadius } from "../src/lib/constants";
import { supabase } from "../src/lib/supabase";
import { Profile } from "../src/types/database";
import { useAuthStore } from "../src/stores/authStore";
import { MapComponent } from "../src/components/MapComponent";
import { LinearGradient } from 'expo-linear-gradient';

// Real Map View wrapper
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
            <View style={styles.mapOverlay} pointerEvents="none" />
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
                                <Text style={styles.styleTagText}>{player.play_style}</Text>
                            </View>
                        )}
                        {player.grip_style && (
                            <View style={styles.styleTag}>
                                <Text style={styles.styleTagText}>{player.grip_style}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.playerActions}>
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

export default function SearchScreen() {
    const router = useRouter();
    const { profile } = useAuthStore();

    const [distance, setDistance] = useState(15);
    const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "pro">("beginner");
    const [players, setPlayers] = useState<Partial<Profile>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
                .neq("id", profile.id)
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

    useEffect(() => {
        fetchPlayers();
    }, [profile?.id, skillLevel]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchPlayers();
    };

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

    const getRandomDistance = () => {
        return Math.random() * distance;
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

    const bgColor = '#FFFFFF';
    const cardColor = '#FFFFFF';
    const textColor = Colors.secondary;
    const mutedColor = Colors.muted;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                {/* Header */}
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

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {/* Radar Section */}
                    <View style={styles.radarSection}>
                        <RealMapView
                            userLocation={userLocation}
                            players={players}
                            distance={distance}
                            onPlayerPress={handleProfile}
                        />
                    </View>

                    {/* Distance Slider */}
                    <View style={[styles.filterCard, { backgroundColor: cardColor }]}>
                        <View style={styles.filterHeader}>
                            <Text style={[styles.filterLabel, { color: textColor }]}>Jarak Pencarian</Text>
                            <Text style={[styles.filterValue, { color: Colors.primary }]}>{distance} km</Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={50}
                            value={distance}
                            onValueChange={(val) => setDistance(Math.round(val))}
                            minimumTrackTintColor={Colors.primary}
                            maximumTrackTintColor="#E5E7EB"
                            thumbTintColor={Colors.primary}
                        />
                    </View>

                    {/* Skill Level Tabs */}
                    <View style={styles.skillTabs}>
                        {[
                            { key: "beginner", label: "Pemula", range: "800-1200" },
                            { key: "intermediate", label: "Menengah", range: "1200-1600" },
                            { key: "pro", label: "Pro", range: "1600+" },
                        ].map((tab) => (
                            <TouchableOpacity
                                key={tab.key}
                                style={[
                                    styles.skillTab,
                                    skillLevel === tab.key && styles.skillTabActive,
                                ]}
                                onPress={() => setSkillLevel(tab.key as any)}
                            >
                                <Text style={[
                                    styles.skillTabLabel,
                                    skillLevel === tab.key && styles.skillTabLabelActive
                                ]}>
                                    {tab.label}
                                </Text>
                                <Text style={[
                                    styles.skillTabRange,
                                    skillLevel === tab.key && styles.skillTabRangeActive
                                ]}>
                                    MR {tab.range}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Players List */}
                    <View style={styles.playersSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>
                                Pemain Terdekat
                            </Text>
                            <Text style={styles.playerCount}>{players.length} ditemukan</Text>
                        </View>

                        {players.length > 0 ? (
                            players.map((player) => (
                                <PlayerCard
                                    key={player.id}
                                    player={player}
                                    distance={getRandomDistance()}
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

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </>
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
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
    },
    radarSection: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    radarContainer: {
        height: 200,
        borderRadius: 20,
        overflow: "hidden",
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
    },
    filterCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
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
        fontSize: 16,
        fontWeight: "bold",
    },
    slider: {
        width: "100%",
        height: 40,
    },
    skillTabs: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 20,
    },
    skillTab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
    },
    skillTabActive: {
        backgroundColor: Colors.primary,
    },
    skillTabLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.muted,
    },
    skillTabLabelActive: {
        color: "#fff",
    },
    skillTabRange: {
        fontSize: 10,
        color: Colors.muted,
        marginTop: 2,
    },
    skillTabRangeActive: {
        color: "rgba(255,255,255,0.8)",
    },
    playersSection: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    playerCount: {
        fontSize: 12,
        color: Colors.muted,
    },
    playerCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    playerInfo: {
        flexDirection: "row",
        marginBottom: 12,
    },
    playerAvatar: {
        position: "relative",
        marginRight: 12,
    },
    playerImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    mrBadge: {
        position: "absolute",
        bottom: -4,
        right: -4,
        backgroundColor: Colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#fff",
    },
    mrBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
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
        color: Colors.secondary,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },
    locationText: {
        fontSize: 12,
        color: Colors.muted,
        marginLeft: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    styleTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 8,
    },
    styleTag: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    styleTagText: {
        fontSize: 11,
        color: Colors.muted,
    },
    playerActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    inviteBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    inviteBtnText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    notifyBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.muted,
    },
    notifyBtnText: {
        color: Colors.muted,
        fontSize: 13,
    },
    emptyState: {
        padding: 40,
        borderRadius: 16,
        alignItems: "center",
    },
    emptyStateText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.muted,
        textAlign: "center",
    },
});
