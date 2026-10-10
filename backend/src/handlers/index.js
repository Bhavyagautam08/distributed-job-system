import { calculatePrimes, calculatePrimesHandler } from "./calculate-primes.handler.js";
import { processJson, processJsonHandler } from "./process-json.handler.js";
import { cpuIntensive, cpuIntensiveHandler } from "./cpu-intensive.handler.js";
import { longRunningHandler } from "./long-running.handler.js";

export const handlers = Object.freeze({
    calculate_primes: calculatePrimes,
    process_json: processJson,
    cpu_intensive: cpuIntensive,
    long_running: longRunningHandler,
    CALCULATE_PRIMES: calculatePrimes,
    PROCESS_JSON: processJson,
    CPU_INTENSIVE: cpuIntensive,
    LONG_RUNNING: longRunningHandler
});

export function getJobHandler(jobType) {
    const handler = handlers[jobType] || handlers[jobType?.toLowerCase?.()] || handlers[jobType?.toUpperCase?.()];

    if (!handler) {
        throw new Error(
            `No handler registered for job type: ${jobType}`
        );
    }

    return handler;
}

export {
    calculatePrimes,
    calculatePrimesHandler,
    processJson,
    processJsonHandler,
    cpuIntensive,
    cpuIntensiveHandler,
    longRunningHandler
};