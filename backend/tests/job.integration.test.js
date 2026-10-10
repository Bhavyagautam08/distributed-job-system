import {
    test,
    after
} from "node:test";

import assert
    from "node:assert/strict";

import {
    randomUUID
} from "node:crypto";

import {
    pool
} from "../src/config/database.js";

import {
    createJob
} from "../src/services/job.service.js";

import {
    claimJob
} from "../src/services/job.execution.service.js";

async function cleanupJob(
    jobId
) {
    await pool.query(
        `
        DELETE FROM outbox_events
        WHERE aggregate_id = $1
        `,
        [jobId]
    );

    await pool.query(
        `
        DELETE FROM jobs
        WHERE id = $1
        `,
        [jobId]
    );
}

async function createTestUser() {
    const result = await pool.query(
        `INSERT INTO users (email, display_name, password_hash)
         VALUES ($1, 'Integration Test', 'not-used')
         RETURNING id`,
        [`job-test-${randomUUID()}@example.test`]
    );
    return result.rows[0].id;
}

test(
    "same idempotency key returns same job",
    async () => {
        const idempotencyKey =
            `test-${randomUUID()}`;
        const userId = await createTestUser();

        const first =
            await createJob({
                userId,
                type:
                    "process_json",

                payload: {
                    test: true
                },

                idempotencyKey
            });

        const second =
            await createJob({
                userId,
                type:
                    "process_json",

                payload: {
                    test: true
                },

                idempotencyKey
            });

        assert.equal(
            first.created,
            true
        );

        assert.equal(
            second.created,
            false
        );

        assert.equal(
            first.data.id,
            second.data.id
        );

        await cleanupJob(
            first.data.id
        );
        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
);

test(
    "concurrent workers can claim a job only once",
    async () => {
        const idempotencyKey =
            `claim-${randomUUID()}`;
        const userId = await createTestUser();

        const created =
            await createJob({
                userId,
                type:
                    "process_json",

                payload: {
                    test: true
                },

                idempotencyKey
            });

        const results =
            await Promise.all([
                claimJob(
                    created.data.id,
                    "worker-a"
                ),

                claimJob(
                    created.data.id,
                    "worker-b"
                )
            ]);

        const successfulClaims =
            results.filter(
                Boolean
            );

        assert.equal(
            successfulClaims.length,
            1
        );

        await cleanupJob(
            created.data.id
        );
        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    }
);

after(
    async () => {
        await pool.end();
    }
);