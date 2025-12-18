// Analytics Tracking Utility
// User behavior and event tracking

import { supabase } from "./supabase";
import { addBreadcrumb } from "./sentry";

// Event types
type EventType =
    | "screen_view"
    | "match_started"
    | "match_completed"
    | "challenge_sent"
    | "challenge_accepted"
    | "challenge_declined"
    | "badge_earned"
    | "level_up"
    | "friend_added"
    | "message_sent"
    | "venue_visited"
    | "tournament_joined"
    | "quick_match"
    | "profile_updated"
    | "search"
    | "error";

interface AnalyticsEvent {
    type: EventType;
    screen?: string;
    properties?: Record<string, any>;
    timestamp?: string;
}

// Analytics singleton
class Analytics {
    private userId: string | null = null;
    private sessionId: string | null = null;
    private queue: AnalyticsEvent[] = [];
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private readonly FLUSH_INTERVAL = 30000; // 30 seconds
    private readonly MAX_QUEUE_SIZE = 50;

    /**
     * Initialize analytics with user ID
     */
    init(userId: string) {
        this.userId = userId;
        this.sessionId = this.generateSessionId();
        this.startFlushInterval();

        // Track session start
        this.track("screen_view", { screen: "app_open" });
    }

    /**
     * Reset analytics on logout
     */
    reset() {
        this.flush();
        this.userId = null;
        this.sessionId = null;
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    /**
     * Track an event
     */
    track(type: EventType, properties?: Record<string, any>) {
        const event: AnalyticsEvent = {
            type,
            properties,
            timestamp: new Date().toISOString(),
        };

        this.queue.push(event);

        // Add breadcrumb for Sentry
        addBreadcrumb(`Analytics: ${type}`, "analytics", "info", properties);

        // Flush if queue is full
        if (this.queue.length >= this.MAX_QUEUE_SIZE) {
            this.flush();
        }
    }

    /**
     * Track screen view
     */
    screenView(screenName: string, properties?: Record<string, any>) {
        this.track("screen_view", { screen: screenName, ...properties });
    }

    /**
     * Track match events
     */
    matchStarted(matchId: string, matchType: string) {
        this.track("match_started", { match_id: matchId, match_type: matchType });
    }

    matchCompleted(matchId: string, isWin: boolean, ratingChange: number) {
        this.track("match_completed", {
            match_id: matchId,
            is_win: isWin,
            rating_change: ratingChange,
        });
    }

    /**
     * Track social events
     */
    challengeSent(challengedId: string, matchType: string) {
        this.track("challenge_sent", { challenged_id: challengedId, match_type: matchType });
    }

    challengeResponded(challengeId: string, accepted: boolean) {
        this.track(accepted ? "challenge_accepted" : "challenge_declined", {
            challenge_id: challengeId,
        });
    }

    /**
     * Track achievement events
     */
    badgeEarned(badgeCode: string, badgeName: string) {
        this.track("badge_earned", { badge_code: badgeCode, badge_name: badgeName });
    }

    levelUp(newLevel: number) {
        this.track("level_up", { new_level: newLevel });
    }

    /**
     * Track search
     */
    search(query: string, resultCount: number) {
        this.track("search", { query, result_count: resultCount });
    }

    /**
     * Track errors
     */
    error(errorType: string, message: string) {
        this.track("error", { error_type: errorType, message });
    }

    /**
     * Flush events to backend
     */
    async flush() {
        if (this.queue.length === 0 || !this.userId) return;

        const events = [...this.queue];
        this.queue = [];

        try {
            // Store analytics in Supabase
            const analyticsData = events.map((event) => ({
                user_id: this.userId,
                session_id: this.sessionId,
                event_type: event.type,
                properties: event.properties,
                created_at: event.timestamp,
            }));

            // Log for now - implement your analytics storage
            if (__DEV__) {
                console.log("[Analytics] Flushing events:", analyticsData.length);
            }

            // TODO: Uncomment when analytics table is created
            // await supabase.from("analytics_events").insert(analyticsData);
        } catch (error) {
            // Re-add events on failure
            this.queue = [...events, ...this.queue];
            console.error("[Analytics] Flush failed:", error);
        }
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    private startFlushInterval() {
        if (this.flushInterval) return;
        this.flushInterval = setInterval(() => this.flush(), this.FLUSH_INTERVAL);
    }
}

// Export singleton instance
export const analytics = new Analytics();

// Export types
export type { EventType, AnalyticsEvent };
