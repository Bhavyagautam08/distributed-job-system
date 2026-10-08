import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

export async function retryJob(jobId, errorMessage) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const checkResult = await client.query(
            `SELECT attempt_count, max_attempts FROM jobs WHERE id = $1`,
            [jobId]
        );

        if (checkResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const jobInfo = checkResult.rows[0];

        // If max attempts reached, fail the job completely
        if (jobInfo.attempt_count >= jobInfo.max_attempts) {
            await client.query("ROLLBACK");
            const { failJob } = await import("./job.failure.service.js");
            return await failJob(jobId, "Max attempts reached: " + errorMessage);
        }

        const result = await client.query(
            `
            UPDATE jobs
            SET
                status = $1,
                error = $2,
                locked_by = NULL,
                locked_at = NULL,
                scheduled_at = NOW() + INTERVAL '1 minute',
                version = version + 1,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [JOB_STATUS.QUEUED, errorMessage, jobId] // Put back in QUEUED or a specific RETRY state
        );

        const job = result.rows[0];

        await client.query(
            `
            UPDATE job_attempts
            SET
                status = $1,
                completed_at = NOW(),
                error = $2
            WHERE job_id = $3 AND attempt_number = $4
            `,
            [JOB_STATUS.FAILED, errorMessage, job.id, job.attempt_count]
        );

        await client.query(
            `
            INSERT INTO outbox_events (
                event_type,
                aggregate_id,
                payload
            )
            VALUES ($1, $2, $3)
            `,
            [
                "JOB_RETRIED",
                job.id,
                { jobId: job.id, error: errorMessage, attempt: job.attempt_count }
            ]
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
