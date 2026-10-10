export async function cpuIntensive(jobOrPayload) {
    const payload = jobOrPayload?.payload ?? jobOrPayload ?? {};
    const iterations = Number(payload.iterations);

    if (
        !Number.isInteger(iterations) ||
        iterations < 1
    ) {
        throw new Error(
            "cpu_intensive requires a positive integer iterations value"
        );
    }

    let result = 0;

    for (let i = 1; i <= iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i);
    }

    return {
        iterations,
        result,
        completed: true
    };
}

export const cpuIntensiveHandler = cpuIntensive;