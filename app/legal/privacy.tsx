import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors.primary }]} edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Kebijakan Privasi</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.contentContainer}>
                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.lastUpdated}>Terakhir diperbarui: 19 Desember 2024</Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>1. Pendahuluan</Text>
                        <Text style={styles.paragraph}>
                            PingpongHub ("kami") menghargai privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat menggunakan aplikasi kami.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>2. Informasi yang Kami Kumpulkan</Text>
                        <Text style={styles.paragraph}>
                            Kami mengumpulkan informasi yang Anda berikan secara langsung, termasuk:
                        </Text>
                        <View style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.bulletText}>Informasi Akun: Nama, email, username, dan foto profil.</Text>
                        </View>
                        <View style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.bulletText}>Aktivitas: Data pertandingan, skor, dan interaksi dengan pemain lain.</Text>
                        </View>
                        <View style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.bulletText}>Perangkat: Data teknis tentang perangkat yang Anda gunakan.</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>3. Penggunaan Informasi</Text>
                        <Text style={styles.paragraph}>
                            Kami menggunakan informasi Anda untuk:
                        </Text>
                        <View style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.bulletText}>Menyediakan layanan PingpongHub.</Text>
                        </View>
                        <View style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.bulletText}>Memproses pertandingan dan peringkat (ELO).</Text>
                        </View>
                        <View style={styles.bulletPoint}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.bulletText}>Mengirimkan notifikasi penting terkait aktivitas akun.</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>4. Keamanan Data</Text>
                        <Text style={styles.paragraph}>
                            Kami menerapkan langkah-langkah keamanan teknis untuk melindungi data Anda dari akses yang tidak sah. Namun, tidak ada metode transmisi internet yang 100% aman.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>5. Kontak Kami</Text>
                        <Text style={styles.paragraph}>
                            Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami di support@pingponghub.id.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        marginTop: -20,
        paddingTop: 20,
        zIndex: 5,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    lastUpdated: {
        fontSize: 14,
        color: Colors.muted,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 22,
        marginBottom: 8,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 8,
    },
    bullet: {
        fontSize: 14,
        color: Colors.text,
        marginRight: 8,
        lineHeight: 22,
    },
    bulletText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 22,
        flex: 1,
    },
});
