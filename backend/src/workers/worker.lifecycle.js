import { env } from "../config/env.js";
import { pool } from "../config/database.js";

export function setupWorkerLifecycle(startWorkerFn) {
    const shutdown = async (signal) => {
        console.log(`\n[${env.WORKER_ID}] Received ${signal}, shutting down gracefully...`);

        try {
            await pool.end();
            console.log(`[${env.WORKER_ID}] Database pool closed`);
            process.exit(0);
        } catch (error) {
            console.error(`[${env.WORKER_ID}] Error during shutdown:`, error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    startWorkerFn().catch(err => {
        console.error(`[${env.WORKER_ID}] Fatal worker error:`, err);
        process.exit(1);
    });
}
