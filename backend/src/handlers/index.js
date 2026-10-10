import { calculatePrimes } from "./calculate-primes.handler.js";
import { processJson } from "./process-json.handler.js";
import { cpuIntensive } from "./cpu-intensive.handler.js";
import { longRunning } from "./long-running.handler.js";

const handlers = Object.freeze({
    calculate_primes: calculatePrimes,
    process_json: processJson,
    cpu_intensive: cpuIntensive,
    long_running: longRunning
});

export function getJobHandler(jobType) {
    const handler = handlers[jobType];

    if (!handler) {
        throw new Error(
            `No handler registered for job type: ${jobType}`
        );
    }

    return handler;
}