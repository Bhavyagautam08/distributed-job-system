import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

async function updateJobWithEvent({ jobId, userId, fromStatus, toStatus, eventType, update }) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await client.query(
            `UPDATE jobs
             SET ${update}
             WHERE id = $1 AND status = $2 AND user_id = $4
             RETURNING *`,
            [jobId, fromStatus, toStatus, userId]
        );
        if (result.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const job = result.rows[0];
        await client.query(
            `INSERT INTO outbox_events (event_type, aggregate_id, payload)
             VALUES ($1, $2, $3)`,
            [eventType, job.id, { jobId: job.id, status: toStatus }]
        );
        await client.query("COMMIT");
        return job;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export function retryFailedJob(jobId, userId) {
    return updateJobWithEvent({
        jobId,
        userId,
        fromStatus: JOB_STATUS.FAILED,
        toStatus: JOB_STATUS.QUEUED,
        eventType: "JOB_RETRY_REQUESTED",
        update: `status = $3, max_attempts = max_attempts + 1,
                 scheduled_at = NOW(), started_at = NULL, completed_at = NULL,
                 error = NULL, locked_by = NULL,
                 locked_at = NULL, version = version + 1, updated_at = NOW()`
    });
}

export function cancelQueuedJob(jobId, userId) {
    return updateJobWithEvent({
        jobId,
        userId,
        fromStatus: JOB_STATUS.QUEUED,
        toStatus: JOB_STATUS.CANCELLED,
        eventType: "JOB_CANCELLED",
        update: `status = $3, completed_at = NOW(), locked_by = NULL,
                 locked_at = NULL, version = version + 1, updated_at = NOW()`
    });
}
