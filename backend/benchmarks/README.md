# Performance benchmarks

## Authentication

The frontend uses email/password accounts, with passwords hashed using scrypt
and revocable sessions stored in PostgreSQL. Session IDs are random HttpOnly
cookies; only their SHA-256 hashes are stored. Protected API responses and job
records are scoped to the signed-in user. `/api/health` and `/api/ready` remain
public; metrics and application endpoints require a session.

Set `FRONTEND_ORIGIN` when the browser app is hosted on a different origin, and
set `BENCHMARK_EMAIL` and `BENCHMARK_PASSWORD` to an account for benchmark
runtime-metric collection. These credentials are used to obtain an HttpOnly
session and are not written to reports.

The API and worker report scripts write a JSON report and a same-name CSV file
under `backend/benchmarks/results/`. CSV columns are consistent between those
reports; metrics that a scenario cannot measure are left blank. JSON reports
include raw Autocannon summaries and details explaining unavailable measurements.
The matrix runner writes JSON only. Generated result files are ignored by Git.
The metrics snapshot and event-stream endpoints bypass API rate limiting so
benchmark instrumentation remains available under load; the benchmark target
itself remains subject to the configured limiter.

## API and job submission

Run the API health benchmark:

```sh
npm run bench:api
```

Run the job submission benchmark after checking the Upstash quota:

```sh
npm run bench:jobs -- --size 200 --confirm-upstash
```

The job benchmark records HTTP request rate, latency, failures, and submission
latency. It also snapshots completed-job timings, retries, outbox backlog,
pending Redis delivery age, API process RSS, and uptime. Worker-derived values
are snapshots and can be incomplete if jobs are still running.

## Worker execution

In one terminal, start workers with activity capture enabled:

```sh
npm run workers:start -- 20
```

In another terminal, submit a job benchmark, then create the final report after
all jobs reach a terminal state:

```sh
npm run bench:jobs -- --size 200 --run-id my-run --confirm-upstash
npm run workers:report -- --run-id my-run --size 200
```

The worker report includes terminal-job throughput, queue wait measured from
`jobs.created_at` to the first `job_attempts.started_at`, each attempt's
execution duration, end-to-end duration, and additional retry attempts. When a
matching submission report exists, its API measurements are included in the
worker report too.

Recovery delay is recorded only when a captured worker process exits while
processing a job and a different worker is later observed claiming that same
job. No crash/reassignment pair means the CSV value is blank and the JSON report
explains why. `--no-activity` disables this measurement.

The Redis pending-message count comes from the consumer-group summary. Its
oldest idle age is calculated from up to 1,000 pending entries; JSON records the
sample size and limit. Memory and process uptime are sampled at the beginning
and end of each benchmark report.

## Hosted staging matrix

`npm run bench:matrix -- --confirm-staging-benchmark` runs the additional
25/50 requests-per-second ramp, 100/250-client idempotency and claim contention,
1/2/4/8/16-worker scaling, a 3,000-job sustained run, and duplicate-delivery
verification against hosted services. Earlier 1/5/10/20 requests-per-second
sweeps and previously recorded concurrency/recovery cases are skipped.

This benchmark is intentionally restricted to **dedicated staging services**.
The benchmark starts local worker and outbox processes against the configured
database and Redis stream. Never point it at production or share its Redis
stream/consumer group with live workers: benchmark workers could claim normal
jobs. The staging API, PostgreSQL database, and Upstash Redis database must be
isolated from production and each other.

Configure the backend process environment with the dedicated staging
`DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN`.
Use the provider's TLS-enabled PostgreSQL connection URL. Set
`DATABASE_POOL_MAX` to a value appropriate for the managed database, and set
`RATE_LIMIT_MAX_REQUESTS` high enough for the short load burst (for example,
20000 with the current 60-second window). The runner sets
`DATABASE_POOL_MAX` to 2 for each local worker/outbox process by default;
override this with `BENCHMARK_WORKER_POOL_MAX` only if the staging database
connection limit allows it.

Set `BENCHMARK_TARGET=staging` and `BENCHMARK_BASE_URL` to the HTTPS staging API
URL before running. The runner refuses to start without those values and the
explicit confirmation flag. It registers a benchmark account and leaves
benchmark jobs/outbox rows in the dedicated staging database; clean these up
only through a deliberate staging-only maintenance procedure. Upstash plan
quotas and database connection limits still apply.

Generated reports are stored in `backend/benchmarks/results/` and are ignored
by Git. Managed PostgreSQL and Redis resource-level CPU/memory metrics are not
available through this runner; it records process RSS, local worker process
usage, and PostgreSQL connection observations instead.
