import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors, Facilities, SharedStyles, ExtendedColors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";

// Mock data removed

const VenueCard = ({ venue, onPress }: { venue: any; onPress: () => void }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = isDark ? "#374151" : "#E5E7EB";

    return (
        <TouchableOpacity
            style={[styles.venueCard, { backgroundColor: cardColor, borderColor }]}
            onPress={onPress}
        >
            <Image source={{ uri: venue.images[0] }} style={styles.venueImage} />

            {venue.is_verified && (
                <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={12} color="#fff" />
                    <Text style={styles.verifiedText}>Verified</Text>
                </View>
            )}

            <View style={styles.venueContent}>
                <View style={styles.venueHeader}>
                    <Text style={[styles.venueName, { color: textColor }]} numberOfLines={1}>
                        {venue.name}
                    </Text>
                    <View style={styles.ratingBadge}>
                        <MaterialIcons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.ratingText}>{venue.rating}</Text>
                    </View>
                </View>

                <View style={styles.venueLocation}>
                    <MaterialIcons name="place" size={14} color={mutedColor} />
                    <Text style={[styles.venueAddress, { color: mutedColor }]} numberOfLines={1}>
                        {venue.address}
                    </Text>
                </View>

                <View style={styles.venueFooter}>
                    <View style={styles.venueMeta}>
                        <View style={styles.metaItem}>
                            <MaterialIcons name="table-restaurant" size={14} color={Colors.primary} />
                            <Text style={[styles.metaText, { color: mutedColor }]}>{venue.table_count} meja</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <MaterialIcons name="near-me" size={14} color={Colors.primary} />
                            <Text style={[styles.metaText, { color: mutedColor }]}>{venue.distance} km</Text>
                        </View>
                    </View>

                    <Text style={[styles.venuePrice, { color: Colors.primary }]}>
                        Rp {venue.price_per_hour.toLocaleString()}/jam
                    </Text>
                </View>

                {/* Facilities */}
                <View style={styles.facilitiesRow}>
                    {venue.facilities.slice(0, 4).map((f) => (
                        <View key={f} style={[styles.facilityTag, { backgroundColor: isDark ? "#374151" : "#F3F4F6" }]}>
                            <Text style={[styles.facilityText, { color: mutedColor }]}>
                                {Facilities.find((fac) => fac.id === f)?.label || f}
                            </Text>
                        </View>
                    ))}
                    {venue.facilities.length > 4 && (
                        <Text style={[styles.moreText, { color: mutedColor }]}>
                            +{venue.facilities.length - 4}
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function VenueListScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"distance" | "rating" | "price">("distance");
    const [venues, setVenues] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch venues from Supabase
    useEffect(() => {
        const fetchVenues = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("venues")
                    .select("*")
                    .eq("is_active", true)
                    .limit(20);

                if (error) {
                    console.error("Error fetching venues:", error);
                    setVenues([]);
                } else if (data && data.length > 0) {
                    // Map Supabase data to mockVenues format
                    const mappedVenues = data.map((v: any) => ({
                        ...v,
                        images: v.images || ["https://placehold.co/300x200/009688/white?text=" + encodeURIComponent(v.name)],
                        facilities: v.facilities || [],
                        distance: 0, // TODO: Calculate from user location
                    }));
                    setVenues(mappedVenues);
                } else {
                    setVenues([]);
                }
            } catch (error) {
                console.error("Error:", error);
                setVenues([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVenues();
    }, []);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = isDark ? "#374151" : "#E5E7EB";

    const filteredVenues = venues.filter((v: any) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.city && v.city.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                    <Text style={styles.headerTitle}>Venue & PTM</Text>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/venue-map" as any)}>
                        <MaterialIcons name="map" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Search & Filter */}
                <View style={styles.searchSection}>
                    <View style={[styles.searchBar, { backgroundColor: cardColor, borderColor }]}>
                        <MaterialIcons name="search" size={20} color={mutedColor} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder="Cari venue..."
                            placeholderTextColor={mutedColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Sort Options */}
                <View style={styles.sortSection}>
                    <Text style={[styles.sortLabel, { color: mutedColor }]}>Urutkan:</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.sortOptions}>
                            {[
                                { key: "distance", label: "Terdekat" },
                                { key: "rating", label: "Rating" },
                                { key: "price", label: "Harga" },
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.sortBtn,
                                        {
                                            backgroundColor: sortBy === option.key ? Colors.primary : cardColor,
                                            borderColor: sortBy === option.key ? Colors.primary : borderColor,
                                        },
                                    ]}
                                    onPress={() => setSortBy(option.key as any)}
                                >
                                    <Text
                                        style={[
                                            styles.sortBtnText,
                                            { color: sortBy === option.key ? "#fff" : textColor },
                                        ]}
                                    >
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Venue List */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={[styles.resultCount, { color: mutedColor }]}>
                        {filteredVenues.length} venue ditemukan
                    </Text>

                    {filteredVenues.length > 0 ? (
                        filteredVenues.map((venue) => (
                            <VenueCard
                                key={venue.id}
                                venue={venue}
                                onPress={() => router.push(`/venue/${venue.id}`)}
                            />
                        ))
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: cardColor }]}>
                            <MaterialIcons name="store-mall-directory" size={48} color={mutedColor} />
                            <Text style={[styles.emptyStateText, { color: mutedColor }]}>
                                Tidak ada venue ditemukan
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 20 }} />
                </ScrollView>
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
    searchSection: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    mapBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    sortSection: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 20,
        marginBottom: 8,
    },
    sortLabel: {
        fontSize: 12,
        marginRight: 8,
    },
    sortOptions: {
        flexDirection: "row",
        gap: 8,
        paddingRight: 20,
    },
    sortBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    sortBtnText: {
        fontSize: 12,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
    },
    resultCount: {
        fontSize: 12,
        marginBottom: 12,
    },
    venueCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
        marginBottom: 16,
    },
    venueImage: {
        width: "100%",
        height: 160,
        backgroundColor: "#E5E7EB",
    },
    verifiedBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    verifiedText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "bold",
    },
    venueContent: {
        padding: 16,
    },
    venueHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    venueName: {
        fontSize: 18,
        fontWeight: "bold",
        flex: 1,
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#92400E",
    },
    venueLocation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 12,
    },
    venueAddress: {
        fontSize: 13,
        flex: 1,
    },
    venueFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    venueMeta: {
        flexDirection: "row",
        gap: 16,
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontSize: 12,
    },
    venuePrice: {
        fontSize: 14,
        fontWeight: "bold",
    },
    facilitiesRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
    },
    facilityTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    facilityText: {
        fontSize: 10,
        fontWeight: "500",
    },
    moreText: {
        fontSize: 10,
        fontWeight: "500",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        borderRadius: 16,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: "center",
    },
});
