import { redis } from "../config/redis.js";

const JOB_STREAM = "job-events";

export async function publishJobEvent(event) {
    const streamId = await redis.xadd(
        JOB_STREAM,
        "*",
        {
            eventId: event.id,
            eventType: event.event_type,
            jobId: event.aggregate_id,
            payload: JSON.stringify(event.payload)
        }
    );

    return streamId;
}