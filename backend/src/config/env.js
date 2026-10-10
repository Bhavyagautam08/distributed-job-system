import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT:
        z.coerce.number().default(5000),

    DATABASE_URL:
        z.string().min(1),

    UPSTASH_REDIS_REST_URL:
        z.string().url(),

    UPSTASH_REDIS_REST_TOKEN:
        z.string().min(1),

    RATE_LIMIT_WINDOW_SECONDS:
        z.coerce.number()
            .int()
            .positive()
            .default(60),

    RATE_LIMIT_MAX_REQUESTS:
        z.coerce.number()
            .int()
            .positive()
            .default(100),

    SESSION_TTL_SECONDS:
        z.coerce.number()
            .int()
            .positive()
            .default(604800),

    FRONTEND_ORIGIN:
        z.string()
            .url()
            .optional(),

    JOB_MAX_ATTEMPTS:
        z.coerce.number()
            .int()
            .positive()
            .default(3),

    BACKOFF_BASE_MS:
        z.coerce.number()
            .int()
            .positive()
            .default(1000),

    BACKOFF_MAX_MS:
        z.coerce.number()
            .int()
            .positive()
            .default(30000),

    WORKER_ID:
        z.string()
            .min(1)
            .default("worker-1"),

    WORKER_SHUTDOWN_TIMEOUT_MS:
        z.coerce.number()
            .int()
            .positive()
            .default(30000)
});

const parsedEnv =
    envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error(
        "Invalid environment configuration:"
    );

    console.error(
        parsedEnv.error.flatten().fieldErrors
    );

    process.exit(1);
}

export const env =
    parsedEnv.data;