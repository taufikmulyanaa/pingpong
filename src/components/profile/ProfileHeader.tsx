import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/lib/constants';

interface ProfileHeaderProps {
    profile: any;
    isUploadingAvatar: boolean;
    onUploadAvatar: () => void;
    onEditProfile: () => void;
    onBack: () => void;
}

export default function ProfileHeader({
    profile,
    isUploadingAvatar,
    onUploadAvatar,
    onEditProfile,
    onBack
}: ProfileHeaderProps) {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[Colors.secondary, '#000830']} // Restore preferred gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Abstract Background Decorations */}
                <View style={styles.bgDecorationCircle1} />
                <View style={styles.bgDecorationCircle2} />

                {/* Nav Header */}
                <View style={styles.navHeader}>
                    <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
                        <MaterialIcons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profil</Text>
                    <TouchableOpacity style={styles.headerBtn} onPress={onEditProfile}>
                        <MaterialIcons name="settings" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Avatar Section */}
                <View style={styles.content}>
                    <TouchableOpacity
                        style={styles.avatarWrapper}
                        onPress={onUploadAvatar}
                        disabled={isUploadingAvatar}
                    >
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "User")}&background=random&size=112` }}
                                style={styles.avatar}
                            />
                            {isUploadingAvatar && (
                                <View style={styles.avatarLoadingOverlay}>
                                    <ActivityIndicator color="#fff" size="large" />
                                </View>
                            )}
                        </View>

                        <View style={styles.levelBadge}>
                            <LinearGradient
                                colors={['#FFD700', '#F59E0B']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.levelGradient}
                            >
                                <MaterialIcons name="military-tech" size={12} color="#fff" />
                                <Text style={styles.levelBadgeText}>Lvl {profile?.level || 1}</Text>
                            </LinearGradient>
                        </View>

                        <View style={styles.cameraBtn}>
                            <MaterialIcons name="camera-alt" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    {/* User Info */}
                    <Text style={styles.name}>{profile?.name || "User"}</Text>
                    <Text style={styles.username}>@{profile?.username || "user"}</Text>

                    <View style={styles.joinDate}>
                        <MaterialIcons name="calendar-today" size={12} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.joinDateText}>
                            Bergabung {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("id-ID", { month: 'short', year: 'numeric' }) : "-"}
                        </Text>
                    </View>


                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    gradient: {
        paddingBottom: 40,
        position: 'relative',
        overflow: 'hidden',
    },
    // Background Decorations for Ultra-Premium feel
    bgDecorationCircle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    bgDecorationCircle2: {
        position: 'absolute',
        top: 100,
        left: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    navHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 12,
        marginBottom: 24,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-SemiBold',
        color: '#fff',
    },
    content: {
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 58,
    },
    avatarLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#1E1A4E', // Matching the gradient
    },
    levelGradient: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    levelBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontFamily: 'Inter-Bold',
    },
    cameraBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1E1A4E', // Matching the gradient
    },
    name: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: '#fff',
        marginBottom: 4,
    },
    username: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 8,
    },
    joinDate: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    joinDateText: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        color: 'rgba(255,255,255,0.8)',
    },
});
