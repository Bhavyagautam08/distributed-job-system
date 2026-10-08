import express from "express";
import { randomUUID } from "crypto";
import { errorMiddleware } from "./middleware/error.middleware.js";
import jobRoutes from "./routes/job.routes.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
    const requestId = req.headers["x-request-id"] || randomUUID();

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    next();
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        service: "distributed-job-system",
        status: "healthy",
        requestId: req.requestId
    });
});
app.use("/api/jobs", jobRoutes); 
app.use(errorMiddleware);

export default app;