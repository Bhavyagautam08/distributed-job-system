import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const CSV_COLUMNS = [
  "run_id",
  "scenario",
  "started_at",
  "completed_at",
  "requests_per_sec",
  "api_latency_p50_ms",
  "api_latency_p95_ms",
  "api_latency_p99_ms",
  "api_latency_scope",
  "http_failed_requests",
  "http_error_rate_pct",
  "http_5xx",
  "expected_429",
  "unexpected_429",
  "transport_errors",
  "job_submission_latency_p50_ms",
  "job_submission_latency_p95_ms",
  "job_submission_latency_p99_ms",
  "terminal_jobs_per_sec",
  "queue_wait_p50_ms",
  "queue_wait_p95_ms",
  "attempt_duration_p50_ms",
  "attempt_duration_p95_ms",
  "end_to_end_p50_ms",
  "end_to_end_p95_ms",
  "retry_count",
  "recovery_delay_ms",
  "recovery_delay_status",
  "outbox_unpublished_count",
  "outbox_oldest_age_ms",
  "pending_redis_messages",
  "pending_redis_oldest_idle_ms",
  "pending_redis_oldest_idle_sample_ms",
  "pending_redis_age_sample_size",
  "pending_redis_age_sample_limit",
  "memory_rss_start_bytes",
  "memory_rss_end_bytes",
  "memory_rss_delta_bytes",
  "process_uptime_start_seconds",
  "process_uptime_end_seconds"
];

function statusCount(results, predicate) {
  return results.reduce((total, result) => {
    const stats = result.statusCodeStats || {};
    return total + Object.entries(stats).reduce((count, [status, value]) => {
      if (!predicate(Number(status))) return count;
      return count + Number(typeof value === "number" ? value : value?.count || 0);
    }, 0);
  }, 0);
}

export function summarizeHttpResults(results) {
  const totalRequests = results.reduce((total, result) => total + Number(result.requests?.total || 0), 0);
  const transportErrors = results.reduce((total, result) => total + Number(result.errors || 0) + Number(result.timeouts || 0), 0);
  const non2xx = results.reduce((total, result) => total + Number(result.non2xx || 0), 0);
  const failedRequests = transportErrors + non2xx;
  const http5xx = statusCount(results, (status) => status >= 500);
  const unexpected429 = statusCount(results, (status) => status === 429);
  const requestsPerSecond = totalRequests
    ? results.reduce((total, result) => total + Number(result.requests?.average || 0) * Number(result.requests?.total || 0), 0) / totalRequests
    : null;
  const measuredLatency = results[0]?.latency || null;

  return {
    requestsPerSecond,
    requestsTotal: totalRequests,
    latencyP50Ms: measuredLatency?.p50 ?? null,
    latencyP95Ms: measuredLatency?.p95 ?? null,
    latencyP99Ms: measuredLatency?.p99 ?? null,
    latencyPercentileScope: results.length > 1
      ? "first request attempt; each retry attempt is reported separately"
      : "all requests in the single request attempt",
    failedRequests,
    httpErrorRatePct: totalRequests ? (failedRequests / totalRequests) * 100 : null,
    http5xx,
    expected429: 0,
    unexpected429,
    transportErrors,
    latencyByAttempt: results.map((result, index) => ({
      attempt: index + 1,
      p50Ms: result.latency?.p50 ?? null,
      p95Ms: result.latency?.p95 ?? null,
      p99Ms: result.latency?.p99 ?? null
    }))
  };
}

export async function authenticateBenchmark(baseUrl) {
  const { BENCHMARK_EMAIL: email, BENCHMARK_PASSWORD: password } = process.env;
  if (!email || !password) {
    throw new Error("Set BENCHMARK_EMAIL and BENCHMARK_PASSWORD to capture authenticated runtime metrics");
  }

  const response = await fetch(new URL("/api/auth/login", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(`Unable to authenticate benchmark metrics account: HTTP ${response.status}`);
  }
  const setCookie = response.headers.get("set-cookie");
  const cookie = setCookie?.split(";", 1)[0];
  if (!cookie) {
    throw new Error("Unable to authenticate benchmark metrics account: session cookie is missing");
  }
  return cookie;
}

export async function sampleRuntimeMetrics(baseUrl, cookie) {
  if (!cookie) {
    throw new Error("An authenticated session is required to capture runtime metrics");
  }
  const response = await fetch(new URL("/api/metrics", baseUrl), {
    headers: { Cookie: cookie }
  });
  if (!response.ok) {
    throw new Error(`Unable to capture runtime metrics: /api/metrics returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const runtime = payload?.metrics;
  const uptimeSeconds = runtime?.process?.uptimeSeconds;
  const rssBytes = runtime?.memory?.rss;
  if (!Number.isFinite(uptimeSeconds) || !Number.isFinite(rssBytes)) {
    throw new Error("Unable to capture runtime metrics: response is missing process uptime or RSS memory");
  }

  return {
    uptimeSeconds,
    rssBytes
  };
}

export async function sampleBacklogs(pool, redis) {
  const outboxResult = await pool.query(
    `SELECT COUNT(*)::int AS count,
            EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) * 1000 AS oldest_age_ms
     FROM outbox_events
     WHERE published = FALSE`
  );
  const pendingEntries = await redis.xpending("job-events", "job-workers", "-", "+", 1000);
  const groups = await redis.xinfo("job-events", { type: "GROUPS" });
  const group = groups.find((fields) => fields.includes("job-workers"));
  const pendingIndex = group?.indexOf("pending") ?? -1;
  const pendingCount = pendingIndex < 0 ? 0 : Number(group[pendingIndex + 1]);
  const lagIndex = group?.indexOf("lag") ?? -1;

  if (!Array.isArray(pendingEntries)) {
    throw new Error("Unable to capture Redis pending-message age: unexpected XPENDING response");
  }

  return {
    outboxUnpublishedCount: Number(outboxResult.rows[0].count),
    outboxOldestAgeMs: outboxResult.rows[0].oldest_age_ms === null
      ? null
      : Number(outboxResult.rows[0].oldest_age_ms),
    pendingRedisMessages: pendingCount,
    pendingRedisOldestIdleMs: pendingCount <= pendingEntries.length && pendingEntries.length
      ? Math.max(...pendingEntries.map((entry) => Number(entry[2])))
      : null,
    pendingRedisOldestIdleSampleMs: pendingEntries.length
      ? Math.max(...pendingEntries.map((entry) => Number(entry[2])))
      : null,
    pendingRedisAgeSampleSize: pendingEntries.length,
    pendingRedisAgeSampleLimit: 1000,
    redisStreamLag: lagIndex < 0 ? null : Number(group[lagIndex + 1])
  };
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}

export function summarizeRecovery(events, jobIds) {
  const trackedJobs = new Set(jobIds);
  const delays = [];
  for (const [index, crash] of events.entries()) {
    if (crash.event !== "worker-crashed" || !trackedJobs.has(crash.jobId)) continue;
    const crashTime = new Date(crash.timestamp).getTime();
    const reassignment = events.slice(index + 1).find((event) =>
      event.event === "assigned"
      && event.jobId === crash.jobId
      && event.workerId !== crash.workerId
      && new Date(event.timestamp).getTime() >= crashTime
    );
    if (reassignment) {
      delays.push(new Date(reassignment.timestamp).getTime() - crashTime);
    }
  }

  return {
    recoveryCount: delays.length,
    recoveryDelayMs: delays.length
      ? Number((delays.reduce((sum, delay) => sum + delay, 0) / delays.length).toFixed(3))
      : null,
    recoveryDelayP50Ms: percentile(delays, 0.5),
    recoveryDelayP95Ms: percentile(delays, 0.95),
    recoveryDelayMaxMs: delays.length ? Math.max(...delays) : null
  };
}

export function runtimeMetricsBetween(start, end) {
  return {
    rssStartBytes: start.rssBytes,
    rssEndBytes: end.rssBytes,
    rssDeltaBytes: end.rssBytes - start.rssBytes,
    processUptimeStartSeconds: start.uptimeSeconds,
    processUptimeEndSeconds: end.uptimeSeconds
  };
}

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeCsv(report) {
  const row = performanceCsvRow(report);
  return [
    CSV_COLUMNS.join(","),
    CSV_COLUMNS.map((column) => csvValue(row[column])).join(",")
  ].join("\n");
}

export function performanceCsvRow(report) {
  const metrics = report.performanceMetrics || {};
  return {
    run_id: report.runId ?? "",
    scenario: report.scenario ?? "",
    started_at: report.startedAt ?? "",
    completed_at: report.completedAt ?? report.generatedAt ?? "",
    requests_per_sec: metrics.requestsPerSecond,
    api_latency_p50_ms: metrics.apiLatencyP50Ms,
    api_latency_p95_ms: metrics.apiLatencyP95Ms,
    api_latency_p99_ms: metrics.apiLatencyP99Ms,
    api_latency_scope: metrics.apiLatencyMeasurementScope,
    http_failed_requests: metrics.failedRequests,
    http_error_rate_pct: metrics.httpErrorRatePct,
    http_5xx: metrics.http5xx,
    expected_429: metrics.expected429,
    unexpected_429: metrics.unexpected429,
    transport_errors: metrics.transportErrors,
    job_submission_latency_p50_ms: metrics.jobSubmissionLatencyP50Ms,
    job_submission_latency_p95_ms: metrics.jobSubmissionLatencyP95Ms,
    job_submission_latency_p99_ms: metrics.jobSubmissionLatencyP99Ms,
    terminal_jobs_per_sec: metrics.terminalJobsPerSecond,
    queue_wait_p50_ms: metrics.queueWaitP50Ms,
    queue_wait_p95_ms: metrics.queueWaitP95Ms,
    attempt_duration_p50_ms: metrics.attemptDurationP50Ms,
    attempt_duration_p95_ms: metrics.attemptDurationP95Ms,
    end_to_end_p50_ms: metrics.endToEndP50Ms,
    end_to_end_p95_ms: metrics.endToEndP95Ms,
    retry_count: metrics.retryCount,
    recovery_delay_ms: metrics.recoveryDelayMs,
    recovery_delay_status: metrics.recoveryDelayStatus,
    outbox_unpublished_count: metrics.outboxUnpublishedCount,
    outbox_oldest_age_ms: metrics.outboxOldestAgeMs,
    pending_redis_messages: metrics.pendingRedisMessages,
    pending_redis_oldest_idle_ms: metrics.pendingRedisOldestIdleMs,
    pending_redis_oldest_idle_sample_ms: metrics.pendingRedisOldestIdleSampleMs,
    pending_redis_age_sample_size: metrics.pendingRedisAgeSampleSize,
    pending_redis_age_sample_limit: metrics.pendingRedisAgeSampleLimit,
    memory_rss_start_bytes: metrics.rssStartBytes,
    memory_rss_end_bytes: metrics.rssEndBytes,
    memory_rss_delta_bytes: metrics.rssDeltaBytes,
    process_uptime_start_seconds: metrics.processUptimeStartSeconds,
    process_uptime_end_seconds: metrics.processUptimeEndSeconds
  };
}

export async function writeBenchmarkReport(reportPath, report) {
  await mkdir(dirname(reportPath), { recursive: true });
  const csvPath = reportPath.replace(/\.json$/i, ".csv");
  const csv = serializeCsv(report);

  await Promise.all([
    writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(csvPath, `${csv}\n`, "utf8")
  ]);
  return { jsonPath: reportPath, csvPath };
}
