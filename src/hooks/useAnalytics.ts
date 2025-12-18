// useAnalytics Hook
// Screen tracking and event helpers for components

import { useEffect, useRef, useCallback } from "react";
import { analytics } from "../lib/analytics";
import { useAuth } from "../lib/auth";

/**
 * Hook to track screen views
 */
export function useScreenTracking(screenName: string) {
    const hasTracked = useRef(false);

    useEffect(() => {
        if (!hasTracked.current) {
            analytics.screenView(screenName);
            hasTracked.current = true;
        }
    }, [screenName]);
}

/**
 * Hook to initialize analytics with user
 */
export function useAnalyticsInit() {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            analytics.init(user.id);
        } else {
            analytics.reset();
        }
    }, [user]);
}

/**
 * Hook for match analytics
 */
export function useMatchAnalytics() {
    const trackMatchStarted = useCallback(
        (matchId: string, matchType: string) => {
            analytics.matchStarted(matchId, matchType);
        },
        []
    );

    const trackMatchCompleted = useCallback(
        (matchId: string, isWin: boolean, ratingChange: number) => {
            analytics.matchCompleted(matchId, isWin, ratingChange);
        },
        []
    );

    return { trackMatchStarted, trackMatchCompleted };
}

/**
 * Hook for social analytics
 */
export function useSocialAnalytics() {
    const trackChallengeSent = useCallback(
        (challengedId: string, matchType: string) => {
            analytics.challengeSent(challengedId, matchType);
        },
        []
    );

    const trackChallengeResponded = useCallback(
        (challengeId: string, accepted: boolean) => {
            analytics.challengeResponded(challengeId, accepted);
        },
        []
    );

    return { trackChallengeSent, trackChallengeResponded };
}

/**
 * Hook for achievement analytics
 */
export function useAchievementAnalytics() {
    const trackBadgeEarned = useCallback(
        (badgeCode: string, badgeName: string) => {
            analytics.badgeEarned(badgeCode, badgeName);
        },
        []
    );

    const trackLevelUp = useCallback((newLevel: number) => {
        analytics.levelUp(newLevel);
    }, []);

    return { trackBadgeEarned, trackLevelUp };
}

/**
 * Hook for search analytics
 */
export function useSearchAnalytics() {
    const trackSearch = useCallback((query: string, resultCount: number) => {
        analytics.search(query, resultCount);
    }, []);

    return { trackSearch };
}
