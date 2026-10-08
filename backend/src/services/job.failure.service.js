import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

export async function failJob(jobId, errorMessage) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
            UPDATE jobs
            SET
                status = $1,
                error = $2,
                completed_at = NOW(),
                locked_by = NULL,
                locked_at = NULL,
                version = version + 1,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [JOB_STATUS.FAILED, errorMessage, jobId]
        );

        if (result.rowCount === 0) {
            await client.query("ROLLBACK");
            return null;
        }

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
                "JOB_FAILED",
                job.id,
                { jobId: job.id, error: errorMessage }
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
