// Business Logic Utilities
// ELO Rating, Leveling, XP, and Game Logic

import { supabase } from "./supabase";
import { calculateElo, awardBadge, findMatch } from "./api";
import { Profile, Badge, Match } from "../types/database";

// ============================================================
// LEVEL & XP SYSTEM
// ============================================================

// Level titles in Indonesian
export const LEVEL_TITLES: Record<number, string> = {
    1: "Pemula",
    5: "Amatir",
    10: "Intermediate",
    15: "Semi-Pro",
    20: "Advanced",
    25: "Pro Player",
    30: "Expert",
    35: "Elite",
    40: "Master",
    45: "Grand Master",
    50: "Legend",
};

/**
 * Get title for a level
 */
export function getLevelTitle(level: number): string {
    // Find the highest title threshold that is <= level
    const thresholds = Object.keys(LEVEL_TITLES)
        .map(Number)
        .sort((a, b) => b - a);

    for (const threshold of thresholds) {
        if (level >= threshold) {
            return LEVEL_TITLES[threshold];
        }
    }
    return "Pemula";
}

/**
 * Calculate XP required for a level
 */
export function getXPForLevel(level: number): number {
    if (level <= 1) return 0;
    if (level <= 5) return (level - 1) * 250;
    if (level <= 10) return 1000 + (level - 5) * 800;
    if (level <= 20) return 5000 + (level - 10) * 1500;
    if (level <= 30) return 20000 + (level - 20) * 3000;
    if (level <= 40) return 50000 + (level - 30) * 5000;
    return 100000 + (level - 40) * 10000;
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(xp: number): number {
    let level = 1;
    while (getXPForLevel(level + 1) <= xp && level < 100) {
        level++;
    }
    return level;
}

/**
 * Get XP progress within current level
 */
export function getLevelProgress(xp: number): {
    currentLevel: number;
    currentLevelXP: number;
    nextLevelXP: number;
    progressXP: number;
    progressPercent: number;
} {
    const currentLevel = getLevelFromXP(xp);
    const currentLevelXP = getXPForLevel(currentLevel);
    const nextLevelXP = getXPForLevel(currentLevel + 1);
    const progressXP = xp - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    const progressPercent = Math.min(100, Math.round((progressXP / xpNeeded) * 100));

    return {
        currentLevel,
        currentLevelXP,
        nextLevelXP,
        progressXP,
        progressPercent,
    };
}

// ============================================================
// ELO RATING SYSTEM
// ============================================================

// Rating tiers
export const RATING_TIERS = [
    { min: 0, max: 999, name: "Bronze", color: "#CD7F32" },
    { min: 1000, max: 1199, name: "Silver", color: "#C0C0C0" },
    { min: 1200, max: 1399, name: "Gold", color: "#FFD700" },
    { min: 1400, max: 1599, name: "Platinum", color: "#E5E4E2" },
    { min: 1600, max: 1799, name: "Diamond", color: "#B9F2FF" },
    { min: 1800, max: 1999, name: "Master", color: "#9932CC" },
    { min: 2000, max: 2199, name: "Grandmaster", color: "#FF4500" },
    { min: 2200, max: 9999, name: "Legend", color: "#FFD700" },
];

/**
 * Get rating tier for a rating
 */
export function getRatingTier(rating: number): {
    name: string;
    color: string;
    min: number;
    max: number;
} {
    for (const tier of RATING_TIERS) {
        if (rating >= tier.min && rating <= tier.max) {
            return tier;
        }
    }
    return RATING_TIERS[0];
}

/**
 * Calculate expected score based on ELO formula
 */
export function calculateExpectedScore(
    playerRating: number,
    opponentRating: number
): number {
    return 1.0 / (1.0 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate K-factor based on total matches
 */
export function getKFactor(totalMatches: number): number {
    if (totalMatches < 30) return 32; // New player
    if (totalMatches < 100) return 24; // Intermediate
    return 16; // Veteran
}

/**
 * Predict rating change for a match
 */
export function predictRatingChange(
    playerRating: number,
    opponentRating: number,
    playerTotalMatches: number,
    isWin: boolean
): number {
    const expected = calculateExpectedScore(playerRating, opponentRating);
    const actual = isWin ? 1.0 : 0.0;
    const k = getKFactor(playerTotalMatches);
    return Math.round(k * (actual - expected));
}

// ============================================================
// MATCH UTILITIES
// ============================================================

/**
 * Determine match winner based on set scores
 */
export function determineMatchWinner(
    sets: { player1_score: number; player2_score: number }[],
    bestOf: number
): "player1" | "player2" | null {
    const setsToWin = Math.ceil(bestOf / 2);
    let player1Sets = 0;
    let player2Sets = 0;

    for (const set of sets) {
        if (set.player1_score > set.player2_score) {
            player1Sets++;
        } else if (set.player2_score > set.player1_score) {
            player2Sets++;
        }
    }

    if (player1Sets >= setsToWin) return "player1";
    if (player2Sets >= setsToWin) return "player2";
    return null;
}

/**
 * Check if a set is valid (someone won with proper score)
 */
export function isValidSetScore(
    player1Score: number,
    player2Score: number
): boolean {
    const max = Math.max(player1Score, player2Score);
    const min = Math.min(player1Score, player2Score);

    // Standard win: 11 or more with 2+ point lead
    if (max >= 11 && max - min >= 2) return true;

    // Deuce: winning score is 2 more than opponent when both >= 10
    if (min >= 10 && max - min === 2) return true;

    return false;
}

/**
 * Calculate win rate percentage
 */
export function calculateWinRate(wins: number, losses: number): number {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
}

// ============================================================
// BADGE UTILITIES
// ============================================================

// Badge category colors
export const BADGE_CATEGORY_COLORS: Record<string, string> = {
    COMPETITION: "#F59E0B", // Amber
    PERFORMANCE: "#10B981", // Emerald
    SOCIAL: "#3B82F6", // Blue
    SPECIAL: "#8B5CF6", // Purple
};

/**
 * Get badge category color
 */
export function getBadgeCategoryColor(category: string): string {
    return BADGE_CATEGORY_COLORS[category] || "#6B7280";
}

/**
 * Group badges by category
 */
export function groupBadgesByCategory(badges: Badge[]): Record<string, Badge[]> {
    return badges.reduce((acc, badge) => {
        const category = badge.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(badge);
        return acc;
    }, {} as Record<string, Badge[]>);
}

/**
 * Calculate badge progress
 */
export function calculateBadgeProgress(
    profile: Profile,
    badge: Badge
): { current: number; target: number; percent: number } {
    const code = badge.code;
    let current = 0;
    let target = 0;

    // Match badges
    if (code.startsWith("MATCH_")) {
        target = parseInt(code.replace("MATCH_", "")) || 1;
        current = profile.total_matches;
    }
    // Win badges
    else if (code.startsWith("WIN_")) {
        target = parseInt(code.replace("WIN_", "")) || 1;
        current = profile.wins;
    }
    // Streak badges
    else if (code.startsWith("STREAK_")) {
        target = parseInt(code.replace("STREAK_", "")) || 1;
        current = profile.best_streak;
    }
    // Rating badges
    else if (code.startsWith("RATING_")) {
        target = parseInt(code.replace("RATING_", "")) || 1000;
        current = profile.rating_mr;
    }
    // Level badges
    else if (code.startsWith("LEVEL_")) {
        target = parseInt(code.replace("LEVEL_", "")) || 1;
        current = profile.level;
    }
    // First match/win
    else if (code === "FIRST_MATCH") {
        target = 1;
        current = Math.min(1, profile.total_matches);
    } else if (code === "FIRST_WIN") {
        target = 1;
        current = Math.min(1, profile.wins);
    }

    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    return { current, target, percent };
}

// ============================================================
// QUICK MATCH UTILITIES
// ============================================================

/**
 * Find quick match opponents
 */
export async function findQuickMatchOpponents(
    userId: string,
    options?: {
        ratingRange?: number;
        maxDistanceKm?: number;
    }
) {
    return findMatch(userId, {
        ratingRange: options?.ratingRange || 150,
        maxDistanceKm: options?.maxDistanceKm || 50,
        matchType: "RANKED",
        autoCreateChallenge: false,
    });
}

/**
 * Create quick match with best opponent
 */
export async function createQuickMatch(
    userId: string,
    matchType: "RANKED" | "FRIENDLY" = "RANKED"
) {
    return findMatch(userId, {
        ratingRange: 200,
        maxDistanceKm: 100,
        matchType,
        autoCreateChallenge: true,
    });
}

// ============================================================
// STATS UTILITIES
// ============================================================

/**
 * Get player statistics summary
 */
export function getPlayerStats(profile: Profile) {
    return {
        rating: profile.rating_mr,
        tier: getRatingTier(profile.rating_mr),
        level: profile.level,
        title: getLevelTitle(profile.level),
        xp: profile.xp,
        levelProgress: getLevelProgress(profile.xp),
        matches: profile.total_matches,
        wins: profile.wins,
        losses: profile.losses,
        winRate: calculateWinRate(profile.wins, profile.losses),
        currentStreak: profile.current_streak,
        bestStreak: profile.best_streak,
    };
}

/**
 * Compare two players
 */
export function comparePlayers(player1: Profile, player2: Profile) {
    return {
        ratingDiff: player1.rating_mr - player2.rating_mr,
        levelDiff: player1.level - player2.level,
        winRateDiff:
            calculateWinRate(player1.wins, player1.losses) -
            calculateWinRate(player2.wins, player2.losses),
        player1WinProbability: calculateExpectedScore(
            player1.rating_mr,
            player2.rating_mr
        ),
        player2WinProbability: calculateExpectedScore(
            player2.rating_mr,
            player1.rating_mr
        ),
    };
}
