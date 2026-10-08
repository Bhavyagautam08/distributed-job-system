import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getOverview } from "./api/dashboard";
import type { DashboardResponse, WorkerLease } from "./api/dashboard";
import "./workers.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkerStatus = "HEALTHY" | "DEGRADED" | "DRAINING" | "OFFLINE";

export type Worker = {
  id: string;
  host: string;
  version: string;
  status: WorkerStatus;
  jobsProcessed: number;
  activeJob: string | null;
  throughput: number;
  cpu: number;
  memoryMb: number;
  lastHeartbeatMs: number;
  uptimeMs: number;
  concurrency: number;
  maxConcurrency: number;
  jobsFailed: number;
  retryCount: number;
  containerId: string;
  hostIp: string;
  startedAt: string;
};

export type WorkerEvent = {
  id: string;
  time: string;
  workerId: string;
  text: string;
  type: "join" | "warn" | "ok" | "neutral";
};

export type FleetKpi = {
  activeWorkers: number;
  totalWorkers: number;
  healthyWorkers: number;
  jobsPerSec: number;
  jobsPerSecTrend: number;
  avgProcessingMs: number;
  p95ProcessingMs: number;
  failedJobs: number;
  failureRate: number;
};

export type ScalingConfig = {
  desired: number;
  running: number;
  minimum: number;
  maximum: number;
  autoscalingEnabled: boolean;
  autoscalingTargetCpuPct: number;
};

// ─── Icon ──────────────────────────────────────────────────────────────────────

type IconName =
  | "grid" | "jobs" | "workers" | "queue" | "metrics" | "system"
  | "search" | "refresh" | "chevron" | "close" | "external" | "menu"
  | "activity" | "users";

const iconPaths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  jobs: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></>,
  workers: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" /></>,
  queue: <><path d="M5 7h14M5 12h14M5 17h9" /><path d="m17 15 3 2-3 2" /></>,
  metrics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  system: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06A1.65 1.65 0 0 0 15 19.37a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.1V21h-4v-.09A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.62 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.1-.4H3v-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.63a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1.1V3h4v.09A1.65 1.65 0 0 0 15.4 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.36.3.6.7.6 1.13v.27h1v4h-.09A1.65 1.65 0 0 0 19.4 15Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.4-2.6L20 9M4 15l2.5 2.6A7 7 0 0 0 17.9 15" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  activity: <><path d="M4 12h3l2-6 4 12 2-6h5" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" /></>,
};

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtHeartbeat(ms: number) {
  if (ms < 2000) return "1s ago";
  if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
  return `${Math.round(ms / 60000)}m ago`;
}
function fmtUptime(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function WSBadge({ value }: { value: WorkerStatus | "ENABLED" }) {
  return <span className={`ws-badge ws-badge-${value.toLowerCase()}`}><i />{value}</span>;
}

// ─── Meter bar ─────────────────────────────────────────────────────────────────

function Meter({ value, warning = false }: { value: number; warning?: boolean }) {
  return (
    <div className="ws-meter">
      <span className={warning ? "warning" : ""} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

// ─── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, unit, note, spark, danger = false }: {
  label: string; value: string | number; unit?: string; note: ReactNode; spark: number[]; danger?: boolean;
}) {
  const s = spark.length ? spark : [0, 0, 0, 0, 0, 0, 0, 0];
  const mx = Math.max(...s); const mn = Math.min(...s); const rng = mx - mn || 1;
  const pts = s.map((v, i) => `${i * 14},${34 - ((v - mn) / rng) * 28}`).join(" ");
  return (
    <div className="ws-kpi-card">
      <div>
        <div className="ws-kpi-label">{label}</div>
        <div className="ws-kpi-value">{value}{unit && <small>{unit}</small>}</div>
        <div className="ws-kpi-note">{note}</div>
      </div>
      <svg className={`ws-sparkline${danger ? " spark-danger" : ""}`} viewBox="0 0 98 34" preserveAspectRatio="none">
        <polyline points={pts} />
      </svg>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

// ─── Activity Chart ────────────────────────────────────────────────────────────

function ActivityChart({ chartPoints, currentVal }: { chartPoints: number[]; currentVal: number }) {
  const n = chartPoints.length;
  let linePath = "";
  let areaPath = "";
  if (n > 1) {
    const svgW = 640; const svgH = 126;
    const mx = Math.max(...chartPoints, 1); const mn = Math.min(...chartPoints, 0); const rng = mx - mn || 1;
    const coords = chartPoints.map((v, i) => [
      (i / (n - 1)) * svgW,
      134 - ((v - mn) / rng) * svgH,
    ]);
    linePath = "M" + coords.map(([x, y]) => `${x} ${y}`).join(" L");
    areaPath = `M0 134 L${coords.map(([x, y]) => `${x} ${y}`).join(" L")} L${svgW} 134 Z`;
  }
  return (
    <section className="ws-panel ws-activity-panel">
      <div className="ws-panel-head compact">
        <div><div className="ws-panel-title">Fleet Activity</div><p>Aggregate throughput · last 30 minutes</p></div>
        <div className="ws-chart-value"><b>{currentVal.toFixed(1)}</b><span> jobs/s</span></div>
      </div>
      <div className="ws-chart">
        <div className="ws-y-labels"><span>180</span><span>120</span><span>60</span><span>0</span></div>
        <svg viewBox="0 0 640 145" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wsArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--ws-accent)" stopOpacity=".22" />
              <stop offset="1" stopColor="var(--ws-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="ws-grid-lines">
            {[8, 50, 92, 134].map((y) => <line key={y} x1="0" y1={y} x2="640" y2={y} />)}
          </g>
          {n > 1 && <>
            <path className="ws-chart-area" d={areaPath} />
            <path className="ws-chart-line" d={linePath} />
          </>}
        </svg>
        <div className="ws-x-labels"><span>-30m</span><span>-20m</span><span>-10m</span><span>now</span></div>
      </div>
      <div className="ws-chart-legend"><span><i className="ws-line-key" />THROUGHPUT</span></div>
    </section>
  );
}

// ─── Scaling panel ─────────────────────────────────────────────────────────────

function ScalingPanel({ config, onDown, onUp }: { config: ScalingConfig; onDown: () => void; onUp: () => void }) {
  return (
    <section className="ws-panel ws-scaling-panel">
      <div className="ws-panel-head compact">
        <div><div className="ws-panel-title">Worker Scaling</div><p>ECS service capacity</p></div>
        <WSBadge value="ENABLED" />
      </div>
      <div className="ws-scale-numbers">
        {[["DESIRED", config.desired], ["RUNNING", config.running], ["MINIMUM", config.minimum], ["MAXIMUM", config.maximum]].map(([l, v]) => (
          <div key={l as string}><span>{l as string}</span><b>{v as number}</b></div>
        ))}
      </div>
      <div className="ws-scale-range">
        <span style={{ width: `${(config.desired / config.maximum) * 100}%` }} />
        <i style={{ left: `${(config.desired / config.maximum) * 100}%` }} />
      </div>
      <div className="ws-scale-actions">
        <button onClick={onDown}>− Scale Down</button>
        <button onClick={onUp}>＋ Scale Up</button>
      </div>
      <div className="ws-scaling-note">
        <i />Autoscaling target: <b>{config.autoscalingTargetCpuPct}% CPU utilization</b>
      </div>
    </section>
  );
}

// ─── Event Feed ────────────────────────────────────────────────────────────────

function EventFeed({ events }: { events: WorkerEvent[] }) {
  return (
    <section className="ws-panel ws-events-panel">
      <div className="ws-panel-head compact">
        <div><div className="ws-panel-title">Recent Worker Events</div><p>Fleet lifecycle stream</p></div>
        <button className="ws-text-btn">VIEW ALL</button>
      </div>
      <div className="ws-event-list">
        {events.length === 0
          ? <div className="ws-empty-events"><Icon name="activity" size={18} /><span>No recent events</span></div>
          : events.map((ev) => (
            <div className="ws-event" key={ev.id}>
              <i className={ev.type} />
              <span className="ws-event-time">{ev.time}</span>
              <b>{ev.workerId}</b>
              <span>{ev.text}</span>
            </div>
          ))}
      </div>
    </section>
  );
}

// ─── Worker Detail ─────────────────────────────────────────────────────────────

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="ws-info"><span>{label}</span><b title={value}>{value}</b></div>;
}

function ResourceRow({ label, value, meter, warning = false }: { label: string; value: string; meter: number; warning?: boolean }) {
  return (
    <div className="ws-resource">
      <div><span>{label}</span><b className={warning ? "warn-text" : ""}>{value}</b></div>
      <Meter value={meter} warning={warning} />
    </div>
  );
}

function WorkerDetail({ worker, onAction }: { worker: Worker; onAction: (a: "drain" | "restart") => void }) {
  return (
    <aside className="ws-detail-panel ws-panel">
      <div className="ws-detail-head">
        <div>
          <div className="ws-detail-id">{worker.id}</div>
          <div className="ws-detail-host">{worker.host} · {worker.version}</div>
        </div>
        <WSBadge value={worker.status} />
      </div>
      <div className="ws-detail-actions">
        <button onClick={() => onAction("drain")}>Drain Worker</button>
        <button onClick={() => onAction("restart")}>Restart</button>
        <button aria-label="View logs"><Icon name="external" size={14} /></button>
      </div>

      <div className="ws-detail-section">
        <div className="ws-section-label">INSTANCE</div>
        <div className="ws-detail-grid">
          <InfoCell label="CONTAINER ID" value={worker.containerId.slice(0, 12)} />
          <InfoCell label="HOST" value={worker.hostIp} />
          <InfoCell label="STARTED AT" value={new Date(worker.startedAt).toLocaleString("en-GB", { hour12: false }).replace(",", "")} />
          <InfoCell label="UPTIME" value={fmtUptime(worker.uptimeMs)} />
          <InfoCell label="JOBS COMPLETED" value={worker.jobsProcessed.toLocaleString()} />
          <InfoCell label="JOBS FAILED" value={String(worker.jobsFailed)} />
          <InfoCell label="RETRY COUNT" value={String(worker.retryCount)} />
          <InfoCell label="CONCURRENCY" value={`${worker.concurrency} / ${worker.maxConcurrency}`} />
        </div>
      </div>

      <div className="ws-detail-section">
        <div className="ws-section-label">RESOURCE UTILIZATION</div>
        <ResourceRow label="CPU" value={`${worker.cpu}%`} meter={worker.cpu} warning={worker.cpu > 80} />
        <ResourceRow label="MEMORY" value={`${worker.memoryMb} / 1024 MB`} meter={(worker.memoryMb / 1024) * 100} />
        <ResourceRow label="EVENT LOOP" value="—" meter={0} />
        <ResourceRow label="POSTGRESQL" value="— / 20" meter={0} />
        <ResourceRow label="REDIS OPS" value="— / s" meter={0} />
      </div>

      <div className="ws-detail-section ws-execution">
        <div className="ws-section-top">
          <div className="ws-section-label">CURRENT EXECUTION</div>
          {worker.activeJob && <span className="ws-live"><i />LIVE</span>}
        </div>
        {worker.activeJob ? (
          <div className="ws-execution-card">
            <div className="ws-execution-id">{worker.activeJob.slice(0, 18)}… <Icon name="external" size={13} /></div>
            <div className="ws-execution-grid">
              <InfoCell label="TYPE" value="cpu_intensive" />
              <InfoCell label="ATTEMPT" value="1 / 3" />
              <InfoCell label="STARTED" value="—" />
              <InfoCell label="RUNTIME" value="—" />
            </div>
            <div className="ws-progress-head"><span>EXECUTION PROGRESS</span><b>—</b></div>
            <div className="ws-execution-progress"><span style={{ width: "50%" }} /></div>
            <div className="ws-lease-inline">
              <span>WORKER LEASE</span>
              <WSBadge value={worker.status === "DEGRADED" ? "DEGRADED" : "HEALTHY"} />
            </div>
          </div>
        ) : (
          <div className="ws-no-execution">No active job</div>
        )}
      </div>

      <div className="ws-detail-section ws-hb-section">
        <div className="ws-section-label">HEARTBEAT / LEASE</div>
        <div className="ws-heartbeat-visual">
          <div className={`ws-pulse-ring${worker.status === "DEGRADED" ? " degraded" : ""}`}><i /></div>
          <div className="ws-pulse-line"><span /><span /><span /><span /><span /><span /></div>
          <WSBadge value={worker.status === "DEGRADED" ? "DEGRADED" : "HEALTHY"} />
        </div>
        <div className="ws-lease-stats">
          <div><span>LAST HEARTBEAT</span><b>{fmtHeartbeat(worker.lastHeartbeatMs)}</b></div>
          <div><span>LEASE TIMEOUT</span><b>60s</b></div>
          <div><span>NEXT REFRESH</span><b>in 3s</b></div>
        </div>
        <p className="ws-lease-note">Lease continuously refreshed while execution ownership is active.</p>
      </div>

      <div className="ws-detail-footer">
        <button>View Logs <Icon name="external" size={13} /></button>
        <button>View Jobs <Icon name="external" size={13} /></button>
      </div>
    </aside>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ action, workerId, onClose, onConfirm }: {
  action: "drain" | "restart"; workerId: string; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <div className="ws-dialog-backdrop" onMouseDown={onClose}>
      <div className="ws-dialog" role="dialog" aria-modal="true" aria-labelledby="ws-dlg-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ws-dialog-head">
          <div id="ws-dlg-title">{action === "drain" ? "Drain worker" : "Restart worker"}</div>
          <button onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <p>{action === "drain"
          ? `Stop assigning new jobs to ${workerId} and wait for current executions to complete?`
          : `Restart ${workerId}? Active execution ownership will be released and jobs may be retried.`}</p>
        <div className="ws-dialog-callout">
          <span>Target</span><b>{workerId}</b>
          <span>Action</span><b>{action.toUpperCase()}</b>
        </div>
        <div className="ws-dialog-buttons">
          <button onClick={onClose}>Cancel</button>
          <button className="confirm" onClick={() => { onConfirm(); onClose(); }}>Confirm {action}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page defaults ─────────────────────────────────────────────────────────────

const defaultKpi: FleetKpi = {
  activeWorkers: 0, totalWorkers: 0, healthyWorkers: 0,
  jobsPerSec: 0, jobsPerSecTrend: 0,
  avgProcessingMs: 0, p95ProcessingMs: 0,
  failedJobs: 0, failureRate: 0,
};

const defaultScaling: ScalingConfig = {
  desired: 2, running: 0, minimum: 2, maximum: 20,
  autoscalingEnabled: true, autoscalingTargetCpuPct: 70,
};

// ─── Main Workers page ─────────────────────────────────────────────────────────

interface WorkersProps {
  workers?: Worker[];
  kpi?: FleetKpi;
  scaling?: ScalingConfig;
  events?: WorkerEvent[];
  chartPoints?: number[];
  onScaleDown?: () => void;
  onScaleUp?: () => void;
  onDrain?: (id: string) => void;
  onRestart?: (id: string) => void;
}

export default function Workers() {
  const [overview, setOverview] = useState<DashboardResponse | null>(null);
  const [search, setSearch] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setOverview(await getOverview("15m"));
      setError("");
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load worker leases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const workers: WorkerLease[] = overview?.workers ?? [];
  const visible = workers.filter((worker) => worker.id.toLowerCase().includes(search.toLowerCase()));
  const activeJobs = workers.reduce((total, worker) => total + worker.activeJobs, 0);
  const chart = overview?.chart ?? [];
  const createdMax = Math.max(1, ...chart.map((bucket) => bucket.created));
  const failedMax = Math.max(1, ...chart.map((bucket) => bucket.failed));
  const workerActive = (worker: WorkerLease) => Date.now() - new Date(worker.lastActivityAt).getTime() <= 60000;

  return (
    <div className="ws-shell">
      <section className="ws-workspace">
        <header className="ws-topbar">
          <div className="ws-title-block">
            <div className="ws-eyebrow">COMPUTE / OBSERVED LEASES</div>
            <div className="ws-page-title" role="heading" aria-level={1}>Workers</div>
            <div className="ws-subtitle">Worker identities observed through currently running job leases</div>
          </div>
          <div className="ws-header-tools">
            <label className="ws-search"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search observed workers..." aria-label="Search workers" /></label>
            <button className="ws-icon-btn" aria-label="Refresh" onClick={() => void refresh()} disabled={loading}><Icon name="refresh" /></button>
            <div className="ws-updated"><span>LAST UPDATED</span><b>{updatedAt ?? "—"}</b></div>
          </div>
        </header>
        <div className="ws-content">
          {error && <div className="ws-panel" role="alert" style={{ padding: "1rem", marginBottom: "1rem" }}>Worker lease data could not be loaded: {error}</div>}
          <div className="ws-kpi-grid">
            <KpiCard label="OBSERVED WORKERS" value={workers.length} note="Distinct active job owners" spark={chart.map((bucket) => bucket.created)} />
            <KpiCard label="RUNNING JOBS" value={activeJobs} note="Currently locked in PostgreSQL" spark={chart.map((bucket) => bucket.created)} />
            <KpiCard label="QUEUED JOBS" value={overview?.counts.QUEUED ?? "—"} note="Current database count" spark={chart.map((bucket) => bucket.created)} />
            <KpiCard label="FAILED JOBS" value={overview?.counts.FAILED ?? "—"} note="Current database count" spark={chart.map((bucket) => bucket.failed)} danger />
          </div>
          <div className="ws-main-grid">
            <div className="ws-left-col">
              <section className="ws-panel ws-fleet-panel">
                <div className="ws-panel-head"><div><div className="ws-panel-title">Observed Worker Leases</div><p>Derived from RUNNING jobs; this is not a worker registry</p></div><Link className="ws-text-btn" to="/jobs?status=RUNNING">VIEW RUNNING JOBS</Link></div>
                <div className="ws-table-wrap">
                  <table>
                    <thead><tr><th>LEASE STATE</th><th>LOCK OWNER</th><th>ACTIVE JOBS</th><th>LAST JOB ACTIVITY</th></tr></thead>
                    <tbody>
                      {visible.length === 0 && <tr><td colSpan={4} className="ws-empty-row">{loading ? "Loading observed leases…" : workers.length ? "No workers match your search" : "No running job leases observed"}</td></tr>}
                      {visible.map((worker) => {
                        const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(worker.lastActivityAt).getTime()) / 1000));
                        const state = workerActive(worker) ? "ACTIVE" : "STALE";
                        return <tr key={worker.id}>
                          <td><span className={`ws-badge ws-badge-${state.toLowerCase()}`}><i />{state}</span></td>
                          <td><strong>{worker.id}</strong></td>
                          <td>{worker.jobIds.map((jobId) => <Link className="ws-job-link" key={jobId} to={`/jobs/${jobId}`}>{jobId}</Link>)}</td>
                          <td>{ageSeconds < 60 ? `${ageSeconds}s ago` : `${Math.floor(ageSeconds / 60)}m ago`}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="ws-lower-grid">
                <section className="ws-panel ws-activity-panel">
                  <div className="ws-panel-head compact"><div><div className="ws-panel-title">Database Job Activity</div><p>Created and failed jobs · last 15 minutes</p></div></div>
                  {chart.length > 0 ? <svg viewBox="0 0 640 150" role="img" aria-label="Created and failed jobs in fifteen buckets">
                    <polyline points={chart.map((bucket, index) => `${index * 640 / Math.max(chart.length - 1, 1)},${140 - bucket.created * 120 / createdMax}`).join(" ")} fill="none" stroke="var(--ws-accent)" strokeWidth="2" />
                    <polyline points={chart.map((bucket, index) => `${index * 640 / Math.max(chart.length - 1, 1)},${140 - bucket.failed * 120 / failedMax}`).join(" ")} fill="none" stroke="var(--ws-red)" strokeWidth="2" />
                  </svg> : <div className="ws-empty-events">{loading ? "Loading job activity…" : "No chart data available"}</div>}
                  <div className="ws-chart-legend"><span><i className="ws-line-key" />CREATED JOBS</span><span><i className="ws-line-key ws-danger" />FAILED JOBS</span></div>
                </section>
                <section className="ws-panel ws-scaling-panel">
                  <div className="ws-panel-head compact"><div><div className="ws-panel-title">Worker Controls</div><p>No worker registry/control API is available</p></div></div>
                  <p className="ws-scaling-note">This service can observe job lock owners and lease activity only. CPU, memory, scaling, restart, and drain controls are not exposed by the backend.</p>
                </section>
              </div>
            </div>
            <aside className="ws-detail-panel ws-panel">
              <div className="ws-detail-head"><div><div className="ws-detail-id">Lease Data</div><div className="ws-detail-host">Source: running jobs in PostgreSQL</div></div></div>
              <div className="ws-detail-section">
                <div className="ws-section-label">AVAILABLE FIELDS</div>
                <div className="ws-detail-grid">
                  <InfoCell label="WORKER ID" value="locked_by" />
                  <InfoCell label="ACTIVE JOBS" value="Job IDs and count" />
                  <InfoCell label="ACTIVITY TIME" value="Latest job update" />
                  <InfoCell label="STALE HEURISTIC" value="No activity for 60s" />
                </div>
              </div>
              <div className="ws-detail-footer"><Link to="/queues">View queue state <Icon name="external" size={13} /></Link><Link to="/system">System health <Icon name="external" size={13} /></Link></div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
