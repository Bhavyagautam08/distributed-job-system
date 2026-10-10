import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CSV_COLUMNS,
  sampleBacklogs,
  serializeCsv,
  summarizeHttpResults,
  summarizeRecovery,
  writeBenchmarkReport
} from "../benchmarks/report-utils.js";

test("summarizes request rate, latency, HTTP failures, server errors, and 429 responses", () => {
  const summary = summarizeHttpResults([{
    requests: { total: 10, average: 5 },
    latency: { p50: 12, p95: 40, p99: 55 },
    statusCodeStats: {
      200: { count: 8 },
      429: { count: 1 },
      503: { count: 1 }
    },
    non2xx: 2,
    errors: 0,
    timeouts: 0
  }]);

  assert.equal(summary.requestsPerSecond, 5);
  assert.equal(summary.latencyP50Ms, 12);
  assert.equal(summary.latencyP95Ms, 40);
  assert.equal(summary.latencyP99Ms, 55);
  assert.equal(summary.failedRequests, 2);
  assert.equal(summary.httpErrorRatePct, 20);
  assert.equal(summary.http5xx, 1);
  assert.equal(summary.expected429, 0);
  assert.equal(summary.unexpected429, 1);
});

test("captures outbox backlog and Redis pending-message age without overstating a capped sample", async () => {
  const backlog = await sampleBacklogs({
    async query() {
      return { rows: [{ count: 4, oldest_age_ms: "1250" }] };
    }
  }, {
    async xpending() {
      return [["message-1", "worker-1", 900, 2]];
    },
    async xinfo() {
      return [["name", "job-workers", "pending", 1500, "lag", 12]];
    }
  });

  assert.equal(backlog.outboxUnpublishedCount, 4);
  assert.equal(backlog.outboxOldestAgeMs, 1250);
  assert.equal(backlog.pendingRedisMessages, 1500);
  assert.equal(backlog.pendingRedisOldestIdleMs, null);
  assert.equal(backlog.pendingRedisOldestIdleSampleMs, 900);
  assert.equal(backlog.pendingRedisAgeSampleSize, 1);
});

test("records recovery delay only when a crashed worker's job is reassigned", () => {
  const crashAt = Date.parse("2026-10-10T10:00:00.000Z");
  const recovery = summarizeRecovery([
    {
      timestamp: new Date(crashAt - 1000).toISOString(),
      event: "assigned",
      jobId: "job-1",
      workerId: "worker-1"
    },
    {
      timestamp: new Date(crashAt).toISOString(),
      event: "worker-crashed",
      jobId: "job-1",
      workerId: "worker-1"
    },
    {
      timestamp: new Date(crashAt + 750).toISOString(),
      event: "assigned",
      jobId: "job-1",
      workerId: "worker-2"
    }
  ], ["job-1"]);

  assert.equal(recovery.recoveryCount, 1);
  assert.equal(recovery.recoveryDelayMs, 750);
  assert.equal(recovery.recoveryDelayP50Ms, 750);
});

test("writes a CSV row with the full metrics schema and escapes text values", () => {
  const csv = serializeCsv({
    runId: "run-1",
    scenario: "worker, execution",
    startedAt: "2026-10-10T10:00:00.000Z",
    completedAt: "2026-10-10T10:01:00.000Z",
    performanceMetrics: {
      requestsPerSecond: 12.5,
      unexpected429: 2,
      recoveryDelayMs: null,
      recoveryDelayStatus: 'not measured, "no crash"'
    }
  });
  const [header, row] = csv.split("\n");

  assert.equal(header, CSV_COLUMNS.join(","));
  assert.equal(row.split(",")[0], "run-1");
  assert.match(row, /"worker, execution"/);
  assert.match(row, /"not measured, ""no crash"""/);
  assert.match(header, /pending_redis_oldest_idle_ms/);
  assert.match(header, /memory_rss_delta_bytes/);
});

test("writes paired JSON and CSV files for a benchmark run", async () => {
  const directory = await mkdtemp(join(tmpdir(), "benchmark-report-"));
  const reportPath = join(directory, "sample-run.json");
  const report = {
    runId: "sample-run",
    scenario: "api-health",
    performanceMetrics: { requestsPerSecond: 10 }
  };

  try {
    const files = await writeBenchmarkReport(reportPath, report);
    assert.equal(files.jsonPath, reportPath);
    assert.equal(files.csvPath, join(directory, "sample-run.csv"));
    assert.deepEqual(JSON.parse(await readFile(files.jsonPath, "utf8")), report);
    assert.match(await readFile(files.csvPath, "utf8"), /^run_id,scenario,/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
