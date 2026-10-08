import { reconcileStuckJobs } from "../services/job.reconciliation.service.js";

async function runReconciliation() {
    console.log("Starting job reconciliation...");
    try {
        const count = await reconcileStuckJobs(5); // 5 minutes timeout
        if (count > 0) {
            console.log(`Reconciled ${count} stuck jobs`);
        }
    } catch (error) {
        console.error("Reconciliation error:", error);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    console.log("Reconciliation worker started");
    setInterval(runReconciliation, 60000); // Run every minute
}

export { runReconciliation };
