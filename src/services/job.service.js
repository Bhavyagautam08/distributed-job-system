import { pool } from "../config/database.js";
import { env } from "../config/env.js";

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
            VALUES ($1, $2, 'QUEUED', $3, $4)
            ON CONFLICT (idempotency_key)
            DO NOTHING
            RETURNING *
            `,
            [
                type,
                payload,
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