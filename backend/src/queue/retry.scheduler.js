import { pool } from "../config/database.js";

export async function scheduleRetries() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Find jobs that are scheduled to run now (e.g., retries that were delayed)
        const result = await client.query(
            `
            UPDATE jobs
            SET
                scheduled_at = NOW(),
                updated_at = NOW()
            WHERE status = 'QUEUED'
              AND scheduled_at <= NOW()
              AND locked_by IS NULL
            RETURNING id, type, payload
            `
        );

        // For each, emit an outbox event so it gets picked up by redis producer
        for (const job of result.rows) {
            await client.query(
                `
                INSERT INTO outbox_events (event_type, aggregate_id, payload)
                VALUES ($1, $2, $3)
                `,
                ["JOB_CREATED", job.id, { jobId: job.id, type: job.type, payload: job.payload }]
            );
        }

        await client.query("COMMIT");
        return result.rows.length;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

// Optionally run as a daemon
if (import.meta.url === `file://${process.argv[1]}`) {
    setInterval(() => {
        scheduleRetries().catch(console.error);
    }, 10000);
}
