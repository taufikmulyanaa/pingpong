import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, Link } from "expo-router";
import { Colors, SharedStyles, ExtendedColors } from "@/lib/constants";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterScreen() {
    const router = useRouter();
    const { signUp, isLoading } = useAuthStore();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!name) {
            newErrors.name = "Nama wajib diisi";
        } else if (name.length < 3) {
            newErrors.name = "Nama minimal 3 karakter";
        }

        if (!email) {
            newErrors.email = "Email wajib diisi";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Format email tidak valid";
        }

        if (!password) {
            newErrors.password = "Password wajib diisi";
        } else if (password.length < 6) {
            newErrors.password = "Password minimal 6 karakter";
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Password tidak cocok";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        const { error } = await signUp(email, password, name);

        if (error) {
            Alert.alert("Registrasi Gagal", error.message);
        } else {
            Alert.alert(
                "Registrasi Berhasil",
                "Silakan cek email kamu untuk verifikasi akun.",
                [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
            );
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboard}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Back Button */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color={textColor} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>Buat Akun</Text>
                        <Text style={[styles.subtitle, { color: mutedColor }]}>
                            Daftar untuk mulai bermain dan menemukan lawan
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Nama Lengkap</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    { borderColor: errors.name ? "#EF4444" : borderColor, backgroundColor: cardColor },
                                ]}
                            >
                                <MaterialIcons name="person" size={20} color={mutedColor} />
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    placeholder="Masukkan nama lengkap"
                                    placeholderTextColor={mutedColor}
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                />
                            </View>
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Email</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    { borderColor: errors.email ? "#EF4444" : borderColor, backgroundColor: cardColor },
                                ]}
                            >
                                <MaterialIcons name="email" size={20} color={mutedColor} />
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    placeholder="nama@email.com"
                                    placeholderTextColor={mutedColor}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                            </View>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Password</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    { borderColor: errors.password ? "#EF4444" : borderColor, backgroundColor: cardColor },
                                ]}
                            >
                                <MaterialIcons name="lock" size={20} color={mutedColor} />
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    placeholder="Minimal 6 karakter"
                                    placeholderTextColor={mutedColor}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <MaterialIcons
                                        name={showPassword ? "visibility" : "visibility-off"}
                                        size={20}
                                        color={mutedColor}
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                        </View>

                        {/* Confirm Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textColor }]}>Konfirmasi Password</Text>
                            <View
                                style={[
                                    styles.inputContainer,
                                    { borderColor: errors.confirmPassword ? "#EF4444" : borderColor, backgroundColor: cardColor },
                                ]}
                            >
                                <MaterialIcons name="lock" size={20} color={mutedColor} />
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    placeholder="Ulangi password"
                                    placeholderTextColor={mutedColor}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                            </View>
                            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={[styles.registerBtn, isLoading && styles.registerBtnDisabled]}
                            onPress={handleRegister}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.registerBtnText}>Daftar</Text>
                            )}
                        </TouchableOpacity>

                        {/* Terms */}
                        <Text style={[styles.terms, { color: mutedColor }]}>
                            Dengan mendaftar, kamu menyetujui{" "}
                            <Text style={{ color: Colors.primary }}>Syarat & Ketentuan</Text> dan{" "}
                            <Text style={{ color: Colors.primary }}>Kebijakan Privasi</Text> kami.
                        </Text>
                    </View>

                    {/* Login Link */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: mutedColor }]}>
                            Sudah punya akun?{" "}
                        </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={[styles.footerLink, { color: Colors.primary }]}>Masuk</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboard: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        marginLeft: -8,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
    },
    form: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 14,
    },
    errorText: {
        color: "#EF4444",
        fontSize: 12,
        marginTop: 4,
    },
    registerBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 8,
    },
    registerBtnDisabled: {
        opacity: 0.7,
    },
    registerBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    terms: {
        fontSize: 12,
        textAlign: "center",
        marginTop: 16,
        lineHeight: 18,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: "auto",
    },
    footerText: {
        fontSize: 14,
    },
    footerLink: {
        fontSize: 14,
        fontWeight: "bold",
    },
});
