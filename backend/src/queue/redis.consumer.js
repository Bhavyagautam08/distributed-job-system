import { redis } from "../config/redis.js";
import { env } from "../config/env.js";

const JOB_STREAM = "job-events";
const CONSUMER_GROUP = "job-workers";

export async function ensureConsumerGroup() {
    try {
        await redis.xgroup(
            "CREATE",
            JOB_STREAM,
            CONSUMER_GROUP,
            "0",
            "MKSTREAM"
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
            COUNT: 10
        }
    );

    if (!result) {
        return [];
    }

    return result;
}