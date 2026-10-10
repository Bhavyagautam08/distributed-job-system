import { runReconciliation } from "./reconciliation.worker.js";
import { scheduleRetries } from "../queue/retry.scheduler.js";

import "../queue/outbox.worker.js";
import "./job.worker.js";

console.log("Starting background tasks (reconciliation, retries)...");
setInterval(runReconciliation, 60000);
setInterval(() => scheduleRetries().catch(console.error), 10000);
