import { useState } from "react";

type IconName =
  | "grid"
  | "jobs"
  | "workers"
  | "queue"
  | "metrics"
  | "system"
  | "search"
  | "bell"
  | "chevron"
  | "copy"
  | "retry"
  | "replay"
  | "cancel"
  | "more"
  | "download"
  | "expand"
  | "collapse"
  | "external"
  | "check";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    jobs: <><path d="M8 4h11a2 2 0 0 1 2 2v13H8z" /><path d="M3 8h5v11H3zM11 8h6M11 12h6M11 16h4" /></>,
    workers: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" /></>,
    queue: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="7" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
    metrics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    system: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    retry: <><path d="M20 6v5h-5" /><path d="M19 11a7 7 0 1 0 .1 4" /></>,
    replay: <><path d="m8 5 10 7-10 7z" /></>,
    cancel: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M4 19h16" /></>,
    expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></>,
    collapse: <><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" /></>,
    external: <><path d="M14 3h7v7M10 14 21 3" /><path d="M18 13v7H4V6h7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const navItems: { name: string; icon: IconName }[] = [
  { name: "Command Center", icon: "grid" },
  { name: "Jobs", icon: "jobs" },
  { name: "Workers", icon: "workers" },
  { name: "Queues", icon: "queue" },
  { name: "Metrics", icon: "metrics" },
  { name: "System", icon: "system" },
];

const summary = [
  ["Job ID", "JOB-8F42A1"],
  ["Job Type", "calculate_primes"],
  ["Status", "SUCCESS"],
  ["Priority", "NORMAL · 50"],
  ["Idempotency Key", "checkout-request-9b31f"],
  ["Attempt Count", "2 / 3"],
  ["Current Worker", "worker-03"],
  ["Created At", "2025-02-01 14:32:08.102"],
  ["Started At", "2025-02-01 14:32:10.004"],
  ["Completed At", "2025-02-01 14:32:17.341"],
  ["Duration", "2.27 s"],
  ["Scheduled At", "2025-02-01 14:32:08.000"],
  ["Version", "v1.7.3"],
];

const timeline = [
  { label: "REQUEST RECEIVED", time: "14:32:08.102", meta: "API · 12ms", state: "success" },
  { label: "JOB CREATED", time: "14:32:08.114", meta: "PostgreSQL · 7ms", state: "success" },
  { label: "OUTBOX CREATED", time: "14:32:08.121", meta: "TX · 17ms", state: "success" },
  { label: "EVENT PUBLISHED", time: "14:32:08.138", meta: "Outbox · 9ms", state: "success" },
  { label: "QUEUED", time: "14:32:08.147", meta: "Redis · 1.85s", state: "success" },
  { label: "CLAIMED", time: "14:32:10.002", meta: "worker-01 · 8ms", state: "success" },
  { label: "ATTEMPT #1", time: "14:32:10.010", meta: "worker-01 · 1.02s", state: "failed" },
  { label: "FAILED", time: "14:32:11.030", meta: "process exit · 4ms", state: "failed" },
  { label: "RETRY SCHEDULED", time: "14:32:11.034", meta: "backoff · 4.17s", state: "retry" },
  { label: "ATTEMPT #2", time: "14:32:15.203", meta: "worker-03 · 2.14s", state: "active" },
  { label: "SUCCESS", time: "14:32:17.341", meta: "persisted · 31ms", state: "success" },
];

const logs = [
  ["14:32:08.102", "INFO", "API", "Job creation request received"],
  ["14:32:08.121", "INFO", "POSTGRES", "Job transaction committed"],
  ["14:32:08.138", "INFO", "REDIS", "Outbox event published to Redis stream"],
  ["14:32:10.002", "INFO", "WORKER", "Job claimed by worker-01"],
  ["14:32:11.030", "WARN", "WORKER", "Worker heartbeat lost; execution ownership expired"],
  ["14:32:11.034", "INFO", "RECONCILIATION", "Stale job recovered; retry scheduled in 2.4s + jitter"],
  ["14:32:15.203", "INFO", "WORKER", "Job claimed by worker-03"],
  ["14:32:17.341", "INFO", "WORKER", "Job completed and result persisted"],
];

function SectionHeader({ title, meta, actions }: { title: string; meta?: string; actions?: React.ReactNode }) {
  return <div className="section-header"><div><div className="section-title">{title}</div>{meta && <div className="section-meta">{meta}</div>}</div>{actions && <div className="section-actions">{actions}</div>}</div>;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };
  return <button className="copy-button" onClick={copy}><Icon name={copied ? "check" : "copy"} size={13} /><span>{copied ? "Copied" : label ?? value}</span></button>;
}

export default function App() {
  const [timelineSelected, setTimelineSelected] = useState(10);
  const [attempt, setAttempt] = useState<number | null>(null);
  const [modal, setModal] = useState<"retry" | "replay" | "cancel" | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [jsonExpanded, setJsonExpanded] = useState(true);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [toast, setToast] = useState("");
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };
  const filteredLogs = logs.filter((row) => filter === "ALL" || row[2] === filter);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><strong>Job Control Plane</strong><small>DISTRIBUTED RUNTIME</small></div></div>
      <nav>
        <div className="nav-label">CONTROL PLANE</div>
        {navItems.map((item) => <button key={item.name} className={`nav-item ${item.name === "Jobs" ? "active" : ""}`} onClick={() => notify(`${item.name} selected`)}>
          <Icon name={item.icon} size={17} /><span>{item.name}</span>{item.name === "Jobs" && <span className="nav-count">184</span>}
        </button>)}
      </nav>
      <div className="sidebar-foot">
        <div className="cluster-status"><span className="status-dot pulse" /><div><strong>All systems operational</strong><small>us-east-1 · 12 workers</small></div></div>
        <div className="build">CONTROL PLANE <span>v2.8.1</span></div>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="environment"><span className="status-dot" />PRODUCTION <span className="region">US-EAST-1</span></div>
        <div className="top-actions">
          <label className="search"><Icon name="search" size={15} /><input placeholder="Search jobs, workers, events..." /><kbd>⌘ K</kbd></label>
          <button className="icon-button notification"><Icon name="bell" /><span /></button>
          <button className="profile"><span>AK</span><div><strong>Alex Kim</strong><small>Platform Engineer</small></div><Icon name="chevron" size={12} /></button>
        </div>
      </header>

      <main>
        <div className="breadcrumb"><button>Jobs</button><Icon name="chevron" size={12} /><button>Job Details</button><Icon name="chevron" size={12} /><span>JOB-8F42A1</span></div>
        <div className="page-header">
          <div className="page-heading">
            <div className="eyebrow">JOB DETAILS / EXECUTION TRACE</div>
            <div className="title-row"><h1>Job <span>JOB-8F42A1</span></h1><span className="badge success"><span className="status-dot" />SUCCESS</span></div>
            <div className="subtitle"><code>calculate_primes</code><span>Created 2m 41s ago</span><span>Completed 2m 12s ago</span></div>
          </div>
          <div className="header-controls">
            <div className="copy-group"><CopyButton value="JOB-8F42A1" label="Copy Job ID" /><CopyButton value="checkout-request-9b31f" label="Copy Idempotency Key" /></div>
            <div className="action-group">
              <button className="button" onClick={() => setModal("retry")}><Icon name="retry" />Retry Job</button>
              <button className="button" onClick={() => setModal("replay")}><Icon name="replay" />Replay Event</button>
              <button className="button danger" onClick={() => setModal("cancel")}><Icon name="cancel" />Cancel Job</button>
              <button className="button icon-only"><Icon name="more" /></button>
            </div>
          </div>
        </div>

        <div className="page-grid">
          <div className="primary-column">
            <section className="panel summary-panel">
              <SectionHeader title="Job Summary" meta="Durable job state from PostgreSQL" actions={<span className="synced"><span className="status-dot" />SYNCHRONIZED</span>} />
              <div className="summary-grid">
                {summary.map(([key, value], i) => <div className={`summary-item ${i === 0 || i === 4 ? "wide" : ""}`} key={key}>
                  <span>{key}</span>
                  <strong className={`${key === "Status" ? "success-text" : ""} ${key.includes("Worker") || key === "Idempotency Key" ? "link" : ""}`} onClick={() => key === "Idempotency Key" ? setDuplicateOpen(true) : key.includes("Worker") ? notify("Opening worker-03 details") : undefined}>{value}</strong>
                </div>)}
              </div>
            </section>

            <section className="panel timeline-panel">
              <SectionHeader title="Execution Lifecycle" meta="End-to-end delivery and execution trace" actions={<><span className="legend success-key">Success</span><span className="legend fail-key">Failed</span><span className="legend retry-key">Retry</span></>} />
              <div className="timeline-scroll"><div className="timeline">
                {timeline.map((stage, i) => <button className={`timeline-node ${stage.state} ${timelineSelected === i ? "selected" : ""}`} key={stage.label} onClick={() => setTimelineSelected(i)}>
                  <span className="node-index">{stage.state === "success" ? <Icon name="check" size={11} /> : i + 1}</span>
                  <span className="node-label">{stage.label}</span><span className="node-time">{stage.time}</span><span className="node-meta">{stage.meta}</span>
                </button>)}
              </div></div>
              <div className="timeline-detail">
                <div><span>SELECTED EVENT</span><strong>{timeline[timelineSelected].label}</strong></div>
                <div><span>EVENT ID</span><code>evt_01JGF8P{timelineSelected}A4K9</code></div>
                <div><span>PROCESS</span><code>{timeline[timelineSelected].meta.split(" · ")[0]}</code></div>
                <div><span>STATE TRANSITION</span><code>RUNNING → {timeline[timelineSelected].state.toUpperCase()}</code></div>
                <button>View raw metadata <Icon name="external" size={12} /></button>
              </div>
            </section>

            <section className="panel">
              <SectionHeader title="Execution Attempts" meta="2 attempts · 1 recovered failure" />
              <div className="table-wrap"><table>
                <thead><tr><th>ATTEMPT</th><th>WORKER</th><th>STARTED</th><th>COMPLETED</th><th>DURATION</th><th>STATUS</th><th>ERROR</th><th></th></tr></thead>
                <tbody>
                  <tr onClick={() => setAttempt(attempt === 1 ? null : 1)} className={attempt === 1 ? "row-open" : ""}><td><strong>#1</strong></td><td><button className="table-link" onClick={(e) => { e.stopPropagation(); notify("Opening worker-01 details"); }}>worker-01</button></td><td>14:32:10.010</td><td>14:32:11.030</td><td>1.02s</td><td><span className="badge failed">FAILED</span></td><td className="truncate">Worker process terminated unexpectedly</td><td><Icon name="chevron" size={13} /></td></tr>
                  {attempt === 1 && <tr className="attempt-detail"><td colSpan={8}><div><span>EXIT CODE</span><strong>137 / SIGKILL</strong></div><div><span>HEARTBEAT</span><strong>Lost at 14:32:10.982</strong></div><div><span>OWNERSHIP</span><strong>Released by reconciliation</strong></div><button>Open full attempt trace <Icon name="external" size={12} /></button></td></tr>}
                  <tr onClick={() => setAttempt(attempt === 2 ? null : 2)} className={attempt === 2 ? "row-open" : ""}><td><strong>#2</strong></td><td><button className="table-link" onClick={(e) => { e.stopPropagation(); notify("Opening worker-03 details"); }}>worker-03</button></td><td>14:32:15.203</td><td>14:32:17.341</td><td>2.14s</td><td><span className="badge success">SUCCESS</span></td><td className="muted">—</td><td><Icon name="chevron" size={13} /></td></tr>
                  {attempt === 2 && <tr className="attempt-detail"><td colSpan={8}><div><span>PROCESS</span><strong>pid 4831</strong></div><div><span>RUNTIME</span><strong>Python 3.12.1</strong></div><div><span>RESULT</span><strong>Persisted atomically</strong></div><button>Open full attempt trace <Icon name="external" size={12} /></button></td></tr>}
                </tbody>
              </table></div>
            </section>

            <div className="split-grid result-error">
              <section className="panel">
                <SectionHeader title="Result" meta="application/json · 68 bytes" actions={<div className="compact-actions"><CopyButton value={'{"limit":100000,"count":9592,"completed":true}'} label="Copy JSON" /><button onClick={() => setJsonExpanded(true)}><Icon name="expand" size={13} />Expand</button><button onClick={() => setJsonExpanded(false)}><Icon name="collapse" size={13} />Collapse</button><button><Icon name="download" size={13} /></button></div>} />
                <pre className="json-view"><code>{jsonExpanded ? <><span>{"{"}</span>{"\n  "}<b>"limit"</b><span>: </span><em>100000</em><span>,</span>{"\n  "}<b>"count"</b><span>: </span><em>9592</em><span>,</span>{"\n  "}<b>"completed"</b><span>: </span><i>true</i>{"\n"}<span>{"}"}</span></> : <><span>{"{"}</span> <b>3 properties</b> <span>{"}"}</span></>}</code></pre>
              </section>
              <section className="panel failure-panel">
                <SectionHeader title="Failure History" meta="1 recovered failure" actions={<span className="badge failed">RESOLVED</span>} />
                <div className="failure-message"><span>ATTEMPT #1 · WORKER-01 · 14:32:11.030</span><strong>Worker process terminated unexpectedly</strong><code>WorkerLostError: heartbeat timeout after 1000ms{"\n"}  at claim.monitor (worker.ts:184:11)</code></div>
                <div className="decision-grid"><div><span>RETRY DECISION</span><strong className="amber">RETRYABLE</strong></div><div><span>BACKOFF</span><strong>2.4s + jitter</strong></div><div><span>NEXT EXECUTION</span><strong>14:32:15</strong></div></div>
              </section>
            </div>

            <div className="triple-grid">
              <section className="panel compact-panel">
                <SectionHeader title="Idempotency" meta="Request deduplication" />
                <button className="identity-key" onClick={() => setDuplicateOpen(!duplicateOpen)}><code>checkout-request-9b31f</code><Icon name="chevron" size={13} /></button>
                <dl><div><dt>State</dt><dd className="success-text">DEDUPLICATED / ORIGINAL</dd></div><div><dt>First Request</dt><dd>14:32:08.102</dd></div><div><dt>Duplicate Requests</dt><dd>3</dd></div><div><dt>Resolved Job</dt><dd className="link">JOB-8F42A1</dd></div></dl>
                {duplicateOpen && <div className="inline-note">3 duplicate requests safely resolved to the original job. No additional execution was created.</div>}
              </section>
              <section className="panel compact-panel">
                <SectionHeader title="Redis Stream" meta="Asynchronous delivery" />
                <dl><div><dt>Stream</dt><dd>job-events</dd></div><div><dt>Consumer Group</dt><dd>job-workers</dd></div><div><dt>Consumer</dt><dd className="link">worker-03</dd></div><div><dt>Message ID</dt><dd><button className="table-link" onClick={() => notify("Opening Redis message 1738429192837-0")}>1738429192837-0</button></dd></div><div><dt>Delivery Count</dt><dd>2</dd></div><div><dt>Acknowledged</dt><dd className="success-text">YES</dd></div><div><dt>Pending</dt><dd>NO</dd></div></dl>
              </section>
              <section className="panel compact-panel">
                <SectionHeader title="PostgreSQL State" meta="Durable source of truth" />
                <div className="db-state"><span className="status-dot" /><strong>CONSISTENT</strong></div>
                <dl><div><dt>Row Version</dt><dd>4</dd></div><div><dt>Locked By</dt><dd>—</dd></div><div><dt>Lock State</dt><dd>RELEASED</dd></div><div><dt>Last Updated</dt><dd>14:32:17.341</dd></div><div><dt>Outbox State</dt><dd className="success-text">PUBLISHED</dd></div></dl>
              </section>
            </div>

            <section className="panel performance-panel">
              <SectionHeader title="Performance Breakdown" meta="Total lifecycle latency · 2.27 s" />
              <div className="timing-bar"><span className="queue-wait" title="Queue Wait" /><span className="claim" title="Claim" /><span className="execution" title="Execution" /><span className="persistence" title="Persistence" /></div>
              <div className="timing-labels"><div><span className="key blue" />Queue Wait<strong>420 ms</strong></div><div><span className="key purple" />Claim<strong>18 ms</strong></div><div><span className="key green" />Execution<strong>1.82 s</strong></div><div><span className="key cyan" />Persistence<strong>31 ms</strong></div><div className="total">Total<strong>2.27 s</strong></div></div>
            </section>

            <section className="panel recovery-panel">
              <SectionHeader title="Recovery Events" meta="Automated crash recovery and stale-job reconciliation" actions={<span className="badge success">RECOVERED</span>} />
              <div className="recovery-flow">
                {["Worker crash detected", "Recovered by reconciliation", "Retry scheduled", "Job successfully re-executed"].map((item, i) => <div key={item}><span className={i === 0 ? "failure-node" : "success-node"}>{i === 0 ? "!" : <Icon name="check" size={11} />}</span><strong>{item}</strong><small>{["14:32:11.030", "14:32:11.034", "14:32:11.038", "14:32:17.341"][i]}</small></div>)}
              </div>
            </section>

            <section className="panel event-log">
              <SectionHeader title="Event Log" meta="Structured lifecycle events" actions={<div className="live"><span className="status-dot pulse" />LIVE</div>} />
              <div className="log-filters">{["ALL", "API", "POSTGRES", "REDIS", "WORKER", "RECONCILIATION"].map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item === "ALL" ? "All" : item[0] + item.slice(1).toLowerCase()}</button>)}</div>
              <div className="logs">{filteredLogs.map((row, i) => <div className="log-row" key={i}><time>{row[0]}</time><span className={`level ${row[1].toLowerCase()}`}>{row[1]}</span><span className="source">{row[2]}</span><p>{row[3]}</p><button><Icon name="more" size={14} /></button></div>)}</div>
            </section>
          </div>

          <aside className="diagnostics">
            <div className="diagnostic-title"><span>JOB DIAGNOSTICS</span><button><Icon name="more" /></button></div>
            <div className="health-block"><span>JOB HEALTH</span><strong><span className="status-dot pulse" />Healthy</strong><small>No active incidents</small></div>
            <div className="diagnostic-list">
              <div><span>DELIVERY SEMANTICS</span><strong>At-least-once</strong><small>Duplicate delivery possible</small></div>
              <div><span>EXECUTION</span><strong>Idempotent</strong><small>Key verified</small></div>
              <div><span>DATABASE</span><strong>PostgreSQL</strong><small>Durable source of truth</small></div>
              <div><span>QUEUE</span><strong>Redis Streams</strong><small>Async event delivery</small></div>
              <div><span>WORKER</span><button onClick={() => notify("Opening worker-03 details")}>worker-03 <Icon name="external" size={11} /></button><small>Healthy · last seen 3s ago</small></div>
              <div><span>RETRY POLICY</span><strong>Exponential Backoff</strong><small>Full jitter · max 3 attempts</small></div>
              <div><span>RECOVERY</span><strong className="success-text">Reconciliation Enabled</strong><small>Scan interval · 5s</small></div>
            </div>
            <div className="architecture-note"><span>DELIVERY GUARANTEE</span><p>Transactional outbox ensures events are published after the job transaction commits. Workers may receive duplicates; idempotency keeps execution safe.</p><button>View architecture <Icon name="external" size={12} /></button></div>
          </aside>
        </div>
      </main>
    </div>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className={`modal-icon ${modal === "cancel" ? "danger" : "amber"}`}><Icon name={modal === "retry" ? "retry" : modal === "replay" ? "replay" : "cancel"} size={20} /></div>
      <h2>{modal === "retry" ? "Retry this job?" : modal === "replay" ? "Replay this event?" : "Cancel this job?"}</h2>
      <p>{modal === "retry" ? "A new execution attempt will be scheduled using the current job payload and retry policy." : modal === "replay" ? "Replaying may cause another delivery under at-least-once semantics. The idempotency key will be preserved." : "The job is already complete. Cancellation will be recorded but cannot reverse completed side effects."}</p>
      <div className="modal-facts"><span>JOB</span><code>JOB-8F42A1</code><span>CURRENT STATE</span><strong>SUCCESS</strong></div>
      <div className="modal-actions"><button className="button" onClick={() => setModal(null)}>Keep unchanged</button><button className={`button primary ${modal === "cancel" ? "destructive" : ""}`} onClick={() => { notify(`${modal[0].toUpperCase() + modal.slice(1)} request submitted`); setModal(null); }}>Confirm {modal}</button></div>
    </div></div>}
    {toast && <div className="toast"><Icon name="check" size={14} />{toast}</div>}
  </div>;
}
