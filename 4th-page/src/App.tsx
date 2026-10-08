import { useMemo, useState } from "react";

type WorkerStatus = "HEALTHY" | "DEGRADED" | "DRAINING" | "OFFLINE";

type Worker = {
  status: WorkerStatus;
  id: string;
  host: string;
  version: string;
  jobs: string;
  active: string;
  throughput: string;
  cpu: number;
  memory: number;
  heartbeat: string;
  uptime: string;
};

const workers: Worker[] = [
  { status: "HEALTHY", id: "worker-01", host: "ecs-task-7f82a", version: "v1.4.2", jobs: "18,492", active: "job_8f21c4", throughput: "24.7", cpu: 42, memory: 318, heartbeat: "2s ago", uptime: "4h 18m" },
  { status: "HEALTHY", id: "worker-02", host: "ecs-task-91ab2", version: "v1.4.2", jobs: "17,921", active: "job_71cd9a", throughput: "23.9", cpu: 38, memory: 301, heartbeat: "1s ago", uptime: "4h 16m" },
  { status: "DEGRADED", id: "worker-03", host: "ecs-task-a12c9", version: "v1.4.1", jobs: "15,204", active: "job_42fa10", throughput: "11.2", cpu: 87, memory: 512, heartbeat: "18s ago", uptime: "7h 02m" },
  { status: "HEALTHY", id: "worker-04", host: "ecs-task-cc48f", version: "v1.4.2", jobs: "16,882", active: "job_a921e8", throughput: "21.4", cpu: 51, memory: 344, heartbeat: "3s ago", uptime: "4h 15m" },
  { status: "HEALTHY", id: "worker-05", host: "ecs-task-401bd", version: "v1.4.2", jobs: "19,003", active: "job_39bc72", throughput: "22.8", cpu: 46, memory: 329, heartbeat: "2s ago", uptime: "9h 41m" },
  { status: "HEALTHY", id: "worker-06", host: "ecs-task-da816", version: "v1.4.2", jobs: "14,721", active: "job_f4872c", throughput: "20.1", cpu: 35, memory: 294, heartbeat: "1s ago", uptime: "3h 52m" },
  { status: "HEALTHY", id: "worker-07", host: "ecs-task-972ae", version: "v1.4.2", jobs: "13,930", active: "job_0d8e13", throughput: "18.6", cpu: 33, memory: 286, heartbeat: "4s ago", uptime: "3h 48m" },
  { status: "HEALTHY", id: "worker-08", host: "ecs-task-b62f1", version: "v1.4.2", jobs: "11,774", active: "job_e9027d", throughput: "20.0", cpu: 41, memory: 310, heartbeat: "2s ago", uptime: "2h 11m" },
];

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    jobs: <><path d="M8 6h12M8 12h12M8 18h12" /><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" /></>,
    workers: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" /></>,
    queue: <><path d="M5 7h14M5 12h14M5 17h9" /><path d="m17 15 3 2-3 2" /></>,
    metrics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    system: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.4.3.6.7.6 1.1v.3h1v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.4-2.6L20 9M4 15l2.5 2.6A7 7 0 0 0 17.9 15" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Status({ value }: { value: WorkerStatus | "ENABLED" }) {
  return <span className={`status status-${value.toLowerCase()}`}><i />{value}</span>;
}

function Meter({ value, warning = false }: { value: number; warning?: boolean }) {
  return <div className="meter"><span className={warning ? "warning" : ""} style={{ width: `${value}%` }} /></div>;
}

function App() {
  const [selectedId, setSelectedId] = useState("worker-01");
  const [search, setSearch] = useState("");
  const [updatedAt, setUpdatedAt] = useState("18:42:17 UTC");
  const [dialog, setDialog] = useState<"drain" | "restart" | null>(null);
  const [desired, setDesired] = useState(8);
  const selected = workers.find((worker) => worker.id === selectedId) ?? workers[0];
  const visibleWorkers = useMemo(() => workers.filter((worker) => `${worker.id} ${worker.host} ${worker.status}`.toLowerCase().includes(search.toLowerCase())), [search]);

  function refresh() {
    setUpdatedAt(new Date().toISOString().slice(11, 19) + " UTC");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><span /><span /><span /><span /></div><div><b>PARALLEL</b><small>CONTROL PLANE</small></div></div>
        <nav>
          <div className="nav-label">OPERATIONS</div>
          {[
            ["grid", "Command Center"],
            ["jobs", "Jobs"],
            ["workers", "Workers"],
            ["queue", "Queues"],
            ["metrics", "Metrics"],
            ["system", "System"],
          ].map(([icon, label]) => <button key={label} className={`nav-item ${label === "Workers" ? "active" : ""}`}><Icon name={icon} /><span>{label}</span>{label === "Jobs" && <em>24</em>}</button>)}
        </nav>
        <div className="system-card">
          <div className="system-card-head"><span><i />SYSTEM STATUS</span><b>HEALTHY</b></div>
          <div className="system-row"><span>API</span><span>3/3</span></div>
          <div className="segment-bar"><i /><i /><i /></div>
          <div className="system-row"><span>WORKERS</span><span>8/8</span></div>
          <div className="segment-bar workers"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="region">REGION <b>us-east-1</b></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="title-block"><div className="eyebrow">COMPUTE / FLEET</div><div className="page-title" role="heading" aria-level={1}>Workers</div><div className="subtitle">Distributed worker fleet and execution ownership</div></div>
          <div className="header-tools">
            <label className="search"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workers..." /><kbd>⌘ K</kbd></label>
            <button className="env-button"><i />Production <span>⌄</span></button>
            <button className="icon-button" aria-label="Refresh data" onClick={refresh}><Icon name="refresh" /></button>
            <div className="updated"><span>LAST UPDATED</span><b>{updatedAt}</b></div>
          </div>
        </header>

        <div className="content">
          <div className="kpi-grid">
            <Kpi label="ACTIVE WORKERS" value="8" note={<><span className="positive-dot" />8 healthy</>} spark={[11,12,11,13,13,13,14,14]} />
            <Kpi label="JOBS / SEC" value="142.7" note={<span className="positive">↗ 12.4%</span>} spark={[6,9,8,12,10,14,13,17]} />
            <Kpi label="AVG PROCESSING TIME" value="184" unit="ms" note={<span>P95 <b>421 ms</b></span>} spark={[13,10,12,8,9,7,8,6]} />
            <Kpi label="FAILED JOBS" value="3" note={<span><b className="danger">0.8%</b> failure rate</span>} spark={[15,15,14,15,12,14,15,13]} danger />
          </div>

          <div className="main-grid">
            <div className="left-column">
              <section className="panel fleet-panel">
                <div className="panel-head">
                  <div><div className="panel-title" role="heading" aria-level={2}>Worker Fleet</div><p>8 instances across 3 availability zones</p></div>
                  <div className="fleet-summary"><span><i className="healthy-dot" />7 healthy</span><span><i className="degraded-dot" />1 degraded</span></div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>STATUS</th><th>WORKER ID</th><th>HOST / CONTAINER</th><th>VERSION</th><th>JOBS PROCESSED</th><th>ACTIVE JOB</th><th>THROUGHPUT</th><th>CPU</th><th>MEMORY</th><th>LAST HEARTBEAT</th><th>UPTIME</th><th /></tr></thead>
                    <tbody>
                      {visibleWorkers.map((worker) => (
                        <tr key={worker.id} className={`${selected.id === worker.id ? "selected" : ""} ${worker.status === "DEGRADED" ? "degraded-row" : ""}`} onClick={() => setSelectedId(worker.id)}>
                          <td><Status value={worker.status} /></td>
                          <td><strong>{worker.id}</strong></td>
                          <td>{worker.host}</td>
                          <td>{worker.version}</td>
                          <td>{worker.jobs}</td>
                          <td><span className="job-link">{worker.active}…</span></td>
                          <td>{worker.throughput} <small>jobs/s</small></td>
                          <td><div className="cell-meter"><span>{worker.cpu}%</span><Meter value={worker.cpu} warning={worker.cpu > 80} /></div></td>
                          <td>{worker.memory} <small>MB</small></td>
                          <td className={worker.status === "DEGRADED" ? "warn-text" : ""}>{worker.heartbeat}</td>
                          <td>{worker.uptime}</td>
                          <td><Icon name="chevron" size={14} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer"><span>Showing {visibleWorkers.length} of 8 workers</span><span>Fleet throughput <b>142.7 jobs/s</b></span></div>
              </section>

              <div className="lower-grid">
                <ActivityChart />
                <Scaling desired={desired} onDown={() => setDesired(Math.max(2, desired - 1))} onUp={() => setDesired(Math.min(20, desired + 1))} />
                <EventFeed />
              </div>
            </div>

            <WorkerDetail worker={selected} onAction={setDialog} />
          </div>
        </div>
      </section>

      {dialog && <ConfirmDialog action={dialog} worker={selected.id} onClose={() => setDialog(null)} />}
    </main>
  );
}

function Kpi({ label, value, unit, note, spark, danger = false }: { label: string; value: string; unit?: string; note: React.ReactNode; spark: number[]; danger?: boolean }) {
  return <div className="kpi-card"><div><div className="kpi-label">{label}</div><div className="kpi-value">{value}{unit && <small>{unit}</small>}</div><div className="kpi-note">{note}</div></div><svg className={`sparkline ${danger ? "spark-danger" : ""}`} viewBox="0 0 98 34" preserveAspectRatio="none"><polyline points={spark.map((point, index) => `${index * 14},${point}`).join(" ")} /></svg></div>;
}

function ActivityChart() {
  return <section className="panel activity-panel">
    <div className="panel-head compact"><div><div className="panel-title" role="heading" aria-level={2}>Fleet Activity</div><p>Aggregate throughput · last 30 minutes</p></div><div className="chart-value"><b>142.7</b><span> jobs/s</span></div></div>
    <div className="chart">
      <div className="y-labels"><span>180</span><span>120</span><span>60</span><span>0</span></div>
      <svg viewBox="0 0 640 145" preserveAspectRatio="none">
        <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".22" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
        <g className="grid-lines"><line x1="0" y1="8" x2="640" y2="8" /><line x1="0" y1="50" x2="640" y2="50" /><line x1="0" y1="92" x2="640" y2="92" /><line x1="0" y1="134" x2="640" y2="134" /></g>
        <path className="chart-area" d="M0 104 L20 98 L40 101 L60 91 L80 96 L100 84 L120 88 L140 76 L160 80 L180 68 L200 73 L220 62 L240 64 L260 57 L280 63 L300 53 L320 55 L340 49 L360 56 L380 43 L400 45 L420 38 L440 47 L460 41 L480 44 L500 34 L520 39 L540 31 L560 37 L580 28 L600 33 L620 26 L640 29 L640 134 L0 134 Z" />
        <path className="chart-line" d="M0 104 L20 98 L40 101 L60 91 L80 96 L100 84 L120 88 L140 76 L160 80 L180 68 L200 73 L220 62 L240 64 L260 57 L280 63 L300 53 L320 55 L340 49 L360 56 L380 43 L400 45 L420 38 L440 47 L460 41 L480 44 L500 34 L520 39 L540 31 L560 37 L580 28 L600 33 L620 26 L640 29" />
        <g className="scale-event"><line x1="205" y1="8" x2="205" y2="134" /><circle cx="205" cy="70" r="3" /></g><g className="scale-event"><line x1="504" y1="8" x2="504" y2="134" /><circle cx="504" cy="34" r="3" /></g>
      </svg>
      <div className="x-labels"><span>-30m</span><span>-20m</span><span>-10m</span><span>now</span></div>
    </div>
    <div className="chart-legend"><span><i className="line-key" />THROUGHPUT</span><span><i className="event-key" />SCALING EVENT</span></div>
  </section>;
}

function Scaling({ desired, onDown, onUp }: { desired: number; onDown: () => void; onUp: () => void }) {
  return <section className="panel scaling-panel"><div className="panel-head compact"><div><div className="panel-title" role="heading" aria-level={2}>Worker Scaling</div><p>ECS service capacity</p></div><Status value="ENABLED" /></div>
    <div className="scale-numbers"><div><span>DESIRED</span><b>{desired}</b></div><div><span>RUNNING</span><b>8</b></div><div><span>MINIMUM</span><b>2</b></div><div><span>MAXIMUM</span><b>20</b></div></div>
    <div className="scale-range"><span style={{ width: `${(desired / 20) * 100}%` }} /><i style={{ left: `${(desired / 20) * 100}%` }} /></div>
    <div className="scale-actions"><button onClick={onDown}>−&nbsp; Scale Down</button><button onClick={onUp}>＋&nbsp; Scale Up</button></div>
    <div className="scaling-note"><i />Autoscaling target: <b>70% CPU utilization</b></div>
  </section>;
}

function EventFeed() {
  const events = [
    ["18:41:52", "worker-08", "joined fleet", "join"],
    ["18:40:11", "worker-03", "heartbeat delayed", "warn"],
    ["18:36:04", "worker-05", "completed 1,000 jobs", "ok"],
    ["18:31:48", "worker-02", "restarted", "neutral"],
    ["18:29:02", "worker-07", "scaled out", "join"],
  ];
  return <section className="panel events-panel"><div className="panel-head compact"><div><div className="panel-title" role="heading" aria-level={2}>Recent Worker Events</div><p>Fleet lifecycle stream</p></div><button className="text-button">VIEW ALL</button></div>
    <div className="event-list">{events.map(([time, id, text, type]) => <div className="event" key={time}><i className={type} /><span className="event-time">{time}</span><b>{id}</b><span>{text}</span></div>)}</div>
  </section>;
}

function WorkerDetail({ worker, onAction }: { worker: Worker; onAction: (action: "drain" | "restart") => void }) {
  return <aside className="detail-panel panel">
    <div className="detail-head"><div><div className="detail-id">{worker.id}</div><div className="detail-host">{worker.host} · {worker.version}</div></div><Status value={worker.status} /></div>
    <div className="detail-actions"><button onClick={() => onAction("drain")}>Drain Worker</button><button onClick={() => onAction("restart")}>Restart</button><button aria-label="View worker logs"><Icon name="external" size={14} /></button></div>
    <div className="detail-section">
      <div className="section-label">INSTANCE</div>
      <div className="detail-grid">
        <Info label="CONTAINER ID" value={`7f82a9c1d42e`} /><Info label="HOST" value="10.24.8.117" /><Info label="STARTED AT" value="2025-06-18 14:24:02" /><Info label="UPTIME" value={worker.uptime} /><Info label="JOBS COMPLETED" value={worker.jobs} /><Info label="JOBS FAILED" value={worker.id === "worker-03" ? "12" : "3"} /><Info label="RETRY COUNT" value="21" /><Info label="CONCURRENCY" value="4 / 4" />
      </div>
    </div>
    <div className="detail-section">
      <div className="section-label">RESOURCE UTILIZATION</div>
      <Resource label="CPU" value={`${worker.cpu}%`} meter={worker.cpu} warning={worker.cpu > 80} />
      <Resource label="MEMORY" value={`${worker.memory} / 1024 MB`} meter={(worker.memory / 1024) * 100} />
      <Resource label="EVENT LOOP" value="18%" meter={18} />
      <Resource label="POSTGRESQL" value="7 / 20" meter={35} />
      <Resource label="REDIS OPS" value="842 / s" meter={56} />
    </div>
    <div className="detail-section execution">
      <div className="section-top"><div className="section-label">CURRENT EXECUTION</div><span className="live"><i />LIVE</span></div>
      <div className="execution-card">
        <div className="execution-id">{worker.active}… <Icon name="external" size={13} /></div>
        <div className="execution-grid"><Info label="TYPE" value="cpu_intensive" /><Info label="ATTEMPT" value="2 / 3" /><Info label="STARTED" value="18:42:13" /><Info label="RUNTIME" value="3.82s" /></div>
        <div className="progress-head"><span>EXECUTION PROGRESS</span><b>64%</b></div><div className="execution-progress"><span /></div>
        <div className="lease-inline"><span>WORKER LEASE</span><Status value="HEALTHY" /></div>
      </div>
    </div>
    <div className="detail-section heartbeat">
      <div className="section-label">HEARTBEAT / LEASE</div>
      <div className="heartbeat-visual">
        <div className="pulse-ring"><i /></div>
        <div className="pulse-line"><span /><span /><span /><span /><span /><span /></div>
        <Status value={worker.status === "DEGRADED" ? "DEGRADED" : "HEALTHY"} />
      </div>
      <div className="lease-stats"><div><span>LAST HEARTBEAT</span><b>{worker.heartbeat}</b></div><div><span>LEASE TIMEOUT</span><b>60s</b></div><div><span>NEXT REFRESH</span><b>in 3s</b></div></div>
      <p className="lease-note">Lease continuously refreshed while execution ownership is active.</p>
    </div>
    <div className="detail-footer"><button>View Logs <Icon name="external" size={13} /></button><button>View Jobs <Icon name="external" size={13} /></button></div>
  </aside>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info"><span>{label}</span><b>{value}</b></div>;
}

function Resource({ label, value, meter, warning = false }: { label: string; value: string; meter: number; warning?: boolean }) {
  return <div className="resource"><div><span>{label}</span><b className={warning ? "warn-text" : ""}>{value}</b></div><Meter value={meter} warning={warning} /></div>;
}

function ConfirmDialog({ action, worker, onClose }: { action: "drain" | "restart"; worker: string; onClose: () => void }) {
  return <div className="dialog-backdrop" onMouseDown={onClose}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="dialog-head"><div id="dialog-title">{action === "drain" ? "Drain worker" : "Restart worker"}</div><button onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
    <p>{action === "drain" ? `Stop assigning new jobs to ${worker} and wait for its current executions to complete?` : `Restart ${worker}? Active execution ownership will be released and jobs may be retried.`}</p>
    <div className="dialog-callout"><span>Target</span><b>{worker}</b><span>Action</span><b>{action.toUpperCase()}</b></div>
    <div className="dialog-buttons"><button onClick={onClose}>Cancel</button><button className="confirm" onClick={onClose}>Confirm {action}</button></div>
  </div></div>;
}

export default App;
