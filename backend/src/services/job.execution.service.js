import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

export async function claimJob(jobId, workerId) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
            UPDATE jobs
            SET
                status = $1,
                started_at = COALESCE(started_at, NOW()),
                locked_by = $2,
                locked_at = NOW(),
                attempt_count = attempt_count + 1,
                version = version + 1,
                updated_at = NOW()
            WHERE id = $3
              AND status = $4
              AND scheduled_at <= NOW()
              AND attempt_count < max_attempts
            RETURNING *
            `,
            [
                JOB_STATUS.RUNNING,
                workerId,
                jobId,
                JOB_STATUS.QUEUED
            ]
        );

        if (result.rowCount === 0) {
            await client.query("ROLLBACK");

            return null;
        }

        const job = result.rows[0];

        await client.query(
            `
            INSERT INTO job_attempts (
                job_id,
                attempt_number,
                status,
                started_at
            )
            VALUES ($1, $2, $3, NOW())
            `,
            [
                job.id,
                job.attempt_count,
                JOB_STATUS.RUNNING
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