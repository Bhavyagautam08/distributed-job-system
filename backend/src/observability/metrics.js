import { EventEmitter } from "node:events";

const requestMetricsChanged = new EventEmitter();

export const metrics = {
    requests: 0,
    successfulRequests: 0,
    clientErrors: 0,
    serverErrors: 0,
    totalLatencyMs: 0,
    jobsCreated: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    activeConnections: 0,

    recordRequest(statusCode, latencyMs) {
        this.requests++;
        this.totalLatencyMs += latencyMs;
        if (statusCode < 400) this.successfulRequests++;
        else if (statusCode < 500) this.clientErrors++;
        else this.serverErrors++;
        requestMetricsChanged.emit("updated", this.getRequestMetrics());
    },
    incrementJobCreated() { this.jobsCreated++; },
    incrementJobCompleted() { this.jobsCompleted++; },
    incrementJobFailed() { this.jobsFailed++; },

    getRequestMetrics() {
        return {
            total: this.requests,
            successful: this.successfulRequests,
            clientErrors: this.clientErrors,
            serverErrors: this.serverErrors,
            averageLatencyMs: this.requests ? this.totalLatencyMs / this.requests : 0
        };
    },
    onRequestMetricsUpdated(listener) {
        requestMetricsChanged.on("updated", listener);
        return () => requestMetricsChanged.off("updated", listener);
    }
};
