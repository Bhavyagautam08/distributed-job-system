import { consumeJobEvents } from "../queue/redis.consumer.js";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";

async function getJob(jobId) {
    const result = await pool.query(
        `
        SELECT *
        FROM jobs
        WHERE id = $1
        `,
        [jobId]
    );

    return result.rows[0] || null;
}

async function processEvent(event) {
    const jobId = event.jobId;

    if (!jobId) {
        console.error("Received event without jobId");
        return;
    }

    const job = await getJob(jobId);

    if (!job) {
        console.error(
            `Job ${jobId} does not exist in PostgreSQL`
        );

        return;
    }

    console.log(
        `[${env.WORKER_ID}] Processing job ${job.id} (${job.type})`
    );

    console.log("Job payload:", job.payload);

    // Handler execution will be added next.
}

async function startWorker() {
    console.log(
        `[${env.WORKER_ID}] Worker started`
    );

    await import("../queue/redis.consumer.js")
        .then(({ ensureConsumerGroup }) =>
            ensureConsumerGroup()
        );

    while (true) {
        try {
            const events = await consumeJobEvents();

            for (const stream of events) {
                const messages = stream.messages || [];

                for (const message of messages) {
                    const fields = message.message || {};

                    const event = {
                        streamId: message.id,
                        eventId: fields.eventId,
                        eventType: fields.eventType,
                        jobId: fields.jobId,
                        payload: fields.payload
                    };

                    await processEvent(event);
                }
            }
        } catch (error) {
            console.error(
                `[${env.WORKER_ID}] Worker error:`,
                error
            );

            await new Promise((resolve) => {
                setTimeout(resolve, 1000);
            });
        }
    }
}

startWorker();