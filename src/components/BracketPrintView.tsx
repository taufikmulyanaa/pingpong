/**
 * Bracket Print View Component
 * WebView-based print preview and PDF export for tournament brackets
 */

import React, { useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Platform,
    Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Colors } from "../lib/constants";
import { generateBracketHTML } from "../lib/tournamentExport";

interface BracketMatch {
    id: string;
    round: number;
    matchNumber: number;
    player1?: { id: string; name: string } | null;
    player2?: { id: string; name: string } | null;
    winner?: { id: string; name: string } | null;
    score1: number;
    score2: number;
    scheduledAt?: string;
    tableNumber?: number;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    tournamentName: string;
    bracket: BracketMatch[][];
    format?: string;
}

export default function BracketPrintView({
    visible,
    onClose,
    tournamentName,
    bracket,
    format = "SINGLE_ELIMINATION",
}: Props) {
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const webViewRef = useRef<WebView>(null);

    // Generate HTML for the bracket
    const generateHTML = (): string => {
        const matchesFlat = bracket.flat().map(m => ({
            id: m.id,
            round: m.round,
            match_number: m.matchNumber,
            player1_id: m.player1?.id || null,
            player2_id: m.player2?.id || null,
            winner_id: m.winner?.id || null,
            player1_score: m.score1,
            player2_score: m.score2,
            scheduled_at: m.scheduledAt || null,
            table_number: m.tableNumber || null,
            player1: m.player1 ? { name: m.player1.name } : null,
            player2: m.player2 ? { name: m.player2.name } : null,
        }));

        return generateBracketHTML(matchesFlat as any[], tournamentName, format);
    };

    // Export to PDF
    const handleExportPDF = async () => {
        setExporting(true);
        try {
            const html = generateHTML();

            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
            });

            // Share/save the PDF
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Bracket ${tournamentName}`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert("Berhasil", `PDF disimpan di: ${uri}`);
            }
        } catch (error) {
            console.error("PDF export error:", error);
            Alert.alert("Error", "Gagal mengekspor PDF");
        } finally {
            setExporting(false);
        }
    };

    // Print directly
    const handlePrint = async () => {
        try {
            const html = generateHTML();
            await Print.printAsync({ html });
        } catch (error) {
            console.error("Print error:", error);
            Alert.alert("Error", "Gagal mencetak");
        }
    };

    const html = generateHTML();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Print Preview</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={handlePrint}
                            style={styles.actionBtn}
                        >
                            <MaterialIcons name="print" size={22} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleExportPDF}
                            disabled={exporting}
                            style={styles.actionBtn}
                        >
                            {exporting ? (
                                <ActivityIndicator size="small" color={Colors.primary} />
                            ) : (
                                <MaterialIcons name="picture-as-pdf" size={22} color="#EF4444" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* WebView */}
                <View style={styles.webViewContainer}>
                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.loadingText}>Memuat preview...</Text>
                        </View>
                    )}
                    <WebView
                        ref={webViewRef}
                        source={{ html }}
                        style={styles.webView}
                        onLoadEnd={() => setLoading(false)}
                        scalesPageToFit={true}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={true}
                    />
                </View>

                {/* Bottom Actions */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={[styles.bottomBtn, { backgroundColor: Colors.primary }]}
                        onPress={handlePrint}
                    >
                        <MaterialIcons name="print" size={20} color="#fff" />
                        <Text style={styles.bottomBtnText}>Cetak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.bottomBtn, { backgroundColor: "#EF4444" }]}
                        onPress={handleExportPDF}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
                                <Text style={styles.bottomBtnText}>Export PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.card,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.text,
    },
    headerActions: {
        flexDirection: "row",
        gap: 12,
    },
    actionBtn: {
        padding: 8,
    },
    webViewContainer: {
        flex: 1,
        position: "relative",
    },
    webView: {
        flex: 1,
        backgroundColor: "#fff",
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    loadingText: {
        marginTop: 12,
        color: Colors.muted,
    },
    bottomActions: {
        flexDirection: "row",
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.card,
    },
    bottomBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        borderRadius: 10,
        gap: 8,
    },
    bottomBtnText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
});
