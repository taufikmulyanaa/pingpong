import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../src/lib/constants";

const { width, height } = Dimensions.get("window");

interface Venue {
    id: string;
    name: string;
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    rating: number;
    price_per_hour: number;
    image: string;
    distance: string;
}

// Mock data removed

export default function VenueMapScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [venues, setVenues] = useState<Venue[]>([]); // Use state instead of mock

    // Fetch venues (placeholder logic for now)
    React.useEffect(() => {
        // In real app, fetch from Supabase
        setVenues([]);
    }, []);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    const formatPrice = (price: number) => {
        return `Rp ${price.toLocaleString("id-ID")}/jam`;
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top", "bottom"]}>
                {/* Custom Navy Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Peta Venue</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Map Placeholder */}
                <View style={styles.mapContainer}>
                    <View style={styles.mapPlaceholder}>
                        <MaterialIcons name="map" size={48} color={mutedColor} />
                        <Text style={[styles.mapText, { color: mutedColor }]}>
                            Peta Interaktif
                        </Text>
                        <Text style={[styles.mapHint, { color: mutedColor }]}>
                            Untuk mengaktifkan, install react-native-maps
                        </Text>
                    </View>

                    {/* Venue Markers (simulated) */}
                    {venues.map((venue, idx) => (
                        <TouchableOpacity
                            key={venue.id}
                            style={[
                                styles.marker,
                                {
                                    top: 80 + (idx * 60),
                                    left: 40 + (idx * 50) % 200,
                                    backgroundColor: selectedVenue?.id === venue.id ? Colors.primary : "#EF4444",
                                },
                            ]}
                            onPress={() => setSelectedVenue(venue)}
                        >
                            <MaterialIcons name="sports-tennis" size={16} color="#fff" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Venue List */}
                <View style={[styles.venueListContainer, { backgroundColor: bgColor }]}>
                    <View style={styles.dragHandle} />
                    <Text style={[styles.listTitle, { color: textColor }]}>
                        Venue Terdekat ({venues.length})
                    </Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.venueList}
                    >
                        {venues.length > 0 ? (
                            venues.map((venue) => (
                                <TouchableOpacity
                                    key={venue.id}
                                    style={[
                                        styles.venueCard,
                                        {
                                            backgroundColor: cardColor,
                                            borderColor: selectedVenue?.id === venue.id ? Colors.primary : "transparent",
                                            borderWidth: 2,
                                        },
                                    ]}
                                    onPress={() => {
                                        setSelectedVenue(venue);
                                        router.push({ pathname: "/venue/[id]", params: { id: venue.id } });
                                    }}
                                >
                                    <Image source={{ uri: venue.image }} style={styles.venueImage} />
                                    <View style={styles.venueInfo}>
                                        <Text style={[styles.venueName, { color: textColor }]} numberOfLines={1}>
                                            {venue.name}
                                        </Text>
                                        <View style={styles.venueRating}>
                                            <MaterialIcons name="star" size={14} color="#F59E0B" />
                                            <Text style={[styles.ratingText, { color: textColor }]}>
                                                {venue.rating}
                                            </Text>
                                            <Text style={[styles.distanceText, { color: mutedColor }]}>
                                                • {venue.distance}
                                            </Text>
                                        </View>
                                        <Text style={[styles.venuePrice, { color: Colors.primary }]}>
                                            {formatPrice(venue.price_per_hour)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={{ padding: 20, alignItems: "center", justifyContent: "center", width: width - 40 }}>
                                <Text style={{ color: mutedColor }}>Tidak ada venue ditemukan</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Selected Venue Detail */}
                {selectedVenue && (
                    <View style={[styles.selectedCard, { backgroundColor: cardColor }]}>
                        <Image source={{ uri: selectedVenue.image }} style={styles.selectedImage} />
                        <View style={styles.selectedInfo}>
                            <Text style={[styles.selectedName, { color: textColor }]}>
                                {selectedVenue.name}
                            </Text>
                            <Text style={[styles.selectedAddress, { color: mutedColor }]}>
                                {selectedVenue.address}, {selectedVenue.city}
                            </Text>
                            <View style={styles.selectedMeta}>
                                <View style={styles.ratingBadge}>
                                    <MaterialIcons name="star" size={14} color="#F59E0B" />
                                    <Text style={[styles.ratingValue, { color: textColor }]}>
                                        {selectedVenue.rating}
                                    </Text>
                                </View>
                                <Text style={[styles.selectedPrice, { color: Colors.primary }]}>
                                    {formatPrice(selectedVenue.price_per_hour)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.directionsBtn}
                            onPress={() => router.push({ pathname: "/venue/[id]", params: { id: selectedVenue.id } })}
                        >
                            <MaterialIcons name="directions" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
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
    mapContainer: {
        flex: 1,
        position: "relative",
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E5E7EB",
    },
    mapText: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 12,
    },
    mapHint: {
        fontSize: 12,
        marginTop: 4,
    },
    marker: {
        position: "absolute",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    venueListContainer: {
        paddingTop: 12,
        paddingBottom: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: "#D1D5DB",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 12,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginHorizontal: 20,
        marginBottom: 12,
    },
    venueList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    venueCard: {
        width: 200,
        borderRadius: 12,
        overflow: "hidden",
    },
    venueImage: {
        width: "100%",
        height: 80,
        backgroundColor: "#E5E7EB",
    },
    venueInfo: {
        padding: 10,
    },
    venueName: {
        fontSize: 14,
        fontWeight: "600",
    },
    venueRating: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: "500",
    },
    distanceText: {
        fontSize: 12,
    },
    venuePrice: {
        fontSize: 13,
        fontWeight: "bold",
        marginTop: 4,
    },
    selectedCard: {
        position: "absolute",
        bottom: 200,
        left: 20,
        right: 20,
        flexDirection: "row",
        padding: 12,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    selectedImage: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginRight: 12,
    },
    selectedInfo: {
        flex: 1,
    },
    selectedName: {
        fontSize: 15,
        fontWeight: "bold",
    },
    selectedAddress: {
        fontSize: 12,
        marginTop: 2,
    },
    selectedMeta: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 6,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ratingValue: {
        fontSize: 13,
        fontWeight: "600",
    },
    selectedPrice: {
        fontSize: 13,
        fontWeight: "bold",
    },
    directionsBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${Colors.primary}20`,
        justifyContent: "center",
        alignItems: "center",
    },
});
