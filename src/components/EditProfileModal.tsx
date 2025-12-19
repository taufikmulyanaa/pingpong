import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    useColorScheme,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, GripStyles, PlayStyles } from "@/lib/constants";
import { Profile } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    profile: Profile | null;
}

type GripStyleKey = keyof typeof GripStyles;
type PlayStyleKey = keyof typeof PlayStyles;

export default function EditProfileModal({ visible, onClose, profile }: EditProfileModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const { updateProfile, fetchProfile } = useAuthStore();

    const [name, setName] = useState(profile?.name || "");
    const [username, setUsername] = useState(profile?.username || "");
    const [bio, setBio] = useState(profile?.bio || "");
    const [gripStyle, setGripStyle] = useState<GripStyleKey>(profile?.grip_style as GripStyleKey || "SHAKEHAND");
    const [playStyle, setPlayStyle] = useState<PlayStyleKey>(profile?.play_style as PlayStyleKey || "ALLROUND");
    const [blade, setBlade] = useState(profile?.equipment_blade || "");
    const [rubberBlack, setRubberBlack] = useState(profile?.equipment_rubber_black || "");
    const [rubberRed, setRubberRed] = useState(profile?.equipment_rubber_red || "");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setName(profile.name || "");
            setUsername(profile.username || "");
            setBio(profile.bio || "");
            setGripStyle(profile.grip_style as GripStyleKey || "SHAKEHAND");
            setPlayStyle(profile.play_style as PlayStyleKey || "ALLROUND");
            setBlade(profile.equipment_blade || "");
            setRubberBlack(profile.equipment_rubber_black || "");
            setRubberRed(profile.equipment_rubber_red || "");
        }
    }, [profile, visible]);

    const bgColor = Colors.background;
    const cardColor = Colors.surface;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = "#E5E7EB"; // Using fixed border color since constants doesn't clarify dark mode specific logic here

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Nama tidak boleh kosong");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await updateProfile({
                name: name.trim(),
                username: username.trim(),
                bio: bio.trim(),
                grip_style: gripStyle,
                play_style: playStyle,
                equipment_blade: blade.trim(),
                equipment_rubber_black: rubberBlack.trim(),
                equipment_rubber_red: rubberRed.trim(),
            });

            if (error) {
                Alert.alert("Error", error.message);
            } else {
                await fetchProfile();
                Alert.alert("Sukses", "Profil berhasil diperbarui");
                onClose();
            }
        } catch (error: any) {
            Alert.alert("Error", error.message || "Gagal menyimpan profil");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                {/* Header */}
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} disabled={isLoading}>
                        <Text style={styles.cancelBtn}>Batal</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Profil</Text>
                    <TouchableOpacity onPress={handleSave} disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtn}>Simpan</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Name */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Nama</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Nama lengkap"
                                placeholderTextColor={mutedColor}
                            />
                        </View>

                        {/* Username */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Username</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="username"
                                placeholderTextColor={mutedColor}
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Bio */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Ceritakan tentang dirimu..."
                                placeholderTextColor={mutedColor}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        {/* Equipment Section Title */}
                        <Text style={[styles.sectionTitle, { color: textColor, marginTop: 10, marginBottom: 15 }]}>Equipment</Text>

                        {/* Blade */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Blade (Kayu)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={blade}
                                onChangeText={setBlade}
                                placeholder="Contoh: Butterfly Viscaria"
                                placeholderTextColor={mutedColor}
                            />
                        </View>

                        {/* Rubber (Black) */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Rubber (Black)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={rubberBlack}
                                onChangeText={setRubberBlack}
                                placeholder="Contoh: Tenergy 05"
                                placeholderTextColor={mutedColor}
                            />
                        </View>

                        {/* Rubber (Red) */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Rubber (Red)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardColor, color: textColor, borderColor }]}
                                value={rubberRed}
                                onChangeText={setRubberRed}
                                placeholder="Contoh: Dignics 09c"
                                placeholderTextColor={mutedColor}
                            />
                        </View>

                        {/* Styles Section Title */}
                        <Text style={[styles.sectionTitle, { color: textColor, marginTop: 10, marginBottom: 15 }]}>Gaya Bermain</Text>

                        {/* Grip Style */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Grip Style</Text>
                            <View style={styles.optionRow}>
                                {(Object.keys(GripStyles) as GripStyleKey[]).map((key) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.optionBtn,
                                            {
                                                backgroundColor: gripStyle === key ? Colors.primary : cardColor,
                                                borderColor: gripStyle === key ? Colors.primary : borderColor,
                                            },
                                        ]}
                                        onPress={() => setGripStyle(key)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                { color: gripStyle === key ? "#fff" : textColor },
                                            ]}
                                        >
                                            {GripStyles[key]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Play Style */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: mutedColor }]}>Play Style</Text>
                            <View style={styles.optionRow}>
                                {(Object.keys(PlayStyles) as PlayStyleKey[]).map((key) => (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.optionBtn,
                                            {
                                                backgroundColor: playStyle === key ? Colors.secondary : cardColor,
                                                borderColor: playStyle === key ? Colors.secondary : borderColor,
                                            },
                                        ]}
                                        onPress={() => setPlayStyle(key)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                { color: playStyle === key ? "#fff" : textColor },
                                            ]}
                                        >
                                            {PlayStyles[key]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
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
        paddingTop: 20,
        paddingBottom: 24,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    cancelBtn: {
        fontSize: 16,
        color: "#fff",
        opacity: 0.8,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    saveBtn: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
    },
    contentContainer: {
        flex: 1,
        marginTop: -20,
        paddingTop: 20,
        zIndex: 5,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    optionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    optionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    optionText: {
        fontSize: 14,
        fontWeight: "500",
    },
});
