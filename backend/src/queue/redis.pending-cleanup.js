import {
    redis
} from "../config/redis.js";

import {
    pool
} from "../config/database.js";

const JOB_STREAM =
    "job-events";

const CONSUMER_GROUP =
    "job-workers";

const CLEANUP_BATCH_SIZE =
    50;

const MIN_PENDING_IDLE_MS =
    60000;

export async function cleanupPendingMessages() {
    const pendingMessages =
        await redis.xpending(
            JOB_STREAM,
            CONSUMER_GROUP,
            "-",
            "+",
            CLEANUP_BATCH_SIZE
        );

    if (
        !pendingMessages ||
        pendingMessages.length === 0
    ) {
        return 0;
    }

    let cleanedCount = 0;

    for (
        const pendingMessage
        of pendingMessages
    ) {
        const [
            streamId,
            consumer,
            idleTime,
            deliveryCount
        ] = pendingMessage;

        if (
            Number(idleTime) <
            MIN_PENDING_IDLE_MS
        ) {
            continue;
        }

        const entries =
            await redis.xrange(
                JOB_STREAM,
                streamId,
                streamId
            );

        const match = entries?.[0];

        // Upstash xrange usually returns [ [ "id", { field: "val" } ] ] or [ [ "id", ["field", "val"] ] ]
        // depending on configuration. We'll handle both.
        let fields = match?.[1];
        if (Array.isArray(fields)) {
            const parsed = {};
            for (let i = 0; i < fields.length; i += 2) {
                parsed[fields[i]] = fields[i+1];
            }
            fields = parsed;
        }

        if (!fields) {
            await redis.xack(
                JOB_STREAM,
                CONSUMER_GROUP,
                streamId
            );

            cleanedCount++;

            continue;
        }

        const jobId =
            fields.jobId;

        if (!jobId) {
            await redis.xack(
                JOB_STREAM,
                CONSUMER_GROUP,
                streamId
            );

            cleanedCount++;

            continue;
        }

        const client =
            await pool.connect();

        try {
            await client.query(
                "BEGIN"
            );

            const result =
                await client.query(
                    `
                    SELECT *
                    FROM jobs
                    WHERE id = $1
                    FOR UPDATE
                    `,
                    [jobId]
                );

            if (
                result.rowCount === 0
            ) {
                await client.query(
                    "COMMIT"
                );

                await redis.xack(
                    JOB_STREAM,
                    CONSUMER_GROUP,
                    streamId
                );

                cleanedCount++;

                continue;
            }

            const job =
                result.rows[0];

            if (
                job.status === "SUCCESS" ||
                job.status === "FAILED"
            ) {
                await client.query(
                    "COMMIT"
                );

                await redis.xack(
                    JOB_STREAM,
                    CONSUMER_GROUP,
                    streamId
                );

                cleanedCount++;

                continue;
            }

            if (
                job.status === "QUEUED" &&
                new Date(
                    job.scheduled_at
                ) <= new Date()
            ) {
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
                        "JOB_REDELIVERY",

                        job.id,

                        {
                            jobId:
                                job.id,

                            type:
                                job.type,

                            payload:
                                job.payload
                        }
                    ]
                );

                await client.query(
                    "COMMIT"
                );

                await redis.xack(
                    JOB_STREAM,
                    CONSUMER_GROUP,
                    streamId
                );

                cleanedCount++;

                continue;
            }

            await client.query(
                "COMMIT"
            );
        } catch (error) {
            await client.query(
                "ROLLBACK"
            );

            throw error;
        } finally {
            client.release();
        }
    }

    return cleanedCount;
}