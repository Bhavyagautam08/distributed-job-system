export async function processJsonHandler(job) {
    const { data } = job.payload || {};

    if (!data) {
        throw new Error("Missing 'data' in payload");
    }

    // Simulate some JSON processing
    const processed = {
        receivedAt: new Date().toISOString(),
        keys: Object.keys(data),
        itemCount: Array.isArray(data) ? data.length : Object.keys(data).length,
        original: data
    };

    return processed;
}
