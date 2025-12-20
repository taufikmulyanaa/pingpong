import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';
import { useRouter } from 'expo-router';

interface UserClub {
    id: string;
    name: string;
    logo_url: string | null;
    role: string;
}

interface ClubMemberCardProps {
    userClub: UserClub | null;
}

export default function ClubMemberCard({ userClub }: ClubMemberCardProps) {
    const router = useRouter();
    const borderColor = "rgba(0,0,0,0.05)";

    // Soft Indigo Background for "Active" PTM
    const activeBgColor = '#F8FAFC'; // Very light slate/indigo
    const activeBorderColor = 'rgba(79, 70, 229, 0.1)'; // Soft indigo border

    if (userClub) {
        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: activeBgColor, borderColor: activeBorderColor }]}
                onPress={() => router.push({ pathname: "/club/[id]", params: { id: userClub.id } })}
            >
                <View style={styles.content}>
                    <Image
                        source={{
                            uri: userClub.logo_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(userClub.name)}&background=001064&color=fff&size=48`,
                        }}
                        style={styles.logo}
                    />
                    <View style={styles.info}>
                        <Text style={styles.label}>Anggota PTM</Text>
                        <Text style={styles.name}>{userClub.name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: 'rgba(55, 65, 81, 0.1)' }]}>
                            <Text style={[styles.roleText, { color: Colors.secondary }]}>
                                {userClub.role === 'OWNER' ? 'Owner' :
                                    userClub.role === 'ADMIN' ? 'Admin' :
                                        userClub.role === 'COACH' ? 'Pelatih' : 'Anggota'}
                            </Text>
                        </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={Colors.muted} />
                </View>
            </TouchableOpacity>
        );
    }

    // Empty State
    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: '#fff', borderColor, borderStyle: 'dashed' }]}
            onPress={() => router.push("/club" as any)}
        >
            <View style={styles.content}>
                <View style={[styles.logoPlaceholder, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
                    <MaterialIcons name="groups" size={24} color={Colors.muted} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.label}>PTM</Text>
                    <Text style={[styles.name, { color: Colors.muted }]}>Belum Bergabung</Text>
                    <Text style={styles.subtext}>Ketuk untuk cari PTM</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Colors.muted} />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24, // Move margin here to be self-contained
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    logo: {
        width: 56, // Slightly larger
        height: 56,
        borderRadius: 16,
        backgroundColor: Colors.secondary,
    },
    logoPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
        gap: 4,
    },
    label: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: Colors.muted,
    },
    name: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Colors.secondary, // Use deep blue for name
    },
    subtext: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        color: Colors.muted,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
    },
});
