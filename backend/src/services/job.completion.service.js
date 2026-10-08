import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

export async function completeJob(jobId, resultPayload) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
            UPDATE jobs
            SET
                status = $1,
                result = $2,
                completed_at = NOW(),
                locked_by = NULL,
                locked_at = NULL,
                version = version + 1,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [JOB_STATUS.SUCCESS, resultPayload, jobId]
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
                result = $2
            WHERE job_id = $3 AND attempt_number = $4
            `,
            [JOB_STATUS.SUCCESS, resultPayload, job.id, job.attempt_count]
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
                "JOB_COMPLETED",
                job.id,
                { jobId: job.id, result: resultPayload }
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
