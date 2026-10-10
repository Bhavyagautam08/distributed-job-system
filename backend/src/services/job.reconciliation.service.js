import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

// Look for RUNNING jobs that haven't been updated in a while (e.g., worker died)
export async function reconcileStuckJobs(options = 5) {
    const timeoutSeconds = typeof options === "number"
        ? (options < 1 ? Math.max(1, Math.round(options * 60)) : Math.round(options * 60))
        : (options?.timeoutSeconds ?? Math.round((options?.timeoutMinutes ?? 5) * 60));

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Move stuck jobs that have remaining attempts back to QUEUED
        const requeueResult = await client.query(
            `
            UPDATE jobs
            SET status = $1,
                locked_by = NULL,
                locked_at = NULL,
                updated_at = NOW()
            WHERE status = $2
              AND updated_at < NOW() - ($3 * INTERVAL '1 second')
              AND attempt_count < max_attempts
            RETURNING id, type, attempt_count, max_attempts
            `,
            [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING, timeoutSeconds]
        );

        // 2. Mark stuck jobs that exceeded max_attempts as FAILED
        const failResult = await client.query(
            `
            UPDATE jobs
            SET status = $1,
                error = 'Worker timeout and max attempts exceeded',
                completed_at = NOW(),
                locked_by = NULL,
                locked_at = NULL,
                updated_at = NOW()
            WHERE status = $2
              AND updated_at < NOW() - ($3 * INTERVAL '1 second')
              AND attempt_count >= max_attempts
            RETURNING id, type, attempt_count, max_attempts
            `,
            [JOB_STATUS.FAILED, JOB_STATUS.RUNNING, timeoutSeconds]
        );

        const stuckJobs = requeueResult.rows;

        for (const job of stuckJobs) {
            await client.query(
                `
                INSERT INTO outbox_events (event_type, aggregate_id, payload)
                VALUES ($1, $2, $3)
                `,
                ["JOB_REQUEUED", job.id, { jobId: job.id, reason: "worker_timeout" }]
            );
        }

        for (const job of failResult.rows) {
            await client.query(
                `
                INSERT INTO outbox_events (event_type, aggregate_id, payload)
                VALUES ($1, $2, $3)
                `,
                ["JOB_FAILED", job.id, { jobId: job.id, reason: "worker_timeout_max_attempts" }]
            );
        }

        await client.query("COMMIT");
        return stuckJobs.length + failResult.rows.length;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
