import {
    createJob
} from "../services/job.service.js";

import {
    getJobAttempts,
    getJobById,
    getJobEvents,
    getJobStatusCounts,
    getJobsList
} from "../services/job.query.service.js";

import {
    cancelQueuedJob,
    retryFailedJob
} from "../services/job.action.service.js";

import {
    jobIdSchema
} from "../validators/job.validator.js";

export async function createJobController(
    req,
    res,
    next
) {
    try {
        const job =
            await createJob({
                type:
                    req.jobData.type,

                userId:
                    req.user.id,

                payload:
                    req.jobData.payload,

                idempotencyKey:
                    req.idempotencyKey
            });

        return res
            .status(
                job.created
                    ? 201
                    : 200
            )
            .json({
                success: true,

                job:
                    job.data,

                requestId:
                    req.requestId
            });
    } catch (error) {
        next(error);
    }
}

export async function getJobsController(req, res, next) {
    try {
        const limit = Number(req.query.limit ?? 50);
        const offset = Number(req.query.offset ?? 0);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100
            || !Number.isInteger(offset) || offset < 0) {
            return res.status(400).json({
                success: false,
                error: { message: "Invalid pagination parameters" },
                requestId: req.requestId
            });
        }

        const filters = {
            userId: req.user.id,
            status: req.query.status,
            type: req.query.type,
            worker: req.query.worker,
            search: req.query.search,
            limit,
            offset
        };
        if (req.query.priority !== undefined) {
            const priority = Number(req.query.priority);
            if (!Number.isInteger(priority)) {
                return res.status(400).json({
                    success: false,
                    error: { message: "Invalid priority filter" },
                    requestId: req.requestId
                });
            }
            filters.priority = priority;
        }

        const [result, statusCounts] = await Promise.all([
            getJobsList(filters),
            getJobStatusCounts(req.user.id)
        ]);
        return res.json({
            success: true,
            ...result,
            statusCounts,
            requestId: req.requestId
        });
    } catch (error) {
        return next(error);
    }
}

export async function getJobController(
    req,
    res,
    next
) {
    try {
        const parsed =
            jobIdSchema.safeParse(
                req.params.jobId
            );

        if (!parsed.success) {
            return res.status(400).json({
                success: false,

                error: {
                    message:
                        "Invalid job ID"
                },

                requestId:
                    req.requestId
            });
        }

        const job = await getJobById(parsed.data, req.user.id);

        if (!job) {
            return res.status(404).json({
                success: false,

                error: {
                    message:
                        "Job not found"
                },

                requestId:
                    req.requestId
            });
        }

        const [attempts, events] = await Promise.all([
            getJobAttempts(parsed.data, req.user.id),
            getJobEvents(parsed.data, req.user.id)
        ]);
        return res.status(200).json({
            success: true,

            job,
            attempts,
            events,

            requestId:
                req.requestId
        });
    } catch (error) {
        next(error);
    }
}

async function updateOwnedJob(req, res, next, action) {
    try {
        const parsed = jobIdSchema.safeParse(req.params.jobId);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: { message: "Invalid job ID" },
                requestId: req.requestId
            });
        }

        const job = await action(parsed.data, req.user.id);
        if (!job) {
            return res.status(404).json({
                success: false,
                error: { message: "Job not found or cannot be changed" },
                requestId: req.requestId
            });
        }
        return res.json({ success: true, job, requestId: req.requestId });
    } catch (error) {
        return next(error);
    }
}

export function retryJobController(req, res, next) {
    return updateOwnedJob(req, res, next, retryFailedJob);
}

export function cancelJobController(req, res, next) {
    return updateOwnedJob(req, res, next, cancelQueuedJob);
}