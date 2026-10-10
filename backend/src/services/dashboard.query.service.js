import { pool } from "../config/database.js";
import { getJobStatusCounts, getJobsList, getRecentOutboxEvents } from "./job.query.service.js";

const rangeMinutes = new Map([
    ["5m", 5],
    ["15m", 15],
    ["1h", 60],
    ["6h", 360],
    ["24h", 1440]
]);

export async function getDashboardData(userId, range = "15m") {
    const minutes = rangeMinutes.get(range);
    if (!minutes) {
        const error = new Error("Unsupported chart range");
        error.statusCode = 400;
        throw error;
    }

    const [counts, jobsResult, events, workers, chartResult, outboxResult] = await Promise.all([
        getJobStatusCounts(userId),
        getJobsList({ userId, limit: 8, offset: 0 }),
        getRecentOutboxEvents(10, userId),
        getWorkerLeases(userId),
        pool.query(
            `WITH bounds AS (
                 SELECT NOW() - ($1::int * INTERVAL '1 minute') AS from_at,
                        ($1::int * 60 / 15)::int AS bucket_seconds
             ),
             buckets AS (SELECT generate_series(0, 14)::int AS bucket),
             created AS (
                 SELECT LEAST(14, FLOOR(EXTRACT(EPOCH FROM (j.created_at - b.from_at)) / b.bucket_seconds)::int) AS bucket,
                        COUNT(*)::int AS total
                 FROM jobs j CROSS JOIN bounds b
                 WHERE j.user_id = $2 AND j.created_at >= b.from_at
                 GROUP BY 1
             ),
             failed AS (
                 SELECT LEAST(14, FLOOR(EXTRACT(EPOCH FROM (j.completed_at - b.from_at)) / b.bucket_seconds)::int) AS bucket,
                        COUNT(*)::int AS total
                 FROM jobs j CROSS JOIN bounds b
                 WHERE j.user_id = $2 AND j.status = 'FAILED' AND j.completed_at >= b.from_at
                 GROUP BY 1
             )
             SELECT b.bucket, COALESCE(c.total, 0)::int AS created,
                    COALESCE(f.total, 0)::int AS failed
             FROM buckets b
             LEFT JOIN created c ON c.bucket = b.bucket
             LEFT JOIN failed f ON f.bucket = b.bucket
             ORDER BY b.bucket`,
            [minutes, userId]
        ),
        pool.query(
            `SELECT COUNT(*)::int AS unpublished
             FROM outbox_events e
             JOIN jobs j ON j.id = e.aggregate_id
             WHERE e.published = FALSE AND j.user_id = $1`,
            [userId]
        )
    ]);

    return {
        counts,
        workers: workers.map((worker) => ({
            id: worker.id,
            activeJobs: worker.active_jobs,
            jobIds: worker.job_ids,
            lastActivityAt: worker.last_activity_at
        })),
        activeWorkers: workers.length,
        jobs: jobsResult.jobs,
        events,
        chart: chartResult.rows.map((row) => ({
            created: row.created,
            failed: row.failed
        })),
        unpublishedOutboxEvents: outboxResult.rows[0].unpublished
    };
}

export async function getWorkerLeases(userId) {
    if (!userId) throw new TypeError("userId is required to list worker leases");
    const result = await pool.query(
        `SELECT locked_by AS id, COUNT(*)::int AS active_jobs,
                MAX(updated_at) AS last_activity_at,
                ARRAY_AGG(id::text ORDER BY updated_at DESC) AS job_ids
         FROM jobs
         WHERE user_id = $1 AND status = 'RUNNING' AND locked_by IS NOT NULL
         GROUP BY locked_by
         ORDER BY locked_by`,
        [userId]
    );
    return result.rows;
}

export async function getQueueData(userId) {
    if (!userId) throw new TypeError("userId is required to list queue data");
    const [counts, events, outbox, stream] = await Promise.all([
        getJobStatusCounts(userId),
        getRecentOutboxEvents(20, userId),
        pool.query(
            `SELECT COUNT(*) FILTER (WHERE e.published = FALSE)::int AS unpublished,
                    COUNT(*) FILTER (WHERE e.published = TRUE)::int AS published
             FROM outbox_events e
             JOIN jobs j ON j.id = e.aggregate_id
             WHERE j.user_id = $1`,
            [userId]
        ),
        pool.query(
            `SELECT COALESCE(MAX(EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) * 1000), 0)::float AS max_duration_ms
             FROM job_attempts a
             JOIN jobs j ON j.id = a.job_id
             WHERE j.user_id = $1 AND a.completed_at IS NOT NULL
               AND a.started_at >= NOW() - INTERVAL '30 minutes'`,
            [userId]
        )
    ]);

    return {
        counts,
        events,
        outbox: outbox.rows[0],
        maxAttemptDurationMs: stream.rows[0].max_duration_ms
    };
}
