import { createJob } from "../services/job.service.js";
import { getJobAttempts, getJobById, getJobEvents, getJobsList, getJobStatusCounts } from "../services/job.query.service.js";
import { cancelQueuedJob, retryFailedJob } from "../services/job.action.service.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBoundedInt(value, fallback, maximum) {
    if (value === undefined) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

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

export async function getJobsController(req, res, next) {
    try {
        const [result, statusCounts] = await Promise.all([getJobsList({
            status: req.query.status,
            type: req.query.type,
            worker: req.query.worker,
            priority: req.query.priority === undefined ? undefined : Number(req.query.priority),
            search: req.query.search,
            limit: parseBoundedInt(req.query.limit, 50, 250),
            offset: req.query.offset === undefined ? 0 : Math.max(0, Number.parseInt(req.query.offset, 10) || 0)
        }), getJobStatusCounts()]);

        return res.json({ success: true, ...result, statusCounts, requestId: req.requestId });
    } catch (error) {
        next(error);
    }
}

export async function getJobController(req, res, next) {
    try {
        if (!uuidPattern.test(req.params.id)) {
            return res.status(400).json({ success: false, error: { message: "Invalid job ID" } });
        }

        const job = await getJobById(req.params.id);
        if (!job) return res.status(404).json({ success: false, error: { message: "Job not found" } });

        const [attempts, events] = await Promise.all([
            getJobAttempts(req.params.id),
            getJobEvents(req.params.id)
        ]);
        return res.json({ success: true, job, attempts, events, requestId: req.requestId });
    } catch (error) {
        next(error);
    }
}

export async function retryJobController(req, res, next) {
    try {
        if (!uuidPattern.test(req.params.id)) {
            return res.status(400).json({ success: false, error: { message: "Invalid job ID" } });
        }
        const job = await retryFailedJob(req.params.id);
        if (!job) {
            const existing = await getJobById(req.params.id);
            return res.status(existing ? 409 : 404).json({
                success: false,
                error: { message: existing ? "Only failed jobs can be retried" : "Job not found" }
            });
        }
        return res.json({ success: true, job, requestId: req.requestId });
    } catch (error) {
        next(error);
    }
}

export async function cancelJobController(req, res, next) {
    try {
        if (!uuidPattern.test(req.params.id)) {
            return res.status(400).json({ success: false, error: { message: "Invalid job ID" } });
        }
        const job = await cancelQueuedJob(req.params.id);
        if (!job) {
            const existing = await getJobById(req.params.id);
            return res.status(existing ? 409 : 404).json({
                success: false,
                error: { message: existing ? "Only queued jobs can be cancelled" : "Job not found" }
            });
        }
        return res.json({ success: true, job, requestId: req.requestId });
    } catch (error) {
        next(error);
    }
}