import assert from "node:assert/strict";
import test from "node:test";
import { calculatePrimesHandler } from "../src/handlers/calculate-primes.handler.js";

test("uses the frontend limit field and computes primes through one billion", async () => {
    const startedAt = performance.now();
    const result = await calculatePrimesHandler({
        payload: { limit: 1_000_000_000 }
    });
    const elapsedMs = Math.round(performance.now() - startedAt);

    assert.deepEqual(result, {
        count: 50_847_534,
        largest: 999_999_937
    });
    console.log(`Segmented sieve through 1e9 completed in ${elapsedMs} ms`);
});

test("continues to accept the maxLimit field used by existing jobs", async () => {
    assert.deepEqual(
        await calculatePrimesHandler({ payload: { maxLimit: 1000 } }),
        { count: 168, largest: 997 }
    );
});

test("rejects invalid or unsupported prime limits", async () => {
    await assert.rejects(
        calculatePrimesHandler({ payload: { limit: 1_000_000_001 } }),
        /Prime limit must be an integer/
    );
    await assert.rejects(
        calculatePrimesHandler({ payload: { limit: 1.5 } }),
        /Prime limit must be an integer/
    );
});
