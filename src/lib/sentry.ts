// Sentry Error Tracking Configuration
// Setup and utilities for crash reporting

import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

// Sentry DSN - Set this in your environment variables
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || "";

// Environment detection
const getEnvironment = () => {
    if (__DEV__) return "development";
    if (Constants.expoConfig?.extra?.isStaging) return "staging";
    return "production";
};

/**
 * Initialize Sentry for error tracking
 */
export function initSentry() {
    if (!SENTRY_DSN) {
        console.warn("[Sentry] No DSN configured, error tracking disabled");
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: getEnvironment(),
        debug: __DEV__,
        enabled: !__DEV__, // Only enable in production

        // Performance monitoring
        tracesSampleRate: 0.2, // 20% of transactions

        // Session tracking
        enableAutoSessionTracking: true,

        // Release tracking
        release: Constants.expoConfig?.version || "1.0.0",
        dist: Constants.expoConfig?.extra?.buildNumber || "1",

        // Before send hook for filtering
        beforeSend(event) {
            // Filter out specific errors if needed
            if (event.exception?.values?.[0]?.type === "NetworkError") {
                // Don't send network errors in development
                if (__DEV__) return null;
            }
            return event;
        },
    });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string) {
    Sentry.setUser({
        id: userId,
        email,
        username,
    });
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
    Sentry.setUser(null);
}

/**
 * Log a breadcrumb for debugging
 */
export function addBreadcrumb(
    message: string,
    category: string = "navigation",
    level: Sentry.SeverityLevel = "info",
    data?: Record<string, any>
) {
    Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000,
    });
}

/**
 * Capture an exception with context
 */
export function captureException(
    error: Error | unknown,
    context?: Record<string, any>
) {
    if (context) {
        Sentry.setContext("additional", context);
    }
    Sentry.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(
    message: string,
    level: Sentry.SeverityLevel = "info"
) {
    Sentry.captureMessage(message, level);
}

/**
 * Start a performance span
 */
export function startSpan(name: string, op: string = "custom") {
    return Sentry.startSpan({ name, op }, () => { });
}

/**
 * Wrap a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
    fn: T,
    context?: string
): T {
    return ((...args: Parameters<T>) => {
        try {
            const result = fn(...args);
            if (result instanceof Promise) {
                return result.catch((error) => {
                    captureException(error, { context, args });
                    throw error;
                });
            }
            return result;
        } catch (error) {
            captureException(error, { context, args });
            throw error;
        }
    }) as T;
}

// Re-export Sentry for direct access if needed
export { Sentry };
