import { metrics } from "../observability/metrics.js";

export function requestObservability(req, res, next) {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const timeMs = Number(process.hrtime.bigint() - start) / 1e6;

        console.log(`[HTTP] ${req.method} ${req.url} ${res.statusCode} - ${timeMs.toFixed(2)}ms - reqId:${req.requestId}`);
        metrics.recordRequest(res.statusCode, timeMs);
    });

    next();
}
