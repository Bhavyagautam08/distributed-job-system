import { env } from "../config/env.js";

export function frontendOrigin(req, res, next) {
    const origin = req.get("Origin");
    if (!env.FRONTEND_ORIGIN || !origin) {
        return next();
    }

    if (origin !== env.FRONTEND_ORIGIN) {
        return res.status(403).json({
            success: false,
            error: { message: "Origin is not allowed" },
            requestId: req.requestId
        });
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key, X-Request-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    return next();
}
