import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    Modal,
    Alert,
    Share,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "../../src/lib/constants";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

interface Photo {
    id: string;
    photo_url: string;
    caption: string | null;
    uploader: { name: string } | null;
    created_at: string;
}

export default function TournamentGalleryScreen() {
    const router = useRouter();
    const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
    const { user } = useAuthStore();

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [canUpload, setCanUpload] = useState(false);

    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;

    useEffect(() => {
        loadPhotos();
        checkUploadPermission();
    }, [tournamentId]);

    const loadPhotos = async () => {
        if (!tournamentId) return;
        setLoading(true);

        try {
            const { data } = await (supabase
                .from("tournament_photos") as any)
                .select(`
                    id,
                    photo_url,
                    caption,
                    created_at,
                    uploader:uploader_id (name)
                `)
                .eq("tournament_id", tournamentId)
                .order("created_at", { ascending: false });

            if (data) {
                setPhotos(data);
            }
        } catch (error) {
            console.error("Error loading photos:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkUploadPermission = async () => {
        if (!tournamentId || !user?.id) return;

        // Check if user is organizer or participant
        const { data: tournament } = await supabase
            .from("tournaments")
            .select("organizer_id")
            .eq("id", tournamentId)
            .single();

        if (tournament && (tournament as any).organizer_id === user.id) {
            setCanUpload(true);
            return;
        }

        const { data: participant } = await supabase
            .from("tournament_participants")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (participant) {
            setCanUpload(true);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            uploadPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async (uri: string) => {
        if (!tournamentId || !user?.id) return;
        setUploading(true);

        try {
            // Create form data
            const filename = `tournament-${tournamentId}-${Date.now()}.jpg`;
            const response = await fetch(uri);
            const blob = await response.blob();

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("tournament-photos")
                .upload(filename, blob, { contentType: "image/jpeg" });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("tournament-photos")
                .getPublicUrl(filename);

            // Insert into database
            await (supabase.from("tournament_photos") as any).insert({
                tournament_id: tournamentId,
                uploader_id: user.id,
                photo_url: urlData.publicUrl,
            });

            Alert.alert("Berhasil", "Foto berhasil diupload!");
            loadPhotos();
        } catch (error) {
            console.error("Error uploading photo:", error);
            Alert.alert("Error", "Gagal mengupload foto");
        } finally {
            setUploading(false);
        }
    };

    const deletePhoto = async (photoId: string) => {
        Alert.alert(
            "Hapus Foto",
            "Yakin ingin menghapus foto ini?",
            [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await (supabase.from("tournament_photos") as any)
                                .delete()
                                .eq("id", photoId);
                            setSelectedPhoto(null);
                            loadPhotos();
                        } catch (error) {
                            console.error("Error deleting photo:", error);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: "Galeri Foto",
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />
            <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["bottom"]}>
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Upload Button */}
                    {canUpload && (
                        <TouchableOpacity
                            style={[styles.uploadBtn, { backgroundColor: Colors.primary }]}
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <MaterialIcons name="add-a-photo" size={20} color="#fff" />
                                    <Text style={styles.uploadBtnText}>Upload Foto</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Photo Grid */}
                    <View style={styles.photoGrid}>
                        {photos.map((photo) => (
                            <TouchableOpacity
                                key={photo.id}
                                style={styles.photoItem}
                                onPress={() => setSelectedPhoto(photo)}
                            >
                                <Image
                                    source={{ uri: photo.photo_url }}
                                    style={styles.photoThumb}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {photos.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="photo-library" size={64} color={mutedColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                Belum Ada Foto
                            </Text>
                            <Text style={[styles.emptyDesc, { color: mutedColor }]}>
                                Upload foto dokumentasi turnamen disini
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Photo Lightbox Modal */}
                <Modal
                    visible={selectedPhoto !== null}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setSelectedPhoto(null)}
                >
                    <View style={styles.lightboxOverlay}>
                        <TouchableOpacity
                            style={styles.lightboxClose}
                            onPress={() => setSelectedPhoto(null)}
                        >
                            <MaterialIcons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        {selectedPhoto && (
                            <>
                                <Image
                                    source={{ uri: selectedPhoto.photo_url }}
                                    style={styles.lightboxImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.lightboxInfo}>
                                    {selectedPhoto.caption && (
                                        <Text style={styles.lightboxCaption}>
                                            {selectedPhoto.caption}
                                        </Text>
                                    )}
                                    <Text style={styles.lightboxMeta}>
                                        Oleh {selectedPhoto.uploader?.name || "Unknown"} • {new Date(selectedPhoto.created_at).toLocaleDateString("id-ID")}
                                    </Text>
                                    {canUpload && (
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => deletePhoto(selectedPhoto.id)}
                                        >
                                            <MaterialIcons name="delete" size={20} color="#EF4444" />
                                            <Text style={{ color: "#EF4444" }}>Hapus</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </Modal>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16 },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 14,
        borderRadius: 10,
        marginBottom: 16,
    },
    uploadBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    photoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    photoItem: {
        width: "31%",
        aspectRatio: 1,
        borderRadius: 8,
        overflow: "hidden",
    },
    photoThumb: {
        width: "100%",
        height: "100%",
    },
    emptyState: {
        alignItems: "center",
        padding: 40,
    },
    emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
    emptyDesc: { fontSize: 14, textAlign: "center", marginTop: 8 },
    lightboxOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
        justifyContent: "center",
        alignItems: "center",
    },
    lightboxClose: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
    },
    lightboxImage: {
        width: "100%",
        height: "70%",
    },
    lightboxInfo: {
        position: "absolute",
        bottom: 40,
        left: 20,
        right: 20,
    },
    lightboxCaption: {
        color: "#fff",
        fontSize: 16,
        marginBottom: 8,
    },
    lightboxMeta: {
        color: "#9CA3AF",
        fontSize: 13,
    },
    deleteBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 16,
    },
});
