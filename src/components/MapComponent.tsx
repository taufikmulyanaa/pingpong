// MapComponent.tsx - Cross-platform map component
// Shows fallback on web and Expo Go, real maps only in development/production builds
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Colors } from "@/lib/constants";
import { Profile } from "@/types/database";

// Check if running in Expo Go (where native modules aren't available)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

interface MapComponentProps {
    userLocation: { latitude: number; longitude: number } | null;
    players?: Partial<Profile>[];
    distance?: number;
    onPlayerPress?: (playerId: string) => void;
    venues?: any[];
    onVenuePress?: (venue: any) => void;
    selectedVenueId?: string;
    showPlayersMode?: boolean;
}

// Fallback component (used on web and Expo Go)
const MapFallback = ({
    players = [],
    distance = 15,
    venues = [],
    showPlayersMode = true,
}: Partial<MapComponentProps>) => {
    const itemCount = showPlayersMode ? players.length : venues.length;
    const itemLabel = showPlayersMode ? "pemain" : "venue";

    const message = Platform.OS === 'web'
        ? "Peta hanya tersedia di aplikasi mobile"
        : isExpoGo
            ? "Peta memerlukan Development Build.\nDownload APK untuk melihat peta."
            : "Memuat peta...";

    return (
        <View style={styles.fallbackContainer}>
            <View style={styles.fallbackContent}>
                <MaterialIcons
                    name={showPlayersMode ? "radar" : "map"}
                    size={48}
                    color={Colors.primary}
                />
                <Text style={styles.fallbackTitle}>
                    {showPlayersMode ? "Cari Lawan" : "Peta Venue"}
                </Text>
                <Text style={styles.fallbackSubtitle}>
                    {message}
                </Text>
                <Text style={styles.fallbackHint}>
                    {itemCount} {itemLabel} ditemukan dalam radius {distance} km
                </Text>
            </View>
        </View>
    );
};

// Main export - only loads maps in development/production builds (not Expo Go)
export const MapComponent = (props: MapComponentProps) => {
    // Always show fallback on web or Expo Go
    if (Platform.OS === 'web' || isExpoGo) {
        return <MapFallback {...props} />;
    }

    // Only in development/production builds: dynamically require react-native-maps
    // This code path will never execute in Expo Go
    const {
        userLocation,
        players = [],
        distance = 15,
        onPlayerPress,
        venues = [],
        onVenuePress,
        selectedVenueId,
        showPlayersMode = true,
    } = props;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: MapView, Marker, Circle, PROVIDER_GOOGLE } = require('react-native-maps');

    const mapRef = React.useRef<any>(null);

    const defaultRegion = {
        latitude: userLocation?.latitude || -6.2,
        longitude: userLocation?.longitude || 106.816666,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.mapView}
                provider={PROVIDER_GOOGLE}
                initialRegion={defaultRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {showPlayersMode && userLocation && (
                    <Circle
                        center={userLocation}
                        radius={distance * 1000}
                        strokeColor="rgba(65, 105, 225, 0.5)"
                        fillColor="rgba(65, 105, 225, 0.1)"
                        strokeWidth={2}
                    />
                )}

                {showPlayersMode && players
                    .filter(player => player.latitude && player.longitude) // Only show players with valid location
                    .map((player) => {
                        return (
                            <Marker
                                key={player.id}
                                coordinate={{ latitude: player.latitude!, longitude: player.longitude! }}
                                title={player.name || "Player"}
                                description={`MR ${player.rating_mr}${player.is_online ? ' • Online' : ''}`}
                                onPress={() => onPlayerPress?.(player.id!)}
                            >
                                <View style={[styles.playerMarker, { backgroundColor: player.is_online ? "#10B981" : Colors.primary }]}>
                                    <MaterialIcons name="person" size={16} color="#fff" />
                                </View>
                            </Marker>
                        );
                    })}

                {!showPlayersMode && venues.map((venue) => (
                    <Marker
                        key={venue.id}
                        coordinate={{
                            latitude: venue.latitude || -6.2,
                            longitude: venue.longitude || 106.816666,
                        }}
                        title={venue.name}
                        description={venue.address}
                        onPress={() => onVenuePress?.(venue)}
                    >
                        <View style={[styles.venueMarker, { backgroundColor: selectedVenueId === venue.id ? Colors.primary : "#EF4444" }]}>
                            <MaterialIcons name="sports-tennis" size={16} color="#fff" />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {showPlayersMode && players.length === 0 && (
                <View style={styles.scanningBadge}>
                    <MaterialIcons name="sync" size={14} color={Colors.primary} />
                    <Text style={styles.scanningText}>Memindai area sekitar...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "relative",
    },
    mapView: {
        width: "100%",
        height: "100%",
    },
    playerMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    venueMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    scanningBadge: {
        position: "absolute",
        bottom: 12,
        alignSelf: "center",
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
    fallbackContainer: {
        flex: 1,
        backgroundColor: "rgba(0,16,100,0.05)",
        borderRadius: 16,
    },
    fallbackContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    fallbackTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.darkblue,
        marginTop: 12,
    },
    fallbackSubtitle: {
        fontSize: 14,
        color: Colors.muted,
        marginTop: 8,
        textAlign: "center",
    },
    fallbackHint: {
        fontSize: 12,
        color: Colors.primary,
        marginTop: 4,
        fontWeight: "500",
    },
});

export default MapComponent;
