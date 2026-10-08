import autocannon from "autocannon";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZES = [200, 1000, 5000, 10000];
const JOB_TYPES = [
  "calculate_primes",
  "process_json",
  "cpu_intensive",
  "long_running"
];
const REQUESTS_PER_SECOND = 1;
const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));

function parseArgs(args) {
  const options = {
    size: 200,
    rate: REQUESTS_PER_SECOND,
    baseUrl: process.env.BENCHMARK_BASE_URL || "http://localhost:5000"
  };

  for (let index = 0; index < args.length; index += 1) {
    const [name, inlineValue] = args[index].split("=", 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined && value && !value.startsWith("--")) index += 1;

    if (name === "--size") options.size = Number(value);
    else if (name === "--rate") options.rate = Number(value);
    else if (name === "--base-url") options.baseUrl = value;
    else if (name === "--run-id") options.runId = value;
    else if (name === "--confirm-upstash") options.confirmUpstash = true;
    else if (name === "--dry-run") options.dryRun = true;
    else if (name === "--help" || name === "-h") options.help = true;
    else throw new Error(`Unknown option: ${name}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: npm run bench:jobs -- [options]

Options:
  --size <200|1000|5000|10000>  Number of jobs (default: 200)
  --rate <requests/second>      Overall request rate, 1 to 1.5 (default: 1)
  --base-url <url>              API origin (default: http://localhost:5000)
  --run-id <id>                 Optional unique run ID
  --dry-run                     Print the plan without contacting services
  --confirm-upstash             Confirm the Upstash account quota was checked
  --help                        Show this help

Each size is one run and gets its own run ID and idempotency keys. The test
persists jobs and does not delete them. The Upstash estimate counts one outbox
publish command per accepted job; worker and other application commands add to
that usage. Run larger sizes only after checking Upstash plan limits and
available database capacity.`);
}

function createPayload(type, ordinal) {
  const profileIndex = ordinal % 3;
  if (type === "calculate_primes") {
    return { maxLimit: [400, 600, 800][profileIndex] };
  }
  if (type === "process_json") {
    const batchSize = [16, 64, 128][profileIndex];
    return {
      data: {
        sequence: ordinal,
        category: "benchmark",
        batch: Array.from({ length: batchSize }, (_, item) => ({
          id: item,
          value: (item + 1) * (ordinal + 1),
          enabled: item % 2 === 0
        }))
      }
    };
  }
  if (type === "cpu_intensive") {
    return { iterations: [250000, 500000, 1000000][profileIndex] };
  }
  return { durationMs: [100, 250, 500][profileIndex] };
}

function buildRequests(size, runId) {
  const perType = size / JOB_TYPES.length;
  const typeOrdinals = Object.fromEntries(JOB_TYPES.map((type) => [type, 0]));
  const requests = [];

  for (let ordinal = 0; ordinal < perType; ordinal += 1) {
    for (const type of JOB_TYPES) {
      const typeOrdinal = typeOrdinals[type];
      typeOrdinals[type] += 1;
      const jobNumber = requests.length + 1;
      requests.push({
        method: "POST",
        path: "/api/jobs",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": `benchmark:${runId}:${String(jobNumber).padStart(5, "0")}`
        },
        body: JSON.stringify({
          type,
          payload: createPayload(type, typeOrdinal)
        })
      });
    }
  }

  return requests;
}

function makeRunId() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  return `${timestamp}-${randomUUID().slice(0, 8)}`;
}

function summarizeAutocannon(result) {
  return {
    requests: result.requests,
    throughput: result.throughput,
    latency: result.latency,
    statusCodeStats: result.statusCodeStats,
    non2xx: result.non2xx,
    errors: result.errors,
    timeouts: result.timeouts
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!SIZES.includes(options.size)) {
    throw new Error(`--size must be one of: ${SIZES.join(", ")}`);
  }
  if (options.size % JOB_TYPES.length !== 0) {
    throw new Error("Job count must divide evenly across the four job types");
  }
  if (!Number.isFinite(options.rate) || options.rate < 1 || options.rate > 1.5) {
    throw new Error("--rate must be between 1 and 1.5 requests/second");
  }

  const baseUrl = new URL(options.baseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error("--base-url must use HTTP or HTTPS");
  }

  const runId = options.runId || makeRunId();
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(runId)) {
    throw new Error("--run-id may contain only letters, numbers, dots, underscores, or hyphens");
  }
  const typeCounts = Object.fromEntries(JOB_TYPES.map((type) => [type, options.size / JOB_TYPES.length]));
  const plan = {
    runId,
    size: options.size,
    jobsPerType: typeCounts,
    requestRatePerSecond: options.rate,
    minimumEstimatedUpstashCommands: options.size,
    payloadProfiles: {
      calculate_primes: [400, 600, 800],
      process_json_batch_items: [16, 64, 128],
      cpu_intensive_iterations: [250000, 500000, 1000000],
      long_running_duration_ms: [100, 250, 500]
    }
  };

  if (options.dryRun) {
    console.log(JSON.stringify({ mode: "dry-run", plan }, null, 2));
    return;
  }
  if (!options.confirmUpstash) {
    throw new Error("Check your Upstash account quota, then rerun with --confirm-upstash to send benchmark traffic");
  }

  const [{ pool, checkDatabaseConnection }, { checkRedisConnection }] = await Promise.all([
    import("../src/config/database.js"),
    import("../src/config/redis.js")
  ]);
  const idempotencyPrefix = `benchmark:${runId}:`;

  try {
    await Promise.all([checkDatabaseConnection(), checkRedisConnection()]);
    const readiness = await fetch(new URL("/api/ready", baseUrl));
    if (!readiness.ok) {
      throw new Error(`Backend readiness check failed with HTTP ${readiness.status}`);
    }

    const existing = await pool.query(
      "SELECT COUNT(*)::int AS count FROM jobs WHERE LEFT(idempotency_key, LENGTH($1)) = $1",
      [idempotencyPrefix]
    );
    if (existing.rows[0].count > 0) {
      throw new Error(`Run ID "${runId}" already has benchmark jobs; choose a new run ID`);
    }

    const systemState = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM jobs) AS existing_jobs,
         (SELECT COUNT(*)::int FROM outbox_events WHERE published = FALSE) AS unpublished_outbox_events`
    );
    const startedAt = new Date().toISOString();
    const allRequests = buildRequests(options.size, runId);
    const attempts = [];
    let remainingRequests = allRequests;
    console.log(JSON.stringify({
      mode: "benchmark",
      scope: "API job creation and PostgreSQL persistence; worker execution is not measured",
      startedAt,
      baseUrl: baseUrl.origin,
      databaseBefore: systemState.rows[0],
      plan
    }, null, 2));

    for (let attempt = 1; remainingRequests.length > 0 && attempt <= 5; attempt += 1) {
      if (attempt > 1) {
        console.warn(`Waiting 61 seconds before retrying ${remainingRequests.length} throttled or unpersisted job(s)`);
        await new Promise((resolve) => setTimeout(resolve, 61000));
      }

      const result = await autocannon({
        url: baseUrl.origin,
        connections: 1,
        pipelining: 1,
        amount: remainingRequests.length,
        overallRate: options.rate,
        requests: remainingRequests
      });
      attempts.push({
        attemptedJobs: remainingRequests.length,
        ...summarizeAutocannon(result)
      });

      const savedKeys = await pool.query(
        "SELECT idempotency_key FROM jobs WHERE LEFT(idempotency_key, LENGTH($1)) = $1",
        [idempotencyPrefix]
      );
      const savedKeySet = new Set(savedKeys.rows.map(({ idempotency_key }) => idempotency_key));
      remainingRequests = allRequests.filter((request) =>
        !savedKeySet.has(request.headers["Idempotency-Key"])
      );
    }

    const persisted = await pool.query(
      `SELECT type, COUNT(*)::int AS count,
              COUNT(DISTINCT idempotency_key)::int AS distinct_keys
       FROM jobs
       WHERE LEFT(idempotency_key, LENGTH($1)) = $1
       GROUP BY type`,
      [idempotencyPrefix]
    );
    const persistedByType = Object.fromEntries(persisted.rows.map(({ type, count, distinct_keys }) => [
      type,
      { count, distinctKeys: distinct_keys }
    ]));
    const totalPersisted = Object.values(persistedByType).reduce((sum, entry) => sum + entry.count, 0);
    const completedAt = new Date().toISOString();
    const totalSent = attempts.reduce((sum, attempt) => sum + attempt.requests.total, 0);
    const totalNon2xx = attempts.reduce((sum, attempt) => sum + attempt.non2xx, 0);
    const report = {
      ...plan,
      baseUrl: baseUrl.origin,
      scope: "API job creation and PostgreSQL persistence; worker execution is not measured",
      startedAt,
      completedAt,
      databaseBefore: systemState.rows[0],
      autocannon: {
        attempts,
        requestsSent: totalSent,
        non2xx: totalNon2xx
      },
      persisted: {
        total: totalPersisted,
        byType: persistedByType
      },
      passed: totalPersisted === options.size
        && JOB_TYPES.every((type) => persistedByType[type]?.count === typeCounts[type]
          && persistedByType[type]?.distinctKeys === typeCounts[type])
        && remainingRequests.length === 0
    };
    const resultsDirectory = join(SCRIPT_DIRECTORY, "results");
    const reportPath = join(resultsDirectory, `${runId}-${options.size}.json`);
    await mkdir(resultsDirectory, { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ reportPath, report }, null, 2));

    if (!report.passed) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Job benchmark failed: ${error.message}`);
  process.exitCode = 1;
});
