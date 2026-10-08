import { pool } from "../config/database.js";
import { publishJobEvent } from "./redis.producer.js";

const OUTBOX_BATCH_SIZE = 10;

export async function publishOutboxEvents() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
            SELECT *
            FROM outbox_events
            WHERE published = FALSE
            ORDER BY created_at
            LIMIT $1
            FOR UPDATE SKIP LOCKED
            `,
            [OUTBOX_BATCH_SIZE]
        );

        for (const event of result.rows) {
            await publishJobEvent(event);

            await client.query(
                `
                UPDATE outbox_events
                SET
                    published = TRUE,
                    published_at = NOW()
                WHERE id = $1
                `,
                [event.id]
            );
        }

        await client.query("COMMIT");

        return result.rowCount;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}