// Performance Monitoring Utility
// API timing, database metrics, and performance tracking

import { addBreadcrumb, startSpan } from "./sentry";

// Performance metrics storage
interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private readonly MAX_METRICS = 100;
    private timers: Map<string, number> = new Map();

    /**
     * Start a timer for an operation
     */
    startTimer(name: string): void {
        this.timers.set(name, performance.now());
    }

    /**
     * End a timer and record the metric
     */
    endTimer(name: string, metadata?: Record<string, any>): number {
        const startTime = this.timers.get(name);
        if (!startTime) {
            console.warn(`[Perf] Timer "${name}" not found`);
            return 0;
        }

        const duration = performance.now() - startTime;
        this.timers.delete(name);

        this.recordMetric(name, duration, metadata);
        return duration;
    }

    /**
     * Record a performance metric
     */
    recordMetric(
        name: string,
        duration: number,
        metadata?: Record<string, any>
    ): void {
        const metric: PerformanceMetric = {
            name,
            duration,
            timestamp: Date.now(),
            metadata,
        };

        this.metrics.push(metric);

        // Trim old metrics
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }

        // Add breadcrumb for Sentry
        addBreadcrumb(
            `Perf: ${name} (${duration.toFixed(2)}ms)`,
            "performance",
            duration > 1000 ? "warning" : "info",
            { duration, ...metadata }
        );

        // Log slow operations
        if (duration > 3000) {
            console.warn(`[Perf] Slow operation: ${name} took ${duration.toFixed(2)}ms`);
        }

        if (__DEV__) {
            console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Measure an async function
     */
    async measure<T>(
        name: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        this.startTimer(name);
        try {
            return await fn();
        } finally {
            this.endTimer(name, metadata);
        }
    }

    /**
     * Measure API call with Sentry tracing
     */
    async measureAPI<T>(
        endpoint: string,
        fn: () => Promise<T>
    ): Promise<T> {
        startSpan(endpoint, "http.client");
        const start = performance.now();

        try {
            const result = await fn();
            return result;
        } finally {
            const duration = performance.now() - start;
            this.recordMetric(`API: ${endpoint}`, duration);
        }
    }

    /**
     * Get metrics summary
     */
    getSummary(): {
        averageByName: Record<string, number>;
        slowestOperations: PerformanceMetric[];
        totalMetrics: number;
    } {
        // Calculate averages by name
        const byName: Record<string, number[]> = {};
        for (const metric of this.metrics) {
            if (!byName[metric.name]) byName[metric.name] = [];
            byName[metric.name].push(metric.duration);
        }

        const averageByName: Record<string, number> = {};
        for (const [name, durations] of Object.entries(byName)) {
            averageByName[name] =
                durations.reduce((a, b) => a + b, 0) / durations.length;
        }

        // Get slowest operations
        const slowestOperations = [...this.metrics]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10);

        return {
            averageByName,
            slowestOperations,
            totalMetrics: this.metrics.length,
        };
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
        this.timers.clear();
    }

    /**
     * Get all metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }
}

// Export singleton
export const perfMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
        return perfMonitor.measure(
            `${target.constructor.name}.${propertyKey}`,
            () => originalMethod.apply(this, args)
        );
    };

    return descriptor;
}

// Re-export types
export type { PerformanceMetric };
