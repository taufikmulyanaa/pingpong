import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "../../src/lib/constants";
import { useAuthStore } from "../../src/stores/authStore";
import { supabase } from "../../src/lib/supabase";

interface MockPlayer {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
    rating_mr: number;
    level: number;
    wins: number;
    losses: number;
    city: string;
}

// Mock players removed

export default function NewChallengeScreen() {
    const router = useRouter();
    const { playerId } = useLocalSearchParams<{ playerId: string }>();
    const { profile } = useAuthStore();

    const [matchType, setMatchType] = useState<"RANKED" | "FRIENDLY">("RANKED");
    const [bestOf, setBestOf] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [opponent, setOpponent] = useState<any>(null);

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    // Load opponent from Supabase
    useEffect(() => {
        async function fetchOpponent() {
            if (playerId) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', playerId)
                    .single();

                if (data) {
                    setOpponent(data);
                } else {
                    // Handle error or not found
                    console.log("Opponent not found");
                }
            }
        }
        fetchOpponent();
    }, [playerId]);

    const handleChallenge = async () => {
        if (!profile || !opponent) {
            Alert.alert("Error", "Data tidak lengkap");
            return;
        }

        setIsLoading(true);

        try {
            const challengeData = {
                challenger_id: profile.id,
                challenged_id: opponent.id,
                match_type: matchType,
                best_of: bestOf,
                message: `${profile.name} mengajak kamu bertanding ${matchType === "RANKED" ? "Ranked" : "Friendly"} Match!`,
                status: "PENDING",
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
            };

            console.log("Creating challenge with data:", challengeData);

            const { data, error } = await (supabase
                .from("challenges") as any)
                .insert(challengeData)
                .select()
                .single();


            console.log("Challenge creation result:", { data, error });

            if (error) {
                console.error("Error creating challenge:", error);
                Alert.alert("Error", `Gagal mengirim tantangan: ${error.message}`);
            } else {
                console.log("Challenge created successfully:", data);
                Alert.alert(
                    "Tantangan Terkirim!",
                    `Tantangan ${matchType === "RANKED" ? "Ranked" : "Friendly"} telah dikirim ke ${opponent.name}. Menunggu konfirmasi...`,
                    [{ text: "OK", onPress: () => router.back() }]
                );
            }
        } catch (error) {
            console.error("Catch error:", error);
            Alert.alert("Error", "Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };


    const getWinRate = () => {
        if (!opponent) return 0;
        const total = opponent.wins + opponent.losses;
        return total > 0 ? Math.round((opponent.wins / total) * 100) : 0;
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: Colors.primary }]} edges={["top", "left", "right"]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tantang Pemain</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={[styles.contentContainer, { backgroundColor: bgColor }]}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* VS Card */}
                        <View style={[styles.vsCard, { backgroundColor: Colors.secondary }]}>
                            <View style={styles.vsPlayers}>
                                <View style={styles.vsPlayer}>
                                    <Image
                                        source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "Me")}&background=4169E1&color=fff` }}
                                        style={styles.vsAvatar}
                                    />
                                    <Text style={styles.vsPlayerName}>Kamu</Text>
                                    <Text style={styles.vsPlayerMr}>MR {profile?.rating_mr || 1000}</Text>
                                </View>

                                <View style={styles.vsBadge}>
                                    <Text style={styles.vsText}>VS</Text>
                                </View>

                                <View style={styles.vsPlayer}>
                                    <Image
                                        source={{ uri: opponent?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponent?.name || "Lawan")}&background=FFEB00&color=001064` }}
                                        style={styles.vsAvatar}
                                    />
                                    <Text style={styles.vsPlayerName}>{opponent?.name || "Lawan"}</Text>
                                    <Text style={styles.vsPlayerMr}>MR {opponent?.rating_mr || 1000}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Opponent Stats */}
                        <View style={[styles.statsCard, { backgroundColor: cardColor, borderColor }]}>
                            <Text style={[styles.statsTitle, { color: textColor }]}>Statistik Lawan</Text>
                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: Colors.primary }]}>{opponent?.level || 1}</Text>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>Level</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: "#10B981" }]}>{opponent?.wins || 0}</Text>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>Menang</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: "#EF4444" }]}>{opponent?.losses || 0}</Text>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>Kalah</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: textColor }]}>{getWinRate()}%</Text>
                                    <Text style={[styles.statLabel, { color: mutedColor }]}>Win Rate</Text>
                                </View>
                            </View>
                        </View>

                        {/* Match Type Selection */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Jenis Pertandingan</Text>

                            <View style={styles.typeOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.typeCard,
                                        {
                                            backgroundColor: cardColor,
                                            borderColor: matchType === "RANKED" ? Colors.primary : borderColor,
                                            borderWidth: matchType === "RANKED" ? 2 : 1,
                                        },
                                    ]}
                                    onPress={() => setMatchType("RANKED")}
                                >
                                    <View style={[styles.typeIcon, { backgroundColor: "#FEF3C7" }]}>
                                        <MaterialIcons name="emoji-events" size={24} color="#F59E0B" />
                                    </View>
                                    <View style={styles.typeInfo}>
                                        <Text style={[styles.typeTitle, { color: textColor }]}>Ranked Match</Text>
                                        <Text style={[styles.typeDesc, { color: mutedColor }]}>
                                            Mempengaruhi rating MR dan XP
                                        </Text>
                                    </View>
                                    {matchType === "RANKED" && (
                                        <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.typeCard,
                                        {
                                            backgroundColor: cardColor,
                                            borderColor: matchType === "FRIENDLY" ? Colors.primary : borderColor,
                                            borderWidth: matchType === "FRIENDLY" ? 2 : 1,
                                        },
                                    ]}
                                    onPress={() => setMatchType("FRIENDLY")}
                                >
                                    <View style={[styles.typeIcon, { backgroundColor: "#DBEAFE" }]}>
                                        <MaterialIcons name="sports-tennis" size={24} color={Colors.primary} />
                                    </View>
                                    <View style={styles.typeInfo}>
                                        <Text style={[styles.typeTitle, { color: textColor }]}>Friendly Match</Text>
                                        <Text style={[styles.typeDesc, { color: mutedColor }]}>
                                            Main santai tanpa rating
                                        </Text>
                                    </View>
                                    {matchType === "FRIENDLY" && (
                                        <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Best Of Selection */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Format Pertandingan</Text>

                            <View style={styles.bestOfOptions}>
                                {[3, 5, 7].map((num) => (
                                    <TouchableOpacity
                                        key={num}
                                        style={[
                                            styles.bestOfBtn,
                                            {
                                                backgroundColor: bestOf === num ? Colors.primary : cardColor,
                                                borderColor: bestOf === num ? Colors.primary : borderColor,
                                            },
                                        ]}
                                        onPress={() => setBestOf(num)}
                                    >
                                        <Text style={[
                                            styles.bestOfText,
                                            { color: bestOf === num ? "#fff" : textColor }
                                        ]}>
                                            Best of {num}
                                        </Text>
                                        <Text style={[
                                            styles.bestOfSub,
                                            { color: bestOf === num ? "rgba(255,255,255,0.8)" : mutedColor }
                                        ]}>
                                            First to {Math.ceil(num / 2)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Bottom Action */}
                    <View style={[styles.bottomAction, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
                        <TouchableOpacity
                            style={[styles.challengeBtn, { backgroundColor: Colors.primary }]}
                            onPress={handleChallenge}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Text style={styles.challengeBtnText}>Mengirim...</Text>
                            ) : (
                                <>
                                    <MaterialIcons name="sports-tennis" size={20} color="#fff" />
                                    <Text style={styles.challengeBtnText}>Kirim Tantangan</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    vsCard: {
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
    },
    vsPlayers: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    vsPlayer: {
        alignItems: "center",
        flex: 1,
    },
    vsAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: "#fff",
        marginBottom: 8,
    },
    vsPlayerName: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    vsPlayerMr: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 12,
        marginTop: 2,
    },
    vsBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.accent,
        justifyContent: "center",
        alignItems: "center",
    },
    vsText: {
        color: Colors.secondary,
        fontSize: 16,
        fontWeight: "bold",
    },
    statsCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    statItem: {
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "bold",
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },
    typeOptions: {
        gap: 12,
    },
    typeCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    typeIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    typeInfo: {
        flex: 1,
    },
    typeTitle: {
        fontSize: 15,
        fontWeight: "600",
    },
    typeDesc: {
        fontSize: 13,
        marginTop: 2,
    },
    bestOfOptions: {
        flexDirection: "row",
        gap: 10,
    },
    bestOfBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
    },
    bestOfText: {
        fontSize: 14,
        fontWeight: "600",
    },
    bestOfSub: {
        fontSize: 11,
        marginTop: 2,
    },
    bottomAction: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
    },
    challengeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    challengeBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    headerBtn: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    contentContainer: {
        flex: 1,
        marginTop: -20,
        paddingTop: 20,
        zIndex: 5,
    },
});
