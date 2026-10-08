export async function cpuIntensiveHandler(job) {
    const { iterations = 10000000 } = job.payload || {};

    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i);
    }

    return { result, iterations };
}
