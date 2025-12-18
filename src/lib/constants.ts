// PingpongHub Color Palette - Updated 2024-12-18
export const Colors = {
    // Primary palette (Navy theme)
    primary: "#001064",       // Medium Blue (Royal Blue)
    secondary: "#001064",     // Dark Navy
    accent: "#FFEB00",        // Bright Yellow
    darkblue: "#001064",      // Dark Navy
    navyDeep: "#001064",      // Dark Navy (alias)
    blueMid: "#001064",       // Medium Blue
    blueLight: "#7B9BD4",     // Light Blue
    yellow: "#FFEB00",        // Bright Yellow

    // Light mode only
    background: "#FFFFFF",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    text: "#001064",          // Dark Navy text
    textSecondary: "#001064", // Medium Blue text
    muted: "#6B7280",
    border: "#E5E7EB",

    // Status colors
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#001064",
};

export const GripStyles = {
    SHAKEHAND: "Shakehand",
    PENHOLD: "Penhold",
    SEEMILLER: "Seemiller",
} as const;

export const PlayStyles = {
    OFFENSIVE: "Offensive",
    DEFENSIVE: "Defensive",
    ALLROUND: "All-Round",
} as const;

export const MatchTypes = {
    RANKED: "Ranked",
    FRIENDLY: "Friendly",
    TOURNAMENT: "Turnamen",
} as const;

export const MatchStatuses = {
    PENDING: "Pending",
    IN_PROGRESS: "Berlangsung",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
} as const;

export const DEFAULT_RATING = 1000;
export const DEFAULT_LEVEL = 1;
export const XP_PER_LEVEL = 1000;

export const LEVEL_TITLES: Record<number, string> = {
    1: "Pemula",
    5: "Amatir",
    10: "Semi-Pro",
    15: "Pro",
    20: "Master",
    25: "Grandmaster",
    30: "Legend",
};

export const getLevelTitle = (level: number): string => {
    const levels = Object.keys(LEVEL_TITLES)
        .map(Number)
        .sort((a, b) => b - a);

    for (const lvl of levels) {
        if (level >= lvl) {
            return LEVEL_TITLES[lvl];
        }
    }
    return "Pemula";
};

export const calculateLevel = (xp: number): number => {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
};

export const getXpProgress = (xp: number): { current: number; max: number; percentage: number } => {
    const currentLevelXp = xp % XP_PER_LEVEL;
    return {
        current: currentLevelXp,
        max: XP_PER_LEVEL,
        percentage: (currentLevelXp / XP_PER_LEVEL) * 100,
    };
};

export const Facilities = [
    { id: "AC", label: "AC", icon: "ac-unit" },
    { id: "PARKING", label: "Parkir", icon: "local-parking" },
    { id: "WIFI", label: "WiFi", icon: "wifi" },
    { id: "CANTEEN", label: "Kantin", icon: "restaurant" },
    { id: "TOILET", label: "Toilet", icon: "wc" },
    { id: "MUSHOLLA", label: "Musholla", icon: "mosque" },
    { id: "LOCKER", label: "Locker", icon: "lock" },
] as const;

// Re-export shared styles (no circular dependency now)
export { Spacing, BorderRadius, FontSize, ExtendedColors, SharedStyles, Shadows, getCardBackground, getTextColor, getMutedColor } from "./Styles";
