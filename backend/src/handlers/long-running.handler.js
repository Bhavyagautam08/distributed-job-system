export async function longRunningHandler(job) {
    const { durationMs = 5000 } = job.payload || {};

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ message: `Completed after ${durationMs}ms`, durationMs });
        }, durationMs);
    });
}
