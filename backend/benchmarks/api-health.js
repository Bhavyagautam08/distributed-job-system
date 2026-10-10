import autocannon from "autocannon";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/config/database.js";
import { redis } from "../src/config/redis.js";
import {
  authenticateBenchmark,
  runtimeMetricsBetween,
  sampleBacklogs,
  sampleRuntimeMetrics,
  summarizeHttpResults,
  writeBenchmarkReport
} from "./report-utils.js";

function parseOptions(args) {
  const options = {
    url: process.env.BENCH_URL || "http://localhost:5000/api/health",
    duration: 30,
    connections: 10
  };
  for (let index = 0; index < args.length; index += 1) {
    const [name, inlineValue] = args[index].split("=", 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined && value && !value.startsWith("--")) index += 1;
    if (name === "--url") options.url = value;
    else if (name === "--duration") options.duration = Number(value);
    else if (name === "--connections") options.connections = Number(value);
    else if (name === "--help" || name === "-h") options.help = true;
    else throw new Error(`Unknown option: ${name}`);
  }
  return options;
}

const options = parseOptions(process.argv.slice(2));
if (options.help) {
  console.log("Usage: npm run bench:api -- [--url <health-url>] [--duration <seconds>] [--connections <count>]");
  console.log("Set BENCHMARK_EMAIL and BENCHMARK_PASSWORD for authenticated runtime metrics.");
  process.exit(0);
}
if (!Number.isInteger(options.duration) || options.duration < 1) {
  throw new Error("--duration must be a positive integer");
}
if (!Number.isInteger(options.connections) || options.connections < 1) {
  throw new Error("--connections must be a positive integer");
}

const url = options.url;
const baseUrl = new URL(url);
if (!["http:", "https:"].includes(baseUrl.protocol)) {
  throw new Error("--url must use HTTP or HTTPS");
}
const { duration, connections } = options;
const startedAt = new Date().toISOString();
const runId = `${startedAt.replace(/[-:.TZ]/g, "")}-${randomUUID().slice(0, 8)}`;
const benchmarkDirectory = dirname(fileURLToPath(import.meta.url));
const reportPath = join(benchmarkDirectory, "results", `api-health-${runId}.json`);

async function main() {
  const authCookie = await authenticateBenchmark(baseUrl);
  const runtimeStart = await sampleRuntimeMetrics(baseUrl, authCookie);
  const backlogBefore = await sampleBacklogs(pool, redis);
  console.log(`Benchmarking ${url}`);
  console.log(`${connections} connections for ${duration}s`);

  const result = await new Promise((resolve, reject) => {
    autocannon({ url, connections, duration }, (error, benchmarkResult) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(benchmarkResult);
    });
  });

  const [runtimeEnd, backlogAfter] = await Promise.all([
    sampleRuntimeMetrics(baseUrl, authCookie),
    sampleBacklogs(pool, redis)
  ]);
  const completedAt = new Date().toISOString();
  const httpMetrics = summarizeHttpResults([result]);
  const report = {
    runId,
    scenario: "api-health",
    startedAt,
    completedAt,
    target: url,
    durationSeconds: duration,
    connections,
    autocannon: {
      requests: result.requests,
      throughput: result.throughput,
      latency: result.latency,
      statusCodeStats: result.statusCodeStats,
      non2xx: result.non2xx,
      errors: result.errors,
      timeouts: result.timeouts,
      latencyPercentileScope: httpMetrics.latencyPercentileScope
    },
    backlogBefore,
    backlogAfter,
    runtime: {
      start: runtimeStart,
      end: runtimeEnd
    },
    performanceMetrics: {
      requestsPerSecond: httpMetrics.requestsPerSecond,
      apiLatencyP50Ms: httpMetrics.latencyP50Ms,
      apiLatencyP95Ms: httpMetrics.latencyP95Ms,
      apiLatencyP99Ms: httpMetrics.latencyP99Ms,
      apiLatencyMeasurementScope: httpMetrics.latencyPercentileScope,
      failedRequests: httpMetrics.failedRequests,
      httpErrorRatePct: httpMetrics.httpErrorRatePct,
      http5xx: httpMetrics.http5xx,
      unexpected429: httpMetrics.unexpected429,
      transportErrors: httpMetrics.transportErrors,
      jobSubmissionLatencyP50Ms: null,
      jobSubmissionLatencyP95Ms: null,
      jobSubmissionLatencyP99Ms: null,
      terminalJobsPerSecond: null,
      queueWaitP50Ms: null,
      queueWaitP95Ms: null,
      attemptDurationP50Ms: null,
      attemptDurationP95Ms: null,
      endToEndP50Ms: null,
      endToEndP95Ms: null,
      retryCount: null,
      recoveryDelayMs: null,
      recoveryDelayStatus: "not measured; this run does not execute jobs or crash workers",
      ...backlogAfter,
      ...runtimeMetricsBetween(runtimeStart, runtimeEnd)
    }
  };
  const reportFiles = await writeBenchmarkReport(reportPath, report);

  console.log("\n=== API Benchmark ===");
  console.log(`Requests: ${result.requests.total}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Non-2xx: ${result.non2xx}`);
  console.log(`Req/sec: ${result.requests.average}`);
  console.log(`P50: ${result.latency.p50} ms`);
  console.log(`P95: ${result.latency.p95} ms`);
  console.log(`P99: ${result.latency.p99} ms`);
  console.log(`JSON report: ${reportFiles.jsonPath}`);
  console.log(`CSV report: ${reportFiles.csvPath}`);
}

main()
  .catch((error) => {
    console.error(`API benchmark failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
