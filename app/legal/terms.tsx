import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';

export default function TermsOfServiceScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Syarat & Ketentuan</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.lastUpdated}>Terakhir diperbarui: 19 Desember 2024</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Persetujuan</Text>
                    <Text style={styles.paragraph}>
                        Dengan mengunduh atau menggunakan aplikasi PingpongHub, Anda menyetujui syarat dan ketentuan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan aplikasi ini.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Akun Pengguna</Text>
                    <Text style={styles.paragraph}>
                        Anda bertanggung jawab untuk menjaga keamanan akun Anda. Anda setuju untuk memberikan informasi yang akurat saat pendaftaran dan tidak membagikan akses akun Anda kepada orang lain.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Etika Komunitas</Text>
                    <Text style={styles.paragraph}>
                        PingpongHub adalah komunitas yang positif. Dilarang keras melakukan:
                    </Text>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>Ujaran kebencian atau pelecehan.</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>Kecurangan dalam pertandingan (match fixing).</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>Spam atau penipuan.</Text>
                    </View>
                    <Text style={styles.paragraph}>
                        Pelanggaran dapat mengakibatkan suspensi atau pemblokiran akun permanen.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Konten Pengguna</Text>
                    <Text style={styles.paragraph}>
                        Anda memberikan kami lisensi untuk menggunakan konten yang Anda posting (seperti foto profil atau hasil pertandingan) untuk keperluan operasional aplikasi.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Perubahan Layanan</Text>
                    <Text style={styles.paragraph}>
                        Kami berhak mengubah atau menghentikan layanan kapan saja tanpa pemberitahuan sebelumnya, meskipun kami akan berusaha memberitahu Anda tentang perubahan besar.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
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
        fontWeight: '600',
        color: Colors.text,
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
