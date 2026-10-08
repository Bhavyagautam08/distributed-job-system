import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    // Server
    PORT: z.coerce.number().default(5000),

    // PostgreSQL
    DATABASE_URL: z.string().min(1),

    // Upstash Redis
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    // Rate Limiting
    RATE_LIMIT_WINDOW_SECONDS: z.coerce
        .number()
        .positive()
        .default(60),

    RATE_LIMIT_MAX_REQUESTS: z.coerce
        .number()
        .positive()
        .default(100),

    // Job Processing
    JOB_MAX_ATTEMPTS: z.coerce
        .number()
        .int()
        .positive()
        .default(3),

    // Retry / Exponential Backoff
    BACKOFF_BASE_MS: z.coerce
        .number()
        .positive()
        .default(1000),

    BACKOFF_MAX_MS: z.coerce
        .number()
        .positive()
        .default(30000),

    // Worker
    WORKER_ID: z.string().min(1).default("worker-1")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error(
        "Invalid environment configuration:"
    );

    console.error(
        parsedEnv.error.flatten().fieldErrors
    );

    process.exit(1);
}

export const env = parsedEnv.data;