import { spawn } from "node:child_process";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const benchmarkDirectory = dirname(fileURLToPath(import.meta.url));
const resultsDirectory = join(benchmarkDirectory, "results");
const activityPath = join(resultsDirectory, "worker-activity.ndjson");
const count = Number(process.argv[2] || 20);
const captureActivity = process.argv[3] !== "--no-activity";
const children = [];
const activeJobsByWorker = new Map();
let writeQueue = Promise.resolve();
let stoppingForSignal = false;

if (!Number.isInteger(count) || count < 1 || count > 50) {
  throw new Error("Worker count must be an integer between 1 and 50");
}

if (captureActivity) {
  await mkdir(resultsDirectory, { recursive: true });
  await writeFile(activityPath, "", "utf8");
}

function record(workerId, jobId, type, event) {
  if (!captureActivity) return;
  const entry = {
    timestamp: new Date().toISOString(),
    workerId,
    jobId,
    type,
    event
  };
  writeQueue = writeQueue.then(() => appendFile(activityPath, `${JSON.stringify(entry)}\n`));
  writeQueue.catch((error) => {
    console.error("Unable to save worker activity:", error);
    process.exitCode = 1;
  });
}

function stopWorkers(signal) {
  stoppingForSignal = true;
  console.log(`${signal} received; stopping ${children.length} job worker(s)`);
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill();
  }
}

process.on("SIGINT", () => stopWorkers("SIGINT"));
process.on("SIGTERM", () => stopWorkers("SIGTERM"));

for (let index = 1; index <= count; index += 1) {
  const workerId = `worker-${String(index).padStart(2, "0")}`;
  const child = spawn(
    process.execPath,
    ["src/workers/job.worker.js"],
    {
      cwd: join(benchmarkDirectory, ".."),
      env: { ...process.env, WORKER_ID: workerId },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  children.push(child);
  activeJobsByWorker.set(workerId, new Map());
  record(workerId, null, null, "worker-started");

  let stdoutBuffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() || "";
    for (const line of lines) {
      const assigned = line.match(/^\[([^\]]+)\] Processing job ([0-9a-f-]+) \(([^)]+)\)$/i);
      if (assigned) {
        activeJobsByWorker.get(workerId).set(assigned[2], assigned[3]);
        record(assigned[1], assigned[2], assigned[3], "assigned");
      }

      const completed = line.match(/^\[([^\]]+)\] Job ([0-9a-f-]+) completed successfully$/i);
      if (completed) {
        activeJobsByWorker.get(workerId).delete(completed[2]);
        record(completed[1], completed[2], null, "completed");
      }

      const failed = line.match(/^\[([^\]]+)\] Job ([0-9a-f-]+) failed:/i);
      if (failed) {
        const type = activeJobsByWorker.get(workerId).get(failed[2]) || null;
        activeJobsByWorker.get(workerId).delete(failed[2]);
        record(failed[1], failed[2], type, "failed");
      }

      if (line.includes("] Worker started")) console.log(`[${workerId}] started (pid ${child.pid})`);
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => process.stderr.write(`[${workerId}] ${chunk}`));
  child.on("error", (error) => console.error(`[${workerId}] failed to start:`, error.message));
  child.on("exit", (code, signal) => {
    if (!stoppingForSignal) {
      for (const [jobId, type] of activeJobsByWorker.get(workerId)) {
        record(workerId, jobId, type, "worker-crashed");
      }
    }
    console.log(`[${workerId}] exited (code ${code}, signal ${signal})`);
  });
}

console.log(`Started ${count} job worker process(es); activity capture ${captureActivity ? "enabled" : "disabled"}.`);
