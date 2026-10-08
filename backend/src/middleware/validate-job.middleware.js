import {
    createJobSchema,
    idempotencyKeySchema
} from "../validators/job.validator.js";

export function validateJobCreation(req, res, next) {
    const idempotencyKey = req.get("Idempotency-Key");

    const idempotencyResult =
        idempotencyKeySchema.safeParse(idempotencyKey);

    if (!idempotencyResult.success) {
        return res.status(400).json({
            success: false,
            error: {
                message:
                    idempotencyResult.error.issues[0].message
            },
            requestId: req.requestId
        });
    }

    const bodyResult = createJobSchema.safeParse(req.body);

    if (!bodyResult.success) {
        return res.status(400).json({
            success: false,
            error: {
                message: "Invalid job payload",
                details: bodyResult.error.issues
            },
            requestId: req.requestId
        });
    }

    req.idempotencyKey = idempotencyResult.data;
    req.jobData = bodyResult.data;

    next();
}