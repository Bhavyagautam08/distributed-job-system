import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

type IconName =
  | "activity" | "alert" | "bell" | "bolt" | "box" | "chart" | "check"
  | "chevron" | "clock" | "database" | "event" | "eye" | "grid" | "heart"
  | "jobs" | "menu" | "plus" | "queue" | "refresh" | "retry" | "search"
  | "server" | "settings" | "users" | "x";

const iconPaths: Record<IconName, ReactNode> = {
  activity: <><path d="M4 12h3l2-6 4 12 2-6h5" /></>,
  alert: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 16.5v.1" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  bolt: <><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></>,
  box: <><path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" /><path d="m4 7 8 4 8-4M12 11v10" /></>,
  chart: <><path d="M4 19V5M4 19h16M7 15l4-5 3 2 5-7" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  chevron: <><path d="m9 6 6 6-6 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
  event: <><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  heart: <><path d="M4 12h3l2-5 4 10 2-5h5" /><circle cx="12" cy="12" r="10" /></>,
  jobs: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  queue: <><path d="M6 6h14M6 12h14M6 18h14" /><circle cx="3" cy="6" r=".6" /><circle cx="3" cy="12" r=".6" /><circle cx="3" cy="18" r=".6" /></>,
  refresh: <><path d="M20 6v5h-5M4 18v-5h5" /><path d="M18.5 9A7.5 7.5 0 0 0 6 6.5L4 9M5.5 15A7.5 7.5 0 0 0 18 17.5l2-2.5" /></>,
  retry: <><path d="M20 7v5h-5M19 12a7 7 0 1 1-2-5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  server: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.1M7 17h.1" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" /></>,
  x: <><path d="m6 6 12 12M18 6 6 18" /></>,
};

function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

function Button({ children, variant = "secondary", icon, onClick, loading, type = "button" }: {
  children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: IconName;
  onClick?: () => void; loading?: boolean; type?: "button" | "submit";
}) {
  return <button type={type} className={`btn btn-${variant}`} onClick={onClick}>
    {icon && <Icon name={icon} className={loading ? "spin" : ""} />}{children}
  </button>;
}

type Worker = { id: string; cpu: number; jobs: number; status: "Healthy" | "Busy" | "Offline"; heartbeat: number };
type JobStatus = "SUCCESS" | "RUNNING" | "RETRYING" | "FAILED" | "QUEUED";
type Job = { status: JobStatus; id: string; type: string; worker: string; attempt: string; age: number; duration: string };
type EventLog = { type: string; text: string; time: string; tone: string };

const baseWorkers: Worker[] = [];

const baseJobs: Job[] = [];

const initialEvents: EventLog[] = [];

const chartSeed: number[] = Array(15).fill(0);

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}><i />{status}</span>;
}

function MetricCard({ label, value, detail, icon, tone = "normal", trend }: {
  label: string; value: string | number; detail?: string; icon: IconName; tone?: string; trend?: string;
}) {
  return <section className={`metric card tone-${tone}`}>
    <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon name={icon} /></span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-foot">
      {trend && trend !== "—" && <span className="trend">{trend}</span>}
      {detail && <span>{detail}</span>}
    </div>
  </section>;
}

function ThroughputChart({ values, range, setRange }: { values: number[]; range: string; setRange: (v: string) => void }) {
  const width = 760, height = 220;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - 1300) / 800) * height}`).join(" ");
  const failed = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (22 + ((v + i * 9) % 28))}`).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return <section className="card chart-card">
    <div className="card-head">
      <div><div className="section-title">Job Throughput <span className="live-tag"><i />LIVE</span></div><div className="section-subtitle">Processed jobs per minute</div></div>
      <div className="range-control">{["5m", "15m", "1h", "6h", "24h"].map(r => <button key={r} onClick={() => setRange(r)} className={range === r ? "active" : ""}>{r}</button>)}</div>
    </div>
    <div className="chart-wrap">
      <div className="y-axis"><span>2.1k</span><span>1.8k</span><span>1.5k</span><span>1.2k</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Live job throughput chart">
        <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6C8CFF" stopOpacity=".2" /><stop offset="1" stopColor="#6C8CFF" stopOpacity="0" /></linearGradient></defs>
        {[0, 73, 146, 219].map(y => <line key={y} x1="0" y1={y} x2={width} y2={y} className="gridline" />)}
        <polygon points={area} fill="url(#chartFill)" />
        <polyline points={points} className="processed-line" />
        <polyline points={failed} className="failed-line" />
        {(() => { const [x, y] = points.split(" ").at(-1)!.split(","); return <><circle cx={x} cy={y} r="8" className="point-pulse" /><circle cx={x} cy={y} r="3.5" className="point" /></>; })()}
      </svg>
      <div className="x-axis"><span>12:30</span><span>12:35</span><span>12:40</span><span>Now</span></div>
    </div>
    <div className="chart-legend"><span><i className="line-blue" />Processed</span><span><i className="line-red" />Failed</span></div>
  </section>;
}

function QueueVisualization({ queued, active, pending = 0, delayed = 0, dead = 0 }: { queued: number; active: number; pending?: number; delayed?: number; dead?: number }) {
  return <section className="card queue-card">
    <div className="card-head">
      <div><div className="section-title">Queue Health</div><div className="section-subtitle">Redis Stream <code>job-events</code> · Group <code>job-workers</code></div></div>
      <span className="delivery">At-least-once delivery <span title="Jobs may be delivered more than once. Workers use idempotency keys to prevent duplicate effects.">?</span></span>
    </div>
    <div className="queue-stats">
      <div><span>Queue depth</span><strong>{queued}</strong></div><div><span>Pending</span><strong>{pending}</strong></div>
      <div><span>Processing</span><strong>{active}</strong></div><div><span>Delayed</span><strong>{delayed}</strong></div>
      <div><span>Dead / failed</span><strong className="danger-text">{dead}</strong></div>
    </div>
    <div className="pipeline">
      {["Producer", "Redis Stream", "Consumer Group", "Workers"].map((label, i) => <div className="pipe-stage" key={label}>
        <div className="stage-icon"><Icon name={i === 0 ? "plus" : i === 1 ? "database" : i === 2 ? "queue" : "server"} /></div>
        <span>{label}</span>{i < 3 && <Icon name="chevron" className="pipe-arrow" />}
      </div>)}
      <div className="moving-job job-a" /><div className="moving-job job-b" /><div className="moving-job job-c" />
    </div>
    <div className="branch"><span>RETRY</span><div className="branch-line" /><span className="failed-node">FAILED</span><small>exponential backoff + jitter</small></div>
  </section>;
}

function WorkerFleet({ workers }: { workers: Worker[] }) {
  const activeCount = workers.filter(w => w.status !== "Offline").length;
  const healthyCount = workers.filter(w => w.status === "Healthy").length;
  const total = workers.length;

  return <section className="card worker-card">
    <div className="card-head"><div><div className="section-title">Worker Fleet</div><div className="section-subtitle">{activeCount} of {total} active workers</div></div><span className="healthy-summary"><i />{healthyCount} healthy</span></div>
    <div className="worker-columns"><span>WORKER</span><span>CPU</span><span>JOBS</span><span>HEARTBEAT</span><span>STATE</span></div>
    <div className="worker-list">
      {workers.length === 0 && <div className="empty-state" style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>No workers registered</div>}
      {workers.map(w => <div className="worker-row" key={w.id}>
      <code>{w.id}</code><div className="cpu"><span><i style={{ width: `${w.cpu}%` }} /></span><em>{w.cpu}%</em></div>
      <strong>{w.jobs}</strong><span className="heartbeat">{w.heartbeat}s ago</span><StatusBadge status={w.status} />
    </div>)}</div>
    <button className="text-action">View all workers <span>→</span></button>
  </section>;
}

function RecentJobs({ jobs, onSelect }: { jobs: Job[]; onSelect: (job: Job) => void }) {
  return <section className="card jobs-card">
    <div className="card-head"><div><div className="section-title">Recent Job Activity</div><div className="section-subtitle">Durable state from PostgreSQL</div></div><div className="table-actions"><button><Icon name="search" /> Filter</button><button>Created ↓</button></div></div>
    <div className="table-scroll"><table><thead><tr><th>STATUS</th><th>JOB ID</th><th>TYPE</th><th>WORKER</th><th>ATTEMPT</th><th>CREATED</th><th>DURATION</th></tr></thead>
      <tbody>
        {jobs.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: "1rem", color: "#666" }}>No recent jobs</td></tr>}
        {jobs.map((job, index) => <tr key={`${job.id}-${index}`} onClick={() => onSelect(job)} tabIndex={0}>
        <td><StatusBadge status={job.status} /></td><td><code>{job.id}</code></td><td><code>{job.type}</code></td><td>{job.worker}</td>
        <td>{job.attempt}</td><td>{job.age} sec ago</td><td className="duration">{job.duration}</td>
      </tr>)}</tbody></table></div>
  </section>;
}

function LiveEvents({ events }: { events: EventLog[] }) {
  return <section className="card events-card">
    <div className="card-head"><div><div className="section-title">Live Events <span className="live-tag"><i />LIVE</span></div><div className="section-subtitle">Redis Stream telemetry</div></div><button className="icon-btn" aria-label="Event visibility"><Icon name="eye" /></button></div>
    <div className="event-feed">
      {events.length === 0 && <div className="empty-state" style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>Awaiting events...</div>}
      {events.map((e, i) => <div className={`event-item ${i === 0 ? "new-event" : ""}`} key={`${e.time}-${e.type}-${i}`}>
      <span className={`event-dot ${e.tone}`}><Icon name={e.tone === "warning" ? "retry" : e.tone === "success" ? "check" : "event"} size={12} /></span>
      <div><div className="event-meta"><code>{e.type}</code><time>{e.time}</time></div><p>{e.text}</p></div>
    </div>)}</div>
  </section>;
}

const nav = [
  { group: "OVERVIEW", items: [["Command Center", "grid"]] },
  { group: "JOBS", items: [["All Jobs", "jobs"], ["Create Job", "plus"], ["Retry Queue", "retry"], ["Failed Jobs", "alert"]] },
  { group: "INFRASTRUCTURE", items: [["Workers", "users"], ["Queue", "queue"], ["Events", "event"]] },
  { group: "OBSERVABILITY", items: [["Metrics", "chart"], ["System Health", "heart"]] },
  { group: "SYSTEM", items: [["Settings", "settings"]] },
] as const;

function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  return <><aside className={`sidebar ${open ? "open" : ""}`}>
    <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><strong>JobMesh</strong><small>Distributed Job Processing</small></div><button onClick={close} className="mobile-close"><Icon name="x" /></button></div>
    <nav>{nav.map(section => <div className="nav-section" key={section.group}><div className="nav-label">{section.group}</div>{section.items.map(([label, icon]) => {
      const isJobs = label === "All Jobs";
      const isCmd = label === "Command Center";
      const isWorkers = label === "Workers";
      const isQueue = label === "Queue";
      const to = isJobs ? "/jobs" : isCmd ? "/" : isWorkers ? "/workers" : isQueue ? "/queues" : "#";
      return <Link to={to} className={`nav-item ${isCmd ? "selected" : ""}`} key={label}><Icon name={icon as IconName} /><span>{label}</span></Link>;
    })}</div>)}</nav>
    <div className="side-health"><div className="operational"><i />SYSTEMS STATUS</div>{[["API", "—"], ["Postgres", "—"], ["Redis", "—"], ["Workers", "—"]].map(([a, b]) => <div key={a}><span>{a}</span><strong>{b}</strong></div>)}</div>
  </aside>{open && <button className="scrim" onClick={close} aria-label="Close navigation" />}</>;
}

type HealthStats = { apiLatency: string; pgPool: string; redisLatency: string; workersActive: string; outboxEvents: string; lastReconciliation: string; };
const defaultHealthStats: HealthStats = { apiLatency: "—", pgPool: "—", redisLatency: "—", workersActive: "—", outboxEvents: "—", lastReconciliation: "—" };

function HealthStrip({ degraded, stats = defaultHealthStats }: { degraded: boolean, stats?: HealthStats }) {
  const items = [
    ["API Servers", `Latency ${stats.apiLatency}`], ["PostgreSQL", `Pool ${stats.pgPool}`], ["Redis", `Latency ${stats.redisLatency}`],
    ["Workers", `${stats.workersActive} active`], ["Outbox", `${stats.outboxEvents} overdue events`], ["Reconciliation", `Last run ${stats.lastReconciliation}`],
  ];
  return <section className="health-strip">{items.map(([name, detail]) => <div className="health-unit" key={name}><div><Icon name={name === "PostgreSQL" || name === "Redis" ? "database" : name === "Workers" ? "users" : name === "Outbox" ? "box" : "heart"} /><span>{name}</span></div><strong className={degraded && name === "Redis" ? "warning-text" : ""}><i />{degraded && name === "Redis" ? "Degraded" : "Healthy"}</strong><small>{detail}</small></div>)}</section>;
}

function App() {
  const [tick, setTick] = useState(0);
  const [queued, setQueued] = useState(0);
  const [active, setActive] = useState(0);
  const [throughput, setThroughput] = useState(0);
  const [success, setSuccess] = useState(0);
  const [failed, setFailed] = useState(0);
  const [p99, setP99] = useState(0);
  const [workers, setWorkers] = useState<Worker[]>(baseWorkers);
  const [jobs, setJobs] = useState<Job[]>(baseJobs);
  const [events, setEvents] = useState<EventLog[]>(initialEvents);
  const [chart, setChart] = useState<number[]>(chartSeed);
  const [range, setRange] = useState("15m");
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const degraded = false;
  const workerOffline = false;

  const submitJob = () => {
    const job: Job = { status: "QUEUED", id: "c7e2...b19", type: "process_json", worker: "—", attempt: "1/3", age: 0, duration: "—" };
    setJobs(js => [job, ...js].slice(0, 6)); setQueued(q => q + 1); setCreateOpen(false);
    setEvents(e => [{ type: "JOB_CREATED", text: "job c7e2...b19 persisted and queued", time: new Date().toLocaleTimeString("en-US", { hour12: false }), tone: "info" }, ...e].slice(0, 7));
  };
  const refresh = () => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 700); setTick(t => t + 1); };
  const activeWorkers = useMemo(() => workerOffline ? 11 : 12, [workerOffline]);

  return <div className="app-shell">
    <Sidebar open={sidebarOpen} close={() => setSidebarOpen(false)} />
    <main className="main">
      <header className="topbar">
        <div className="crumbs"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button><span>Overview</span><Icon name="chevron" size={13} /><strong>Command Center</strong></div>
        <div className="global-search"><Icon name="search" /><input aria-label="Global search" placeholder="Search jobs, workers, events..." /><kbd>⌘ K</kbd></div>
        <div className="top-actions"><button className="environment"><i />PRODUCTION <span>⌄</span></button><span className="synced"><Icon name="refresh" />Synced 2 sec ago</span><button className="icon-btn bell"><Icon name="bell" /><i /></button><button className="avatar">AK</button></div>
      </header>
      <div className="content">
        <div className="page-header">
          <div><h1>Command Center</h1><p>Real-time overview of distributed job processing.</p></div>
          <div className="page-actions"><Button icon="refresh" onClick={refresh} loading={refreshing}>Refresh</Button><Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Create Job</Button></div>
        </div>

        {(degraded || workerOffline) && <div className={`alert-banner ${workerOffline ? "critical" : ""}`}><Icon name="alert" /><div><strong>{workerOffline ? "worker-04 unavailable" : "Redis latency elevated"}</strong><span>{workerOffline ? "18 jobs may require recovery or reassignment." : "Queue operations may be delayed. Automatic monitoring is active."}</span></div><small>{workerOffline ? "CRITICAL" : "WARNING"}</small></div>}

        <div className="live-strip"><span className="live-tag"><i />LIVE</span><strong>System telemetry updating</strong><span>Last reconciliation: 18s ago</span><span className="clock-id">CLOCK <code>sys-{String(tick).padStart(4, "0")}</code></span></div>

        <div className="metrics">
          <MetricCard label="QUEUED JOBS" value={queued} detail="— scheduled" icon="queue" />
          <MetricCard label="ACTIVE JOBS" value={active} detail={`${workers.length} workers registered`} icon="activity" />
          <MetricCard label="THROUGHPUT" value={`${throughput.toLocaleString()} jobs/min`} detail="— vs previous hour" icon="bolt" />
          <MetricCard label="SUCCESS RATE" value={`${success.toFixed(2)}%`} detail="—" icon="check" tone="success" />
          <MetricCard label="FAILED JOBS" value={failed} detail="— awaiting retry" icon="alert" tone="warning" />
          <MetricCard label="P99 LATENCY" value={`${p99} ms`} detail="—" icon="clock" />
        </div>

        <div className="primary-grid"><ThroughputChart values={chart} range={range} setRange={setRange} /><QueueVisualization queued={queued} active={active} /></div>
        <div className="secondary-grid"><WorkerFleet workers={workers} /><RecentJobs jobs={jobs} onSelect={setSelectedJob} /><LiveEvents events={events} /></div>
        <HealthStrip degraded={degraded} />
        <footer><span>JobMesh Control Plane</span><span>API v— · PostgreSQL — · Redis Streams</span><span>Region <code>—</code></span></footer>
      </div>
    </main>

    {createOpen && <div className="modal-layer" role="dialog" aria-modal="true"><div className="modal card">
      <div className="modal-head"><div><div className="section-title">Create job</div><div className="section-subtitle">Persist to PostgreSQL and publish via transactional outbox.</div></div><button className="icon-btn" onClick={() => setCreateOpen(false)}><Icon name="x" /></button></div>
      <label>JOB TYPE<input defaultValue="process_json" /></label><label>PAYLOAD<textarea defaultValue={'{\n  "source": "s3://batch/input-204.json"\n}'} /></label>
      <div className="form-grid"><label>MAX ATTEMPTS<input defaultValue="3" /></label><label>PRIORITY<select defaultValue="normal"><option>normal</option><option>high</option><option>critical</option></select></label></div>
      <div className="idempotency"><Icon name="check" /><span><strong>Idempotency enabled</strong>Duplicate submissions will resolve to the same job.</span></div>
      <div className="modal-actions"><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="primary" icon="plus" onClick={submitJob}>Create Job</Button></div>
    </div></div>}

    {selectedJob && <div className="drawer-layer" onClick={() => setSelectedJob(null)}><aside className="job-drawer" onClick={e => e.stopPropagation()}>
      <div className="drawer-head"><div><span>JOB DETAILS</span><code>{selectedJob.id}</code></div><button className="icon-btn" onClick={() => setSelectedJob(null)}><Icon name="x" /></button></div>
      <StatusBadge status={selectedJob.status} /><div className="detail-list">{[["Type", selectedJob.type], ["Worker", selectedJob.worker], ["Attempt", selectedJob.attempt], ["Created", `${selectedJob.age} sec ago`], ["Duration", selectedJob.duration], ["Delivery", "At-least-once"], ["Idempotency key", "idem_8f31c91a"]].map(([k, v]) => <div key={k}><span>{k}</span><code>{v}</code></div>)}</div>
      <div className="timeline"><strong>Execution timeline</strong><div><i />Persisted to PostgreSQL</div><div><i />Published to Redis Stream</div><div><i />Claimed by {selectedJob.worker}</div><div className={selectedJob.status === "FAILED" ? "failed-step" : ""}><i />{selectedJob.status === "FAILED" ? "Retries exhausted" : "Execution completed"}</div></div>
    </aside></div>}
  </div>;
}

export default App;
