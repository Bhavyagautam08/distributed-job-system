import express from "express";
import { randomUUID } from "crypto";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { requestObservability } from "./middleware/request-observability.middleware.js";
import { rateLimit } from "./middleware/rate-limit.middleware.js";
import { healthCheck } from "./controllers/health.controller.js";
import {
    dashboardSnapshot,
    metricsSnapshot,
    metricsStream,
    queuesSnapshot,
    readinessCheck,
    workersSnapshot
} from "./controllers/operations.controller.js";
import jobRoutes from "./routes/job.routes.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"] || randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
});

app.use(requestObservability);
app.use(rateLimit);

app.get("/api/health", healthCheck);
app.get("/api/ready", readinessCheck);
app.get("/api/metrics", metricsSnapshot);
app.get("/api/metrics/stream", metricsStream);
app.get("/api/overview", dashboardSnapshot);
app.get("/api/workers", workersSnapshot);
app.get("/api/queues", queuesSnapshot);
app.use("/api/jobs", jobRoutes);
app.use(errorMiddleware);

export default app;