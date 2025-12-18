import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";

// Mock data for hosted tables
// Mock data removed

export default function HostListScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [tables, setTables] = useState<any[]>([]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "rgba(0,0,0,0.05)";

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
                    <Text style={styles.headerTitle}>Meja Saya</Text>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/host/create")}>
                        <MaterialIcons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>


                {/* Table List */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                >
                    {tables.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="table-restaurant" size={64} color={mutedColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>Belum Ada Meja</Text>
                            <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                Mulai sewakan mejamu dan dapatkan penghasilan tambahan!
                            </Text>
                        </View>
                    ) : (
                        tables.map((table) => (
                            <TouchableOpacity
                                key={table.id}
                                style={[styles.tableCard, { backgroundColor: cardColor, borderColor }]}
                                onPress={() => router.push(`/host/${table.id}` as any)}
                            >
                                <Image source={{ uri: table.image }} style={styles.tableImage} />
                                <View style={styles.tableContent}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.tableName, { color: textColor }]}>{table.name}</Text>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: table.status === "ACTIVE" ? "#D1FAE5" : table.status === "BOOKED" ? "#FEF3C7" : "#F3F4F6" }
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                { color: table.status === "ACTIVE" ? "#059669" : table.status === "BOOKED" ? "#D97706" : "#6B7280" }
                                            ]}>
                                                {table.status === "ACTIVE" ? "Tersedia" : table.status === "BOOKED" ? "Booked" : "Non-aktif"}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.tableAddress, { color: mutedColor }]}>{table.address}</Text>

                                    <View style={styles.cardFooter}>
                                        <View style={styles.footerStat}>
                                            <MaterialIcons name="star" size={14} color="#F59E0B" />
                                            <Text style={[styles.footerText, { color: mutedColor }]}>{table.rating} ({table.reviews})</Text>
                                        </View>
                                        <View style={styles.footerStat}>
                                            <MaterialIcons name="payments" size={14} color="#10B981" />
                                            <Text style={[styles.footerText, { color: mutedColor }]}>{table.earnings}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}

                    <View style={{ height: 80 }} />
                </ScrollView>

                {/* FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => router.push("/host/create")}
                >
                    <MaterialIcons name="add" size={24} color="#fff" />
                    <Text style={styles.fabText}>Tambah Meja</Text>
                </TouchableOpacity>
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
    statsHeader: {
        flexDirection: "row",
        backgroundColor: Colors.secondary,
        paddingBottom: 24,
        paddingTop: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    statBorder: {
        borderRightWidth: 1,
        borderRightColor: "rgba(255,255,255,0.1)",
        borderLeftWidth: 1,
        borderLeftColor: "rgba(255,255,255,0.1)",
    },
    statLabel: {
        color: Colors.accent,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 16,
        textAlign: "center",
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 8,
        lineHeight: 20,
    },
    tableCard: {
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        overflow: "hidden",
    },
    tableImage: {
        width: "100%",
        height: 140,
    },
    tableContent: {
        padding: 16,
    },
    tableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    tableName: {
        fontSize: 16,
        fontWeight: "bold",
        flex: 1,
        marginRight: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "bold",
    },
    tableAddress: {
        fontSize: 12,
        marginBottom: 16,
    },
    cardFooter: {
        flexDirection: "row",
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
        paddingTop: 12,
        marginTop: 4,
    },
    footerStat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        fontWeight: "500",
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 20,
        backgroundColor: Colors.primary,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    fabText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        marginLeft: 8,
    },
});
