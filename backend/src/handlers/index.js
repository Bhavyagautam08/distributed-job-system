import { calculatePrimesHandler } from './calculate-primes.handler.js';
import { cpuIntensiveHandler } from './cpu-intensive.handler.js';
import { longRunningHandler } from './long-running.handler.js';
import { processJsonHandler } from './process-json.handler.js';

export const handlers = {
    'CALCULATE_PRIMES': calculatePrimesHandler,
    'CPU_INTENSIVE': cpuIntensiveHandler,
    'LONG_RUNNING': longRunningHandler,
    'PROCESS_JSON': processJsonHandler
};
