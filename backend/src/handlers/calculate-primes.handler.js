const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 1_000_000_000;
const SEGMENT_SIZE = 1_000_000;

function getPrimesThrough(limit) {
    const baseLimit = Math.floor(Math.sqrt(limit));
    const baseSieve = new Uint8Array(baseLimit + 1);
    baseSieve.fill(1, 2);

    for (let candidate = 2; candidate * candidate <= baseLimit; candidate += 1) {
        if (baseSieve[candidate] === 0) continue;
        for (let multiple = candidate * candidate; multiple <= baseLimit; multiple += candidate) {
            baseSieve[multiple] = 0;
        }
    }

    const basePrimes = [];
    for (let candidate = 2; candidate <= baseLimit; candidate += 1) {
        if (baseSieve[candidate] === 1) basePrimes.push(candidate);
    }

    let count = 0;
    let largest = null;

    for (let low = 2; low <= limit; low += SEGMENT_SIZE) {
        const high = Math.min(limit, low + SEGMENT_SIZE - 1);
        const segment = new Uint8Array(high - low + 1);
        segment.fill(1);

        for (const prime of basePrimes) {
            const firstMultiple = Math.max(
                prime * prime,
                Math.ceil(low / prime) * prime
            );
            if (firstMultiple > high) break;

            for (let multiple = firstMultiple; multiple <= high; multiple += prime) {
                segment[multiple - low] = 0;
            }
        }

        for (let offset = 0; offset < segment.length; offset += 1) {
            if (segment[offset] === 1) {
                count += 1;
                largest = low + offset;
            }
        }
    }

    return { count, largest };
}

export async function calculatePrimesHandler(job) {
    const payload = job.payload || {};
    const limit = payload.limit ?? payload.maxLimit ?? DEFAULT_LIMIT;

    if (!Number.isSafeInteger(limit) || limit < 0 || limit > MAX_LIMIT) {
        throw new RangeError(`Prime limit must be an integer between 0 and ${MAX_LIMIT}`);
    }

    return getPrimesThrough(limit);
}
