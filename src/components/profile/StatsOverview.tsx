import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';

interface StatsOverviewProps {
    stats: {
        rating: number;
        winRate: number;
        totalMatches: number;
        rank: string | number;
    };
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
    return (
        <View style={styles.container}>
            {/* Rating Card */}
            <View style={[styles.card, styles.ratingCard]}>
                <View style={styles.iconContainer}>
                    <MaterialIcons name="insights" size={20} color={Colors.primary} />
                </View>
                <View>
                    <Text style={styles.label}>MR Rating</Text>
                    <Text style={styles.value}>{stats.rating || 1000}</Text>
                </View>
            </View>

            {/* Win Rate Card */}
            <View style={[styles.card, styles.winRateCard]}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <MaterialIcons name="pie-chart" size={20} color="#10B981" />
                </View>
                <View>
                    <Text style={styles.label}>Win Rate</Text>
                    <Text style={[styles.value, { color: '#10B981' }]}>{stats.winRate}%</Text>
                    <Text style={styles.subtext}>dari {stats.totalMatches}</Text>
                </View>
            </View>

            {/* Rank Card */}
            <View style={[styles.card, styles.rankCard]}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <MaterialIcons name="emoji-events" size={20} color="#F59E0B" />
                </View>
                <View>
                    <Text style={styles.label}>Rank</Text>
                    <Text style={[styles.value, { color: '#F59E0B' }]}>{stats.rank || '-'}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        gap: 12,
    },
    ratingCard: {
        backgroundColor: 'rgba(0, 150, 136, 0.02)',
        borderColor: 'rgba(0, 150, 136, 0.1)',
    },
    winRateCard: {
        backgroundColor: 'rgba(16, 185, 129, 0.02)',
        borderColor: 'rgba(16, 185, 129, 0.1)',
    },
    rankCard: {
        backgroundColor: 'rgba(245, 158, 11, 0.02)',
        borderColor: 'rgba(245, 158, 11, 0.1)',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 150, 136, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
        marginBottom: 2,
    },
    value: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: Colors.text,
    },
    subtext: {
        fontSize: 10,
        fontFamily: 'Inter-Regular',
        color: Colors.muted,
        marginTop: 2,
    },
});
