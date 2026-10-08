import { pool } from "../config/database.js";
import { getJobStatusCounts, getJobsList, getRecentOutboxEvents } from "./job.query.service.js";

const rangeMinutes = new Map([
    ["5m", 5],
    ["15m", 15],
    ["1h", 60],
    ["6h", 360],
    ["24h", 1440]
]);

export async function getDashboardData(range = "15m") {
    const minutes = rangeMinutes.get(range);
    if (!minutes) {
        const error = new Error("Unsupported chart range");
        error.statusCode = 400;
        throw error;
    }

    const [counts, jobsResult, events, workers, chartResult, outboxResult] = await Promise.all([
        getJobStatusCounts(),
        getJobsList({ limit: 8, offset: 0 }),
        getRecentOutboxEvents(10),
        getWorkerLeases(),
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
                 WHERE j.created_at >= b.from_at
                 GROUP BY 1
             ),
             failed AS (
                 SELECT LEAST(14, FLOOR(EXTRACT(EPOCH FROM (j.completed_at - b.from_at)) / b.bucket_seconds)::int) AS bucket,
                        COUNT(*)::int AS total
                 FROM jobs j CROSS JOIN bounds b
                 WHERE j.status = 'FAILED' AND j.completed_at >= b.from_at
                 GROUP BY 1
             )
             SELECT b.bucket, COALESCE(c.total, 0)::int AS created,
                    COALESCE(f.total, 0)::int AS failed
             FROM buckets b
             LEFT JOIN created c ON c.bucket = b.bucket
             LEFT JOIN failed f ON f.bucket = b.bucket
             ORDER BY b.bucket`,
            [minutes]
        ),
        pool.query(`SELECT COUNT(*)::int AS unpublished FROM outbox_events WHERE published = FALSE`)
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

export async function getWorkerLeases() {
    const result = await pool.query(
        `SELECT locked_by AS id, COUNT(*)::int AS active_jobs,
                MAX(updated_at) AS last_activity_at,
                ARRAY_AGG(id::text ORDER BY updated_at DESC) AS job_ids
         FROM jobs
         WHERE status = 'RUNNING' AND locked_by IS NOT NULL
         GROUP BY locked_by
         ORDER BY locked_by`
    );
    return result.rows;
}

export async function getQueueData() {
    const [counts, events, outbox, stream] = await Promise.all([
        getJobStatusCounts(),
        getRecentOutboxEvents(20),
        pool.query(
            `SELECT COUNT(*) FILTER (WHERE published = FALSE)::int AS unpublished,
                    COUNT(*) FILTER (WHERE published = TRUE)::int AS published
             FROM outbox_events`
        ),
        pool.query(
            `SELECT COALESCE(MAX(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000), 0)::float AS max_duration_ms
             FROM job_attempts
             WHERE completed_at IS NOT NULL AND started_at >= NOW() - INTERVAL '30 minutes'`
        )
    ]);

    return {
        counts,
        events,
        outbox: outbox.rows[0],
        maxAttemptDurationMs: stream.rows[0].max_duration_ms
    };
}
