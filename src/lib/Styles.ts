import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from "react-native";

/**
 * PingpongHub Design System
 * Berdasarkan halaman Home sebagai patokan design
 */

// ============================================
// BASE COLORS (defined here to avoid circular dependency)
// ============================================
const BaseColors = {
    primary: "#001064",
    secondary: "#001064",
    accent: "#FFEB00",
    background: "#FFFFFF",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    text: "#001064",
    textSecondary: "#001064",
    muted: "#6B7280",
    border: "#E5E7EB",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#001064",
};

// ============================================
// SPACING & SIZING
// ============================================
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const BorderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 14,
    xl: 16,
    xxl: 20,
    round: 999,
} as const;

export const FontSize = {
    xs: 10,
    sm: 11,
    md: 12,
    base: 14,
    lg: 15,
    xl: 16,
    xxl: 18,
    xxxl: 20,
    display: 24,
    hero: 28,
} as const;

// ============================================
// COLOR EXTENSIONS (from Home design)
// ============================================
export const ExtendedColors = {
    ...BaseColors,
    // Highlight colors
    gold: "#F59E0B",
    goldLight: "rgba(245,158,11,0.1)",
    goldSubtle: "rgba(245,158,11,0.08)",

    green: "#22C55E",
    greenLight: "rgba(34,197,94,0.1)",

    red: "#EF4444",
    redLight: "rgba(239,68,68,0.1)",

    purple: "#8B5CF6",
    purpleLight: "rgba(139,92,246,0.1)",

    // Navy theme
    navy: "#001064",
    navyLight: "rgba(0,16,100,0.08)",

    // Glassmorphism
    glassBg: "rgba(255,255,255,0.08)",
    glassBorder: "rgba(255,255,255,0.1)",
    glassText: "rgba(255,255,255,0.8)",
    glassTextMuted: "rgba(255,255,255,0.5)",

    // Card colors
    cardBorder: "rgba(0,0,0,0.05)",
    cardBorderDark: "rgba(0,0,0,0.1)",
    subtleBg: "rgba(0,0,0,0.03)",
} as const;

// ============================================
// SHARED STYLES
// ============================================
export const SharedStyles = StyleSheet.create({
    // ============ LAYOUT ============
    container: {
        flex: 1,
        backgroundColor: BaseColors.background,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.xxl,
    },

    // ============ HEADER - NAVY STYLE ============
    headerNavy: {
        backgroundColor: ExtendedColors.navy,
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xxl + 8,
        borderBottomRightRadius: BorderRadius.xxl + 8,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },

    // ============ GLASSMORPHISM CARD ============
    glassCard: {
        backgroundColor: ExtendedColors.glassBg,
        borderRadius: BorderRadius.xxl,
        padding: 18,
        gap: Spacing.lg,
        borderWidth: 1,
        borderColor: ExtendedColors.glassBorder,
    },

    // ============ SECTION HEADER ============
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSize.xxl,
        fontWeight: "bold",
    },
    seeAllText: {
        color: BaseColors.primary,
        fontSize: FontSize.base,
        fontWeight: "500",
    },

    // ============ CARD STYLES ============
    card: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: ExtendedColors.cardBorder,
    },
    cardHighlightPrimary: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        backgroundColor: ExtendedColors.navyLight,
        borderWidth: 2,
        borderColor: BaseColors.primary,
    },
    cardHighlightGold: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        backgroundColor: ExtendedColors.goldSubtle,
        borderWidth: 2,
        borderColor: ExtendedColors.gold,
    },
    cardHighlightGreen: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        backgroundColor: ExtendedColors.greenLight,
        borderWidth: 2,
        borderColor: ExtendedColors.green,
    },

    // ============ AVATAR STYLES ============
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarMedium: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarXL: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    onlineIndicator: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: ExtendedColors.green,
        borderWidth: 2,
        borderColor: "#fff",
    },

    // ============ BUTTON STYLES ============
    buttonPrimary: {
        backgroundColor: BaseColors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonPrimaryText: {
        color: "#fff",
        fontSize: FontSize.base,
        fontWeight: "600",
    },
    buttonOutline: {
        backgroundColor: "transparent",
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: BaseColors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonOutlineText: {
        color: BaseColors.primary,
        fontSize: FontSize.base,
        fontWeight: "600",
    },
    buttonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.12)",
        justifyContent: "center",
        alignItems: "center",
    },
    buttonCircleSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
    },

    // ============ BADGE STYLES ============
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    badgeGold: {
        backgroundColor: ExtendedColors.gold,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.xxl,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    badgeText: {
        fontSize: FontSize.sm,
        fontWeight: "600",
    },
    notificationBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: ExtendedColors.red,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: ExtendedColors.navy,
    },
    notificationBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: "700",
        color: "#fff",
    },

    // ============ ICON GLOW EFFECT ============
    iconGlow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: ExtendedColors.goldLight,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: ExtendedColors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,
    },

    // ============ PROGRESS BAR ============
    progressBar: {
        height: 6,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: ExtendedColors.gold,
        borderRadius: 3,
    },
    progressFillGlow: {
        height: "100%",
        backgroundColor: ExtendedColors.gold,
        borderRadius: 3,
        shadowColor: ExtendedColors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },

    // ============ STAT DISPLAY ============
    statRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statValue: {
        fontSize: FontSize.xl,
        fontWeight: "700",
    },
    statLabel: {
        fontSize: FontSize.sm,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.15)",
    },

    // ============ LIST ITEM ============
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: ExtendedColors.cardBorder,
    },

    // ============ DIVIDER ============
    dividerHorizontal: {
        height: 1,
        backgroundColor: ExtendedColors.cardBorder,
    },
    dividerVertical: {
        width: 1,
        backgroundColor: ExtendedColors.cardBorder,
    },

    // ============ EMPTY STATE ============
    emptyState: {
        padding: 32,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderStyle: "dashed",
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: FontSize.xl,
        fontWeight: "600",
        marginTop: Spacing.md,
    },
    emptyDescription: {
        fontSize: FontSize.md,
        textAlign: "center",
        marginTop: Spacing.xs,
    },

    // ============ LIVE TAG ============
    liveTag: {
        backgroundColor: "#EF4444",
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.xs,
    },
    liveTagText: {
        color: "#fff",
        fontSize: FontSize.xs,
        fontWeight: "bold",
    },

    // ============ ACCEPT/DECLINE BUTTONS ============
    acceptBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: ExtendedColors.green,
        justifyContent: "center",
        alignItems: "center",
    },
    declineBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: ExtendedColors.redLight,
        justifyContent: "center",
        alignItems: "center",
    },

    // ============ ROW LAYOUTS ============
    rowCenter: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    rowStart: {
        flexDirection: "row",
        alignItems: "flex-start",
    },

    // ============ TEXT STYLES ============
    textWhite: {
        color: "#fff",
    },
    textMuted: {
        color: BaseColors.muted,
    },
    textPrimary: {
        color: BaseColors.primary,
    },
    textGold: {
        color: ExtendedColors.gold,
    },
    textGreen: {
        color: ExtendedColors.green,
    },
    textRed: {
        color: ExtendedColors.red,
    },
});

// ============================================
// SHADOW PRESETS
// ============================================
export const Shadows = {
    sm: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    }),
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================
export const getCardBackground = (isDark: boolean) =>
    isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF";

export const getTextColor = (isDark: boolean) =>
    isDark ? "#FFFFFF" : BaseColors.text;

export const getMutedColor = (isDark: boolean) =>
    isDark ? "rgba(255,255,255,0.5)" : BaseColors.muted;
