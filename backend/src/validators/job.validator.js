import { z } from "zod";

export const createJobSchema = z.object({
    type: z.enum([
        "calculate_primes",
        "process_json",
        "cpu_intensive",
        "long_running"
    ]),

    payload: z.record(z.string(), z.unknown())
});

export const idempotencyKeySchema = z
    .string()
    .trim()
    .min(1, "Idempotency-Key is required")
    .max(255, "Idempotency-Key must not exceed 255 characters");