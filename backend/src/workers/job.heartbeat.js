import { heartbeatJob } from "../services/job.heartbeat.service.js";
import { env } from "../config/env.js";

export function startWorkerHeartbeat(jobId) {
    console.log(`[${env.WORKER_ID}] Starting heartbeat for job ${jobId}`);

    const interval = setInterval(async () => {
        try {
            await heartbeatJob(jobId, env.WORKER_ID);
        } catch (error) {
            console.error(`[${env.WORKER_ID}] Heartbeat failed for job ${jobId}:`, error);
        }
    }, 30000); // 30 seconds

    return {
        stop: () => clearInterval(interval)
    };
}
