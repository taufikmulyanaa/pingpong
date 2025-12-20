import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';

interface PerformanceCardProps {
    stats: {
        totalMatches: number;
        wins: number;
        losses: number;
        currentStreak: number;
        bestWin: string;
        winRate: number;
    };
}

export default function PerformanceCard({ stats }: PerformanceCardProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <MaterialIcons name="insights" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.title}>Statistik Performa</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.label}>Total Pertandingan</Text>
                    <Text style={styles.value}>{stats.totalMatches}</Text>
                </View>

                {/* Win Bar */}
                <View style={styles.barContainer}>
                    <View style={[styles.barFill, { width: `${stats.winRate}%` }]} />
                </View>
                <View style={styles.barLabels}>
                    <Text style={[styles.barLabel, { color: '#059669' }]}>{stats.wins} Menang</Text>
                    <Text style={[styles.barLabel, { color: '#DC2626' }]}>{stats.losses} Kalah</Text>
                </View>

                <View style={styles.divider} />

                {/* Streak & Best Win */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Current Streak</Text>
                        <View style={styles.streakValue}>
                            <MaterialIcons name="local-fire-department" size={20} color="#F97316" />
                            <Text style={styles.statValue}>
                                {stats.currentStreak} <Text style={styles.unit}>Win</Text>
                            </Text>
                        </View>
                    </View>
                    <View style={styles.verticalLine} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Best Win</Text>
                        <View style={styles.streakValue}>
                            <MaterialIcons name="emoji-events" size={20} color="#F59E0B" />
                            <Text style={styles.statValue}>{stats.bestWin || '-'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 150, 136, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Colors.text,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
    },
    value: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.text,
    },
    barContainer: {
        height: 8,
        backgroundColor: '#FEE2E2', // Light red bg
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    barFill: {
        height: '100%',
        backgroundColor: '#10B981', // Green fill
    },
    barLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    barLabel: {
        fontSize: 11,
        fontFamily: 'Inter-SemiBold',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
    },
    streakValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: Colors.text,
    },
    unit: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
    },
    verticalLine: {
        width: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        height: '80%',
    },
});
