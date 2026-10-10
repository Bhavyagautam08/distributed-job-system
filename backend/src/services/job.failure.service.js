import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { JOB_STATUS } from "../utils/job-status.js";

function calculateRetryDelay(attemptNumber) {
    const exponentialDelay =
        env.BACKOFF_BASE_MS *
        Math.pow(2, attemptNumber - 1);

    const cappedDelay = Math.min(
        exponentialDelay,
        env.BACKOFF_MAX_MS
    );

    const jitter = Math.random() * cappedDelay * 0.2;

    return Math.floor(
        cappedDelay + jitter
    );
}

export async function failJob({
    jobId,
    workerId,
    error
}) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const jobResult = await client.query(
            `
            SELECT *
            FROM jobs
            WHERE id = $1
              AND status = $2
              AND locked_by = $3
            FOR UPDATE
            `,
            [
                jobId,
                JOB_STATUS.RUNNING,
                workerId
            ]
        );

        if (jobResult.rowCount === 0) {
            await client.query("ROLLBACK");

            return null;
        }

        const job = jobResult.rows[0];

        const canRetry =
            job.attempt_count < job.max_attempts;

        if (canRetry) {
            const retryDelay = calculateRetryDelay(
                job.attempt_count
            );

            const retryAt = new Date(
                Date.now() + retryDelay
            );

            await client.query(
                `
                UPDATE jobs
                SET
                    status = $1,
                    scheduled_at = $2,
                    retry_event_published = FALSE,
                    error = $3,
                    locked_by = NULL,
                    locked_at = NULL,
                    version = version + 1,
                    updated_at = NOW()
                WHERE id = $4
                `,
                [
                    JOB_STATUS.QUEUED,
                    retryAt,
                    error,
                    jobId
                ]
            );

            await client.query(
                `
                UPDATE job_attempts
                SET
                    status = $1,
                    completed_at = NOW(),
                    error = $2
                WHERE job_id = $3
                  AND attempt_number = $4
                  AND status = $5
                `,
                [
                    JOB_STATUS.FAILED,
                    error,
                    jobId,
                    job.attempt_count,
                    JOB_STATUS.RUNNING
                ]
            );

            await client.query("COMMIT");

            return {
                status: JOB_STATUS.QUEUED,
                retry: true,
                retryAt,
                retryDelay
            };
        }

        await client.query(
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
            `,
            [
                JOB_STATUS.FAILED,
                error,
                jobId
            ]
        );

        await client.query(
            `
            UPDATE job_attempts
            SET
                status = $1,
                completed_at = NOW(),
                error = $2
            WHERE job_id = $3
              AND attempt_number = $4
              AND status = $5
            `,
            [
                JOB_STATUS.FAILED,
                error,
                jobId,
                job.attempt_count,
                JOB_STATUS.RUNNING
            ]
        );

        await client.query("COMMIT");

        return {
            status: JOB_STATUS.FAILED,
            retry: false
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}