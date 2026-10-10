import { env } from "../config/env.js";

const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
const maxRequests = env.RATE_LIMIT_MAX_REQUESTS;
const clients = new Map();

export function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;

    if (!clients.has(ip)) {
        clients.set(ip, { count: 1, resetTime: Date.now() + windowMs });
    } else {
        const client = clients.get(ip);
        if (Date.now() > client.resetTime) {
            client.count = 1;
            client.resetTime = Date.now() + windowMs;
        } else {
            client.count++;
            if (client.count > maxRequests) {
                return res.status(429).json({
                    success: false,
                    error: "Too Many Requests",
                    message: "Rate limit exceeded"
                });
            }
        }
    }

    next();
}
