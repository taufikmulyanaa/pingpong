import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/lib/constants';

interface EquipmentCardProps {
    equipment: {
        blade?: string | null;
        rubberBlack?: string | null;
        rubberRed?: string | null;
        grip?: string | null;
        playStyle?: string | null;
    };
}

export default function EquipmentCard({ equipment }: EquipmentCardProps) {
    const hasEquipment = equipment.blade || equipment.rubberBlack || equipment.rubberRed;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Gaya & Equipment</Text>
            </View>

            <View style={styles.card}>
                {/* Play Style Tags */}
                <View style={styles.tagsRow}>
                    <View style={[styles.tag, { borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.05)' }]}>
                        <MaterialIcons name="pan-tool" size={14} color="#8B5CF6" />
                        <Text style={[styles.tagText, { color: '#8B5CF6' }]}>
                            {equipment.grip || "Shakehand"}
                        </Text>
                    </View>
                    <View style={[styles.tag, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.05)' }]}>
                        <MaterialIcons name="speed" size={14} color="#F59E0B" />
                        <Text style={[styles.tagText, { color: '#F59E0B' }]}>
                            {equipment.playStyle || "All-Round"}
                        </Text>
                    </View>
                </View>

                {/* Equipment List */}
                <View style={styles.divider} />

                {hasEquipment ? (
                    <View style={styles.list}>
                        {equipment.blade && (
                            <View style={styles.item}>
                                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                                    <MaterialIcons name="sports-tennis" size={16} color="#0EA5E9" />
                                </View>
                                <View>
                                    <Text style={styles.itemLabel}>Blade</Text>
                                    <Text style={styles.itemValue}>{equipment.blade}</Text>
                                </View>
                            </View>
                        )}
                        {equipment.rubberBlack && (
                            <View style={styles.item}>
                                <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
                                    <View style={[styles.dot, { backgroundColor: '#1F2937' }]} />
                                </View>
                                <View>
                                    <Text style={styles.itemLabel}>Rubber (Hitam)</Text>
                                    <Text style={styles.itemValue}>{equipment.rubberBlack}</Text>
                                </View>
                            </View>
                        )}
                        {equipment.rubberRed && (
                            <View style={styles.item}>
                                <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                                    <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                                </View>
                                <View>
                                    <Text style={styles.itemLabel}>Rubber (Merah)</Text>
                                    <Text style={styles.itemValue}>{equipment.rubberRed}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Belum ada data equipment yang ditambahkan</Text>
                    </View>
                )}
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
        marginBottom: 12,
        gap: 8,
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
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 16,
    },
    list: {
        gap: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    itemLabel: {
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        color: Colors.muted,
        marginBottom: 2,
    },
    itemValue: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: Colors.text,
    },
    emptyState: {
        padding: 12,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        color: Colors.muted,
        fontStyle: 'italic',
    },
});
