import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { JOB_STATUS } from "../utils/job-status.js";

export async function createJob({
    type,
    payload,
    idempotencyKey
}) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const insertResult = await client.query(
            `
            INSERT INTO jobs (
                type,
                payload,
                status,
                max_attempts,
                idempotency_key
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (idempotency_key)
            DO NOTHING
            RETURNING *
            `,
            [
                type,
                payload,
                JOB_STATUS.QUEUED,
                env.JOB_MAX_ATTEMPTS,
                idempotencyKey
            ]
        );

        if (insertResult.rowCount === 0) {
            const existingResult = await client.query(
                `
                SELECT *
                FROM jobs
                WHERE idempotency_key = $1
                `,
                [idempotencyKey]
            );

            if (existingResult.rowCount === 0) {
                throw new Error(
                    "Failed to resolve idempotent job"
                );
            }

            await client.query("COMMIT");

            return {
                created: false,
                data: existingResult.rows[0]
            };
        }

        const job = insertResult.rows[0];

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
                "JOB_CREATED",
                job.id,
                {
                    jobId: job.id,
                    type: job.type,
                    payload: job.payload
                }
            ]
        );

        await client.query("COMMIT");

        return {
            created: true,
            data: job
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}