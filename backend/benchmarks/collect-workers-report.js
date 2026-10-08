import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/config/database.js";
import { redis } from "../src/config/redis.js";

const EXPECTED_JOBS = 399;
const IDEMPOTENCY_PREFIX = "benchmark:";
const benchmarkDirectory = dirname(fileURLToPath(import.meta.url));
const resultsDirectory = join(benchmarkDirectory, "results");
const activityPath = join(resultsDirectory, "worker-activity.ndjson");
const reportPath = join(resultsDirectory, "399-jobs-workers-report.json");
const timeoutMs = 30 * 60 * 1000;
const pollIntervalMs = 5000;
const startedWaitingAt = Date.now();

function workerActivity(events, jobs) {
  const eventByJob = new Map();
  const completedByJob = new Map();
  const jobsById = new Map(jobs.map((job) => [job.id, job]));

  for (const event of events) {
    if (!jobsById.has(event.jobId)) continue;
    if (event.event === "assigned" && !eventByJob.has(event.jobId)) {
      eventByJob.set(event.jobId, event);
    }
    if (event.event === "completed") completedByJob.set(event.jobId, event);
  }

  const selectedAssignments = new Map();
  for (const job of jobs) {
    const completion = completedByJob.get(job.id);
    const assignment = eventByJob.get(job.id);
    const workerId = completion?.workerId || assignment?.workerId;
    if (workerId) {
      selectedAssignments.set(job.id, {
        workerId,
        type: job.type,
        assignedAt: assignment?.timestamp || null,
        completedAt: completion?.timestamp || null
      });
    }
  }

  const workers = new Map();
  for (const assignment of selectedAssignments.values()) {
    const worker = workers.get(assignment.workerId) || {
      workerId: assignment.workerId,
      assigned: 0,
      completed: 0,
      assignmentsByType: {}
    };
    worker.assigned += 1;
    worker.assignmentsByType[assignment.type] = (worker.assignmentsByType[assignment.type] || 0) + 1;
    if (assignment.completedAt) worker.completed += 1;
    workers.set(assignment.workerId, worker);
  }

  const assignedTimestamps = [...selectedAssignments.values()]
    .map((assignment) => assignment.assignedAt)
    .filter(Boolean)
    .map((timestamp) => new Date(timestamp).getTime());
  const completedTimestamps = [...selectedAssignments.values()]
    .map((assignment) => assignment.completedAt)
    .filter(Boolean)
    .map((timestamp) => new Date(timestamp).getTime());

  return {
    workers: [...workers.values()].sort((left, right) => left.workerId.localeCompare(right.workerId)),
    assignedJobs: selectedAssignments.size,
    completionEvents: [...completedByJob.keys()].filter((jobId) => jobsById.has(jobId)).length,
    firstAssignmentAt: assignedTimestamps.length ? new Date(Math.min(...assignedTimestamps)).toISOString() : null,
    lastCompletionAt: completedTimestamps.length ? new Date(Math.max(...completedTimestamps)).toISOString() : null
  };
}

async function readActivity() {
  try {
    const text = await readFile(activityPath, "utf8");
    return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function waitUntilFinished() {
  while (true) {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('SUCCESS', 'FAILED', 'CANCELLED'))::int AS terminal
       FROM jobs
       WHERE LEFT(idempotency_key, LENGTH($1)) = $1`,
      [IDEMPOTENCY_PREFIX]
    );
    const { total, terminal } = result.rows[0];
    console.log(`Worker report progress: ${terminal}/${total} terminal (${EXPECTED_JOBS} expected)`);

    if (total > EXPECTED_JOBS) {
      throw new Error(`Expected ${EXPECTED_JOBS} benchmark jobs, found ${total}; refusing to report mixed workload`);
    }
    if (total === EXPECTED_JOBS && terminal === EXPECTED_JOBS) return;
    if (Date.now() - startedWaitingAt > timeoutMs) {
      throw new Error(`Timed out waiting for ${EXPECTED_JOBS} benchmark jobs to finish`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

async function main() {
  await waitUntilFinished();

  const [jobsByType, statuses, jobsByRun, jobTimings, attemptTimings, outboxEvents, activityJobs] = await Promise.all([
    pool.query(
      `SELECT type, COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS succeeded,
              COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
              COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
       FROM jobs
       WHERE LEFT(idempotency_key, LENGTH($1)) = $1
       GROUP BY type ORDER BY type`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM jobs
       WHERE LEFT(idempotency_key, LENGTH($1)) = $1
       GROUP BY status ORDER BY status`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
      `SELECT split_part(idempotency_key, ':', 2) AS run_id,
              COUNT(*)::int AS total,
              COUNT(DISTINCT idempotency_key)::int AS distinct_idempotency_keys,
              MIN(created_at) AS first_created_at,
              MAX(created_at) AS last_created_at
       FROM jobs
       WHERE LEFT(idempotency_key, LENGTH($1)) = $1
       GROUP BY run_id ORDER BY first_created_at`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS completed,
              MIN(created_at) AS first_created_at,
              MAX(completed_at) AS last_completed_at,
              AVG(EXTRACT(EPOCH FROM (started_at - created_at)) * 1000) AS avg_queue_wait_ms,
              percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_at - created_at)) * 1000) AS p50_queue_wait_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (started_at - created_at)) * 1000) AS p95_queue_wait_ms,
              AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) AS avg_end_to_end_ms,
              percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) AS p50_end_to_end_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) AS p95_end_to_end_ms
       FROM jobs
       WHERE LEFT(idempotency_key, LENGTH($1)) = $1
         AND completed_at IS NOT NULL AND started_at IS NOT NULL`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
      `SELECT j.type, COUNT(ja.id)::int AS attempts,
              COUNT(*) FILTER (WHERE ja.status = 'SUCCESS')::int AS successful_attempts,
              COUNT(*) FILTER (WHERE ja.status = 'FAILED')::int AS failed_attempts,
              AVG(EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS avg_execution_ms,
              percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS p50_execution_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS p95_execution_ms,
              MAX(EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS max_execution_ms
       FROM jobs j
       LEFT JOIN job_attempts ja ON ja.job_id = j.id
       WHERE LEFT(j.idempotency_key, LENGTH($1)) = $1
       GROUP BY j.type ORDER BY j.type`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
      `SELECT event_type, published, COUNT(*)::int AS count
       FROM outbox_events
       WHERE aggregate_id IN (
         SELECT id FROM jobs
         WHERE LEFT(idempotency_key, LENGTH($1)) = $1
       )
       GROUP BY event_type, published ORDER BY event_type, published`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
       `SELECT id, type
        FROM jobs
        WHERE LEFT(idempotency_key, LENGTH($1)) = $1`,
       [IDEMPOTENCY_PREFIX]
    )
  ]);

  const timing = jobTimings.rows[0];
  const activity = workerActivity(await readActivity(), activityJobs.rows);
  const elapsedSeconds = activity.firstAssignmentAt && activity.lastCompletionAt
    ? (new Date(activity.lastCompletionAt) - new Date(activity.firstAssignmentAt)) / 1000
    : null;
  const benchmarkElapsedSeconds = timing.first_created_at && timing.last_completed_at
    ? (new Date(timing.last_completed_at) - new Date(timing.first_created_at)) / 1000
    : null;
  const groups = await redis.xinfo("job-events", { type: "GROUPS" });
  const groupInfo = groups.find((fields) => fields.includes("job-workers")) || [];
  const groupValue = (key) => {
    const index = groupInfo.indexOf(key);
    return index < 0 ? null : groupInfo[index + 1];
  };
  const byType = Object.fromEntries(jobsByType.rows.map((row) => [row.type, {
    total: row.total,
    succeeded: row.succeeded,
    failed: row.failed,
    cancelled: row.cancelled
  }]));
  const report = {
    report: "399 jobs worker execution",
    generatedAt: new Date().toISOString(),
    measurementScope: "Worker execution and PostgreSQL state transitions for jobs with benchmark: idempotency keys.",
    totals: {
      expectedJobs: EXPECTED_JOBS,
      actualJobs: Object.values(byType).reduce((sum, item) => sum + item.total, 0),
      successful: Number(statuses.rows.find((row) => row.status === "SUCCESS")?.count || 0),
      failed: Number(statuses.rows.find((row) => row.status === "FAILED")?.count || 0),
      cancelled: Number(statuses.rows.find((row) => row.status === "CANCELLED")?.count || 0),
      retries: attemptTimings.rows.reduce((sum, row) => sum + Math.max(0, Number(row.attempts) - byType[row.type].total), 0)
    },
    jobsByType: byType,
    workerPool: {
      requestedWorkers: 20,
      workersThatClaimedJobs: activity.workers.length,
      assignedJobsCapturedFromWorkerLogs: activity.assignedJobs,
      completionEventsCapturedFromWorkerLogs: activity.completionEvents,
      assignmentsByWorker: activity.workers
    },
    performance: {
      elapsedSeconds: elapsedSeconds === null ? null : Number(elapsedSeconds.toFixed(3)),
      completedJobsPerSecond: elapsedSeconds > 0 ? Number((EXPECTED_JOBS / elapsedSeconds).toFixed(3)) : null,
      completedJobsPerMinute: elapsedSeconds > 0 ? Number((EXPECTED_JOBS * 60 / elapsedSeconds).toFixed(2)) : null,
      enqueueToLastCompletionSeconds: benchmarkElapsedSeconds === null ? null : Number(benchmarkElapsedSeconds.toFixed(3)),
      avgQueueWaitMs: Number(timing.avg_queue_wait_ms || 0),
      p50QueueWaitMs: Number(timing.p50_queue_wait_ms || 0),
      p95QueueWaitMs: Number(timing.p95_queue_wait_ms || 0),
      avgEndToEndMs: Number(timing.avg_end_to_end_ms || 0),
      p50EndToEndMs: Number(timing.p50_end_to_end_ms || 0),
      p95EndToEndMs: Number(timing.p95_end_to_end_ms || 0),
      executionByType: attemptTimings.rows.map((row) => ({
        type: row.type,
        attempts: row.attempts,
        successfulAttempts: row.successful_attempts,
        failedAttempts: row.failed_attempts,
        avgExecutionMs: Number(row.avg_execution_ms || 0),
        p50ExecutionMs: Number(row.p50_execution_ms || 0),
        p95ExecutionMs: Number(row.p95_execution_ms || 0),
        maxExecutionMs: Number(row.max_execution_ms || 0)
      }))
    },
    runs: jobsByRun.rows.map((row) => ({
      runId: row.run_id,
      jobs: row.total,
      distinctIdempotencyKeys: row.distinct_idempotency_keys,
      firstCreatedAt: row.first_created_at,
      lastCreatedAt: row.last_created_at
    })),
    outboxEvents: outboxEvents.rows.map((row) => ({
      eventType: row.event_type,
      published: row.published,
      count: row.count
    })),
    redisStream: {
      stream: "job-events",
      consumerGroup: "job-workers",
      pendingMessages: Number(groupValue("pending") || 0),
      lag: Number(groupValue("lag") || 0)
    }
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Saved ${reportPath}`);
  console.log(JSON.stringify({
    totals: report.totals,
    workers: report.workerPool.workersThatClaimedJobs,
    assigned: report.workerPool.assignedJobsCapturedFromWorkerLogs,
    rate: report.performance.completedJobsPerSecond,
    executionByType: report.performance.executionByType
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(`Unable to generate worker report: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
