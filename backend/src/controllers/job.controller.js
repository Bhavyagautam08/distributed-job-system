import { createJob } from "../services/job.service.js";

export async function createJobController(req, res, next) {
    try {
        const job = await createJob({
            type: req.jobData.type,
            payload: req.jobData.payload,
            idempotencyKey: req.idempotencyKey
        });

        return res.status(job.created ? 201 : 200).json({
            success: true,
            job: job.data,
            requestId: req.requestId
        });
    } catch (error) {
        next(error);
    }
}