import {
    redis
} from "../config/redis.js";

const JOB_STREAM =
    "job-events";

const STREAM_MAX_LENGTH =
    100000;

export async function publishJobEvent(
    event
) {
    return redis.xadd(
        JOB_STREAM,
        "*",
        {
            eventId:
                event.id,

            eventType:
                event.event_type,

            jobId:
                event.aggregate_id,

            payload:
                JSON.stringify(
                    event.payload
                )
        },
        {
            trim: {
                type: "MAXLEN",

                threshold:
                    STREAM_MAX_LENGTH,

                comparison: "~"
            }
        }
    );
}