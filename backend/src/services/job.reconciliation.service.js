import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

// Look for RUNNING jobs that haven't been updated in a while (e.g., worker died)
export async function reconcileStuckJobs(timeoutMinutes = 5) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Find stuck jobs
        const result = await pool.query(
            `
            UPDATE jobs
            SET status = $1,
                locked_by = NULL,
                locked_at = NULL,
                updated_at = NOW()
            WHERE status = $2
              AND updated_at < NOW() - INTERVAL '${timeoutMinutes} minutes'
            RETURNING id, type
            `,
            [JOB_STATUS.QUEUED, JOB_STATUS.RUNNING] // Move back to QUEUED
        );

        const stuckJobs = result.rows;

        for (const job of stuckJobs) {
            await client.query(
                `
                INSERT INTO outbox_events (event_type, aggregate_id, payload)
                VALUES ($1, $2, $3)
                `,
                ["JOB_REQUEUED", job.id, { jobId: job.id, reason: "worker_timeout" }]
            );
        }

        await client.query("COMMIT");
        return stuckJobs.length;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
