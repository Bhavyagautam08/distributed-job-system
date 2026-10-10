import { z } from "zod";

const emailSchema = z.string().trim().email().max(320);

export const registerSchema = z.object({
    email: emailSchema,
    displayName: z.string().trim().min(2).max(100),
    password: z.string().min(12).max(128)
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(128)
});
