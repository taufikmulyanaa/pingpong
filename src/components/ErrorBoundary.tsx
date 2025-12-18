// Error Boundary Component
// Catches React errors and reports to Sentry

import React, { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { captureException, addBreadcrumb } from "../lib/sentry";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to Sentry
        captureException(error, {
            componentStack: errorInfo.componentStack,
        });

        // Add breadcrumb
        addBreadcrumb(
            `Error boundary caught: ${error.message}`,
            "error",
            "error"
        );

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        // Log in development
        if (__DEV__) {
            console.error("ErrorBoundary caught an error:", error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>😵</Text>
                    <Text style={styles.title}>Oops! Terjadi Kesalahan</Text>
                    <Text style={styles.message}>
                        Maaf, terjadi kesalahan yang tidak terduga.{"\n"}
                        Tim kami sudah diberitahu dan sedang memperbaiki.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <Text style={styles.errorText}>
                            {this.state.error.message}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={this.handleRetry}
                    >
                        <Text style={styles.retryButtonText}>Coba Lagi</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

// Screen-level error boundary wrapper
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#1a1a2e",
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#ffffff",
        marginBottom: 12,
        textAlign: "center",
    },
    message: {
        fontSize: 16,
        color: "#a0a0a0",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 24,
    },
    errorText: {
        fontSize: 12,
        color: "#ff6b6b",
        textAlign: "center",
        marginBottom: 24,
        padding: 12,
        backgroundColor: "rgba(255, 107, 107, 0.1)",
        borderRadius: 8,
    },
    retryButton: {
        backgroundColor: "#f7b32b",
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 8,
    },
    retryButtonText: {
        color: "#1a1a2e",
        fontSize: 16,
        fontWeight: "bold",
    },
});
