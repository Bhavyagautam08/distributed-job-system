import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/config/database.js";
import { redis } from "../src/config/redis.js";
import {
  authenticateBenchmark,
  runtimeMetricsBetween,
  sampleBacklogs,
  sampleRuntimeMetrics,
  summarizeRecovery,
  writeBenchmarkReport
} from "./report-utils.js";

function parseOptions(args) {
  const options = { expectedJobs: null };
  for (let index = 0; index < args.length; index += 1) {
    const [name, inlineValue] = args[index].split("=", 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined && value && !value.startsWith("--")) index += 1;
    if (name === "--run-id") options.runId = value;
    else if (name === "--size") options.expectedJobs = Number(value);
    else if (name === "--help" || name === "-h") options.help = true;
    else throw new Error(`Unknown option: ${name}`);
  }
  return options;
}

const options = parseOptions(process.argv.slice(2));
if (options.help) {
  console.log("Usage: npm run workers:report -- [--run-id <id> --size <job-count>]");
  console.log("Without options, reports the legacy 399-job benchmark workload.");
  console.log("Set BENCHMARK_EMAIL and BENCHMARK_PASSWORD to capture protected runtime metrics.");
  process.exit(0);
}
if (options.runId && options.expectedJobs === null) {
  throw new Error("--size is required when reporting a specific --run-id");
}
const EXPECTED_JOBS = options.expectedJobs ?? 399;
if (!Number.isInteger(EXPECTED_JOBS) || EXPECTED_JOBS < 1) {
  throw new Error("--size must be a positive integer");
}
if (options.runId && !/^[a-zA-Z0-9._-]{1,80}$/.test(options.runId)) {
  throw new Error("--run-id may contain only letters, numbers, dots, underscores, or hyphens");
}

const IDEMPOTENCY_PREFIX = options.runId ? `benchmark:${options.runId}:` : "benchmark:";
const benchmarkDirectory = dirname(fileURLToPath(import.meta.url));
const resultsDirectory = join(benchmarkDirectory, "results");
const activityPath = join(resultsDirectory, "worker-activity.ndjson");
const reportName = options.runId
  ? `${options.runId}-${EXPECTED_JOBS}-workers-report.json`
  : "399-jobs-workers-report.json";
const reportPath = join(resultsDirectory, reportName);
const baseUrl = new URL(process.env.BENCHMARK_BASE_URL || "http://localhost:5000");
const timeoutMs = 30 * 60 * 1000;
const pollIntervalMs = 5000;
const startedWaitingAt = Date.now();

function workerActivity(events, jobs) {
  const eventByJob = new Map();
  const completedByJob = new Map();
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const startedWorkers = new Set();

  for (const event of events) {
    if (event.event === "worker-started") {
      startedWorkers.add(event.workerId);
      continue;
    }
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
    startedWorkers: startedWorkers.size || workers.size,
    assignedJobs: selectedAssignments.size,
    completionEvents: [...completedByJob.keys()].filter((jobId) => jobsById.has(jobId)).length,
    firstAssignmentAt: assignedTimestamps.length ? new Date(Math.min(...assignedTimestamps)).toISOString() : null,
    lastCompletionAt: completedTimestamps.length ? new Date(Math.max(...completedTimestamps)).toISOString() : null,
    recovery: summarizeRecovery(events, jobs.map((job) => job.id))
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

async function readSubmissionReport() {
  if (!options.runId) return null;
  let files;
  try {
    files = await readdir(resultsDirectory);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  const candidates = files.filter((file) =>
    file.startsWith(`${options.runId}-`)
    && file.endsWith(".json")
    && !file.endsWith("-workers-report.json")
  );
  if (candidates.length > 1) {
    throw new Error(`Multiple submission reports found for run "${options.runId}"`);
  }
  if (candidates.length === 0) return null;
  return JSON.parse(await readFile(join(resultsDirectory, candidates[0]), "utf8"));
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

function numberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

async function main() {
  const startedAt = new Date().toISOString();
  const authCookie = await authenticateBenchmark(baseUrl);
  const runtimeStart = await sampleRuntimeMetrics(baseUrl, authCookie);
  const backlogBefore = await sampleBacklogs(pool, redis);
  await waitUntilFinished();

  const [jobsByType, statuses, jobsByRun, jobTimings, attemptTimings, overallAttemptTimings, outboxEvents, activityJobs] = await Promise.all([
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
              MIN(j.created_at) AS first_created_at,
              MAX(j.completed_at) AS last_completed_at,
              AVG(EXTRACT(EPOCH FROM (first_attempt.started_at - j.created_at)) * 1000) AS avg_queue_wait_ms,
              percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_attempt.started_at - j.created_at)) * 1000)
                FILTER (WHERE first_attempt.started_at IS NOT NULL) AS p50_queue_wait_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_attempt.started_at - j.created_at)) * 1000)
                FILTER (WHERE first_attempt.started_at IS NOT NULL) AS p95_queue_wait_ms,
              AVG(EXTRACT(EPOCH FROM (j.completed_at - j.created_at)) * 1000) AS avg_end_to_end_ms,
              percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (j.completed_at - j.created_at)) * 1000) AS p50_end_to_end_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (j.completed_at - j.created_at)) * 1000) AS p95_end_to_end_ms,
              percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (j.completed_at - j.created_at)) * 1000) AS p99_end_to_end_ms
       FROM jobs j
       LEFT JOIN job_attempts first_attempt
         ON first_attempt.job_id = j.id AND first_attempt.attempt_number = 1
       WHERE LEFT(j.idempotency_key, LENGTH($1)) = $1
         AND j.completed_at IS NOT NULL`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
      `SELECT j.type, COUNT(ja.id)::int AS attempts,
              COUNT(*) FILTER (WHERE ja.status = 'SUCCESS')::int AS successful_attempts,
              COUNT(*) FILTER (WHERE ja.status = 'FAILED')::int AS failed_attempts,
              AVG(EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS avg_execution_ms,
              percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS p50_execution_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS p95_execution_ms,
              percentile_cont(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS p99_execution_ms,
              MAX(EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS max_execution_ms
       FROM jobs j
       LEFT JOIN job_attempts ja ON ja.job_id = j.id
       WHERE LEFT(j.idempotency_key, LENGTH($1)) = $1
       GROUP BY j.type ORDER BY j.type`,
      [IDEMPOTENCY_PREFIX]
    ),
    pool.query(
      `SELECT percentile_cont(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS p50_execution_ms,
              percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ja.completed_at - ja.started_at)) * 1000) AS p95_execution_ms
       FROM jobs j
       JOIN job_attempts ja ON ja.job_id = j.id
       WHERE LEFT(j.idempotency_key, LENGTH($1)) = $1
         AND ja.completed_at IS NOT NULL`,
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
  const [runtimeEnd, backlogAfter, submissionReport] = await Promise.all([
    sampleRuntimeMetrics(baseUrl, authCookie),
    sampleBacklogs(pool, redis),
    readSubmissionReport()
  ]);
  const byType = Object.fromEntries(jobsByType.rows.map((row) => [row.type, {
    total: row.total,
    succeeded: row.succeeded,
    failed: row.failed,
    cancelled: row.cancelled
  }]));
  const successful = Number(statuses.rows.find((row) => row.status === "SUCCESS")?.count || 0);
  const failed = Number(statuses.rows.find((row) => row.status === "FAILED")?.count || 0);
  const cancelled = Number(statuses.rows.find((row) => row.status === "CANCELLED")?.count || 0);
  const retries = attemptTimings.rows.reduce((sum, row) =>
    sum + Math.max(0, Number(row.attempts) - byType[row.type].total), 0);
  const completedJobsPerSecond = benchmarkElapsedSeconds > 0
    ? Number(((successful + failed + cancelled) / benchmarkElapsedSeconds).toFixed(3))
    : null;
  const recoveryDelayStatus = activity.recovery.recoveryCount
    ? "measured from worker-crashed to the next assignment on a different worker"
    : "not measured; no worker crash/reassignment pair was captured";
  const completedAt = new Date().toISOString();
  const runId = options.runId || "legacy-399";
  const submissionMetrics = submissionReport?.performanceMetrics || {};
  const performanceMetrics = {
    ...submissionMetrics,
    terminalJobsPerSecond: completedJobsPerSecond,
    queueWaitP50Ms: numberOrNull(timing.p50_queue_wait_ms),
    queueWaitP95Ms: numberOrNull(timing.p95_queue_wait_ms),
    attemptDurationP50Ms: numberOrNull(overallAttemptTimings.rows[0].p50_execution_ms),
    attemptDurationP95Ms: numberOrNull(overallAttemptTimings.rows[0].p95_execution_ms),
    endToEndP50Ms: numberOrNull(timing.p50_end_to_end_ms),
    endToEndP95Ms: numberOrNull(timing.p95_end_to_end_ms),
    retryCount: retries,
    recoveryDelayMs: activity.recovery.recoveryDelayMs,
    recoveryDelayStatus,
    ...backlogAfter,
    ...runtimeMetricsBetween(runtimeStart, runtimeEnd)
  };
  const report = {
    report: `${EXPECTED_JOBS} jobs worker execution`,
    runId,
    scenario: "worker-execution",
    startedAt,
    completedAt,
    measurementScope: `Worker execution and PostgreSQL state transitions for jobs with idempotency prefix ${IDEMPOTENCY_PREFIX}.`,
    submissionReport: submissionReport ? join(resultsDirectory, `${options.runId}-${EXPECTED_JOBS}.json`) : null,
    totals: {
      expectedJobs: EXPECTED_JOBS,
      actualJobs: Object.values(byType).reduce((sum, item) => sum + item.total, 0),
      successful,
      failed,
      cancelled,
      retries
    },
    jobsByType: byType,
    workerPool: {
      startedWorkers: activity.startedWorkers || null,
      workersThatClaimedJobs: activity.workers.length,
      assignedJobsCapturedFromWorkerLogs: activity.assignedJobs,
      completionEventsCapturedFromWorkerLogs: activity.completionEvents,
      assignmentsByWorker: activity.workers
    },
    performance: {
      elapsedSeconds: elapsedSeconds === null ? null : Number(elapsedSeconds.toFixed(3)),
      completedJobsPerSecond,
      completedJobsPerMinute: completedJobsPerSecond === null ? null : Number((completedJobsPerSecond * 60).toFixed(2)),
      enqueueToLastCompletionSeconds: benchmarkElapsedSeconds === null ? null : Number(benchmarkElapsedSeconds.toFixed(3)),
      avgQueueWaitMs: numberOrNull(timing.avg_queue_wait_ms),
      p50QueueWaitMs: numberOrNull(timing.p50_queue_wait_ms),
      p95QueueWaitMs: numberOrNull(timing.p95_queue_wait_ms),
      avgEndToEndMs: numberOrNull(timing.avg_end_to_end_ms),
      p50EndToEndMs: numberOrNull(timing.p50_end_to_end_ms),
      p95EndToEndMs: numberOrNull(timing.p95_end_to_end_ms),
      p99EndToEndMs: numberOrNull(timing.p99_end_to_end_ms),
      retryCount: retries,
      recovery: activity.recovery,
      executionByType: attemptTimings.rows.map((row) => ({
        type: row.type,
        attempts: row.attempts,
        successfulAttempts: row.successful_attempts,
        failedAttempts: row.failed_attempts,
        avgExecutionMs: numberOrNull(row.avg_execution_ms),
        p50ExecutionMs: numberOrNull(row.p50_execution_ms),
        p95ExecutionMs: numberOrNull(row.p95_execution_ms),
        p99ExecutionMs: numberOrNull(row.p99_execution_ms),
        maxExecutionMs: numberOrNull(row.max_execution_ms)
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
      lag: numberOrNull(groupValue("lag"))
    },
    backlogBefore,
    backlogAfter,
    runtime: {
      start: runtimeStart,
      end: runtimeEnd
    },
    performanceMetrics
  };

  const reportFiles = await writeBenchmarkReport(reportPath, report);
  console.log(`Saved ${reportFiles.jsonPath} and ${reportFiles.csvPath}`);
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
