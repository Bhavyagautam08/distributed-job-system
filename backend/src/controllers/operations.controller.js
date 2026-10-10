import { checkDatabaseConnection } from "../config/database.js";
import { checkRedisConnection } from "../config/redis.js";
import { metrics } from "../observability/metrics.js";
import { getDashboardData, getQueueData, getWorkerLeases } from "../services/dashboard.query.service.js";

export async function readinessCheck(req, res) {
    const results = await Promise.allSettled([
        checkDatabaseConnection(),
        checkRedisConnection()
    ]);
    const checks = {
        database: results[0].status === "fulfilled" ? "up" : "down",
        redis: results[1].status === "fulfilled" ? "up" : "down"
    };
    const ready = Object.values(checks).every((status) => status === "up");
    return res.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not_ready",
        checks,
        timestamp: new Date().toISOString()
    });
}

export function metricsSnapshot(req, res) {
    const memory = process.memoryUsage();
    return res.json({
        metrics: {
            process: { uptimeSeconds: process.uptime() },
            memory: {
                rss: memory.rss,
                heapTotal: memory.heapTotal,
                heapUsed: memory.heapUsed,
                external: memory.external,
                arrayBuffers: memory.arrayBuffers
            },
            requests: metrics.getRequestMetrics()
        },
        timestamp: new Date().toISOString()
    });
}

export function metricsStream(req, res) {
    res.status(200);
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    res.flushHeaders();

    const sendMetrics = (requestMetrics) => {
        if (!res.writableEnded && !res.destroyed) {
            res.write(`event: request-metrics\ndata: ${JSON.stringify(requestMetrics)}\n\n`);
        }
    };
    const unsubscribe = metrics.onRequestMetricsUpdated(sendMetrics);
    const heartbeat = setInterval(() => {
        if (!res.writableEnded && !res.destroyed) res.write(": keep-alive\n\n");
    }, 25000);

    sendMetrics(metrics.getRequestMetrics());
    req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
    });
}

export async function dashboardSnapshot(req, res, next) {
    try {
        const data = await getDashboardData(req.user.id, req.query.range || "15m");
        return res.json({ success: true, ...data, requestId: req.requestId });
    } catch (error) {
        next(error);
    }
}

export async function workersSnapshot(req, res, next) {
    try {
        const workers = await getWorkerLeases(req.user.id);
        return res.json({
            success: true,
            workers: workers.map((worker) => ({
                id: worker.id,
                activeJobs: worker.active_jobs,
                jobIds: worker.job_ids,
                lastActivityAt: worker.last_activity_at
            })),
            source: "active job leases",
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}

export async function queuesSnapshot(req, res, next) {
    try {
        const data = await getQueueData(req.user.id);
        return res.json({ success: true, ...data, requestId: req.requestId });
    } catch (error) {
        next(error);
    }
}
