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

export default function LoginScreen() {
    const router = useRouter();
    const { signIn, signInWithGoogle, isLoading } = useAuthStore();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    // Light mode colors
    const bgColor = Colors.background;
    const cardColor = Colors.card;
    const textColor = Colors.text;
    const mutedColor = Colors.muted;
    const borderColor = Colors.border;

    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};

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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        const { error } = await signIn(email, password);

        if (error) {
            Alert.alert("Login Gagal", error.message);
        } else {
            router.replace("/(tabs)");
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await signInWithGoogle();
        if (error) {
            Alert.alert("Google Login Gagal", error.message);
        }
        // Note: Redirect handled by Supabase auth state change listener
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
                    {/* Logo & Header */}
                    <View style={styles.header}>
                        <View style={styles.logo}>
                            <MaterialIcons name="sports-tennis" size={48} color="#fff" />
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>PingpongHub</Text>
                        <Text style={[styles.subtitle, { color: mutedColor }]}>
                            Masuk ke akun kamu untuk melanjutkan
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
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
                                    placeholder="Masukkan password"
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

                        {/* Forgot Password */}
                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={[styles.forgotText, { color: Colors.primary }]}>Lupa Password?</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.loginBtnText}>Masuk</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                            <Text style={[styles.dividerText, { color: mutedColor }]}>atau</Text>
                            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                        </View>

                        {/* Social Login */}
                        <TouchableOpacity
                            style={[styles.socialBtn, { borderColor, backgroundColor: cardColor }]}
                            onPress={handleGoogleLogin}
                            disabled={isLoading}
                        >
                            <MaterialIcons name="g-mobiledata" size={24} color="#EA4335" />
                            <Text style={[styles.socialBtnText, { color: textColor }]}>Masuk dengan Google</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Register Link */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: mutedColor }]}>
                            Belum punya akun?{" "}
                        </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={[styles.footerLink, { color: Colors.primary }]}>Daftar Sekarang</Text>
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
        paddingVertical: 32,
        justifyContent: "center",
    },
    header: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
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
    forgotPassword: {
        alignSelf: "flex-end",
        marginBottom: 24,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: "500",
    },
    loginBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    loginBtnDisabled: {
        opacity: 0.7,
    },
    loginBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 14,
    },
    socialBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    socialBtnText: {
        fontSize: 14,
        fontWeight: "600",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    footerText: {
        fontSize: 14,
    },
    footerLink: {
        fontSize: 14,
        fontWeight: "bold",
    },
});
