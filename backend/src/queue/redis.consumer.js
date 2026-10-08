import { redis } from "../config/redis.js";
import { env } from "../config/env.js";

const JOB_STREAM = "job-events";
const CONSUMER_GROUP = "job-workers";

export async function ensureConsumerGroup() {
    try {
        await redis.xgroup(
            JOB_STREAM,
            {
                type: "CREATE",
                group: CONSUMER_GROUP,
                id: "0",
                options: { MKSTREAM: true }
            }
        );
    } catch (error) {
        if (!error.message.includes("BUSYGROUP")) {
            throw error;
        }
    }
}

export async function consumeJobEvents() {
    const result = await redis.xreadgroup(
        CONSUMER_GROUP,
        env.WORKER_ID,
        JOB_STREAM,
        ">",
        {
            count: 10
        }
    );

    if (!result) {
        return [];
    }

    return result.map(([streamName, entries]) => ({
        name: streamName,
        messages: entries.map(([id, fields]) => ({
            id,
            message: Array.isArray(fields)
                ? Object.fromEntries(
                    Array.from({ length: fields.length / 2 }, (_, index) => [
                        fields[index * 2],
                        fields[index * 2 + 1]
                    ])
                )
                : fields
        }))
    }));
}

export async function acknowledgeJobEvent(streamId) {
    await redis.xack(JOB_STREAM, CONSUMER_GROUP, streamId);
}