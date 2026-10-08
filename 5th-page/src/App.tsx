import { useState } from "react";

type IconName = "grid" | "jobs" | "workers" | "queue" | "metrics" | "system" | "search" | "bell" | "chevron" | "refresh" | "pause" | "play" | "drain" | "more" | "check" | "database";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    jobs: <><path d="M8 4h11a2 2 0 0 1 2 2v13H8z" /><path d="M3 8h5v11H3zM11 8h6M11 12h6M11 16h4" /></>,
    workers: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6" /></>,
    queue: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="7" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
    metrics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    system: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34A1.7 1.7 0 0 0 14 20.93V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    refresh: <><path d="M20 6v5h-5" /><path d="M19 11a7 7 0 1 0 .1 4" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <path d="m8 5 11 7-11 7z" />,
    drain: <><path d="M4 5h16M7 10h10M10 15h4M12 15v5" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const navItems: { name: string; icon: IconName; count?: string }[] = [
  { name: "Command Center", icon: "grid" }, { name: "Jobs", icon: "jobs", count: "184" },
  { name: "Workers", icon: "workers", count: "8" }, { name: "Queues", icon: "queue", count: "1" },
  { name: "Metrics", icon: "metrics" }, { name: "System", icon: "system" },
];

const consumers = [
  ["consumer-01", "worker-01", "2", "18,492", "18,490", "2s ago", "1.2s", "HEALTHY"],
  ["consumer-02", "worker-02", "0", "17,921", "17,921", "1s ago", "0.8s", "HEALTHY"],
  ["consumer-03", "worker-03", "14", "15,204", "15,190", "19s ago", "18.7s", "WARNING"],
  ["consumer-04", "worker-04", "1", "16,882", "16,881", "3s ago", "2.1s", "HEALTHY"],
];

const pending = [
  ["1728472912-0", "job_8f21c4", "worker-03", "2", "18.7s", "PENDING"],
  ["1728472918-0", "job_71cd92", "worker-01", "1", "3.2s", "PENDING"],
  ["1728472921-0", "job_b901e7", "worker-03", "1", "14.1s", "PENDING"],
];

const events = [
  ["18:47:12.084", "JOB_CREATED", "api-02", "job_8f21c4"],
  ["18:47:11.912", "ACK", "worker-02", "job_f1a920"],
  ["18:47:11.604", "JOB_RETRY", "scheduler-01", "job_71cd92"],
  ["18:47:10.441", "CONSUMER_JOINED", "worker-08", "—"],
  ["18:47:09.337", "PENDING_RECLAIMED", "worker-03", "job_b901e7"],
];

const throughput = [30,38,35,42,48,44,54,51,58,63,57,68,72,64,77,81,75,88,84,92,87,95,98,91,104,108,112,106,118,121];
const latency = [38,34,42,45,39,52,48,62,58,65,61,74,68,81,76,72,89,84,91,106,94,88,102,115,97,124,116,109,132,121];

function MiniChart({ values, color = "#6ca7ff", fill = true }: { values: number[]; color?: string; fill?: boolean }) {
  const max = Math.max(...values);
  const points = values.map((value, i) => `${(i / (values.length - 1)) * 300},${82 - (value / max) * 66}`).join(" ");
  return <svg className="mini-chart" viewBox="0 0 300 88" preserveAspectRatio="none" role="img" aria-label="Thirty minute time series">
    <line x1="0" y1="17" x2="300" y2="17" className="chart-grid" /><line x1="0" y1="49" x2="300" y2="49" className="chart-grid" /><line x1="0" y1="81" x2="300" y2="81" className="chart-grid" />
    {fill && <polygon points={`0,88 ${points} 300,88`} fill={`${color}16`} />}
    <polyline points={points} fill="none" stroke={color} strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
  </svg>;
}

function SectionHeader({ title, meta, actions }: { title: string; meta?: string; actions?: React.ReactNode }) {
  return <div className="section-header"><div><div className="section-title">{title}</div>{meta && <div className="section-meta">{meta}</div>}</div>{actions && <div className="section-actions">{actions}</div>}</div>;
}

export default function App() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [modal, setModal] = useState<"pause" | "resume" | "drain" | null>(null);
  const [toast, setToast] = useState("");
  const [eventFilter, setEventFilter] = useState("ALL");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 1600); };

  return <div className="app-shell queue-page">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><strong>Job Control Plane</strong><small>DISTRIBUTED RUNTIME</small></div></div>
      <nav>
        <div className="nav-label">CONTROL PLANE</div>
        {navItems.map((item) => <button key={item.name} className={`nav-item ${item.name === "Queues" ? "active" : ""}`}>
          <Icon name={item.icon} size={17} /><span>{item.name}</span>{item.count && <span className="nav-count">{item.count}</span>}
        </button>)}
      </nav>
      <div className="sidebar-foot queue-status">
        <div><span>SYSTEM STATUS</span><strong><i className="status-dot" />HEALTHY</strong></div>
        <div><span>REDIS</span><strong><i className="status-dot" />CONNECTED</strong></div>
        <div><span>POSTGRESQL</span><strong><i className="status-dot" />HEALTHY</strong></div>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="environment"><span className="status-dot" />PRODUCTION <span className="region">US-EAST-1</span></div>
        <div className="top-actions">
          <label className="search"><Icon name="search" size={15} /><input placeholder="Search streams, events, consumers..." /><kbd>⌘ K</kbd></label>
          <button className="icon-button notification"><Icon name="bell" /><span /></button>
          <button className="profile"><span>AK</span><div><strong>Alex Kim</strong><small>Platform Engineer</small></div><Icon name="chevron" size={12} /></button>
        </div>
      </header>

      <main>
        <div className="breadcrumb"><button>Control Plane</button><Icon name="chevron" size={12} /><span>Queues</span></div>
        <div className="queue-header">
          <div><div className="eyebrow">EVENT DELIVERY INFRASTRUCTURE</div><h1>Queues</h1><p>Redis Streams <i /> Event Delivery <i /> Consumer Groups</p></div>
          <div className="queue-actions">
            <span className="last-updated">LAST UPDATED <strong>2s ago</strong></span>
            <button className={`auto-toggle ${autoRefresh ? "on" : ""}`} onClick={() => setAutoRefresh(!autoRefresh)}><span /><b>AUTO-REFRESH</b><strong>{autoRefresh ? "ON" : "OFF"}</strong></button>
            <button className="button" onClick={() => notify("Queue telemetry refreshed")}><Icon name="refresh" size={14} />Refresh</button>
            <button className="button" onClick={() => setModal("pause")}><Icon name="pause" size={14} />Pause Queue</button>
            <button className="button"><Icon name="more" /></button>
          </div>
        </div>

        <div className="queue-kpis">
          {[
            ["QUEUE DEPTH", "1,284", "+84 in last 5 min", "blue", "queue"],
            ["PROCESSING RATE", "142.7", "jobs/s", "+11.8%", "green"],
            ["PENDING MESSAGES", "17", "3 consumers", "warning", "pending"],
            ["OLDEST PENDING", "8.4s", "Within threshold", "green", "oldest"],
          ].map((kpi) => <section className={`kpi-card ${kpi[3]}`} key={kpi[0]}>
            <div className="kpi-top"><span>{kpi[0]}</span><i className="status-dot" /></div>
            <div className="kpi-value">{kpi[1]} {kpi[2] === "jobs/s" && <small>{kpi[2]}</small>}</div>
            <div className="kpi-foot"><span>{kpi[2] === "jobs/s" ? kpi[3] : kpi[2]}</span><div className={`spark ${kpi[4]}`}>{[4,7,5,9,8,12,10,14,13,17,16,19].map((n,i) => <i key={i} style={{height:`${n}px`}} />)}</div></div>
          </section>)}
        </div>

        <section className="panel topology-panel">
          <SectionHeader title="Queue Topology" meta="Producer → durable state → asynchronous delivery → horizontal consumers" actions={<div className="live"><span className="status-dot pulse" />LIVE TRAFFIC</div>} />
          <div className="topology">
            <div className="topology-node api"><span>PRODUCER</span><strong>API</strong><small>151 requests/s</small><em>HEALTHY</em></div>
            <div className="flow-line"><i /><i /><i /><span>write tx</span></div>
            <div className="topology-node postgres"><span>DURABLE STATE</span><strong><Icon name="database" size={16} />PostgreSQL</strong><small>24 connections</small><em>CONSISTENT</em></div>
            <div className="flow-line"><i /><i /><i /><span>atomic insert</span></div>
            <div className="topology-node outbox"><span>TRANSACTIONAL</span><strong>Outbox</strong><small>12 pending</small><em>PUBLISHING</em></div>
            <div className="flow-line"><i /><i /><i /><span>XADD</span></div>
            <div className="topology-node redis"><span>REDIS STREAM</span><strong>job-events</strong><small>84,921 events</small><em>143 events/s</em></div>
            <div className="flow-line"><i /><i /><i /><span>XREADGROUP</span></div>
            <div className="consumer-cluster">
              <div className="group-head"><div><span>CONSUMER GROUP</span><strong>job-workers</strong></div><div><span>PENDING</span><strong className="warning-text">17</strong></div><div><span>ACK LATENCY</span><strong>21ms</strong></div></div>
              <div className="worker-grid">{["worker-01","worker-02","worker-03","worker-04"].map((worker, i) => <button className={i === 2 ? "warning" : ""} key={worker} onClick={() => notify(`Opening ${worker}`)}><span className="status-dot" /><strong>{worker}</strong><small>{[36,34,28,35][i]} jobs/s</small></button>)}</div>
              <div className="more-consumers">+ 4 additional consumers <span>8 ACTIVE</span></div>
            </div>
          </div>
          <div className="semantics-strip"><strong>AT-LEAST-ONCE DELIVERY</strong><span>Messages remain in the Pending Entries List until acknowledged. Duplicate delivery is possible; job execution is idempotent.</span><code>XACK → persisted result → complete</code></div>
        </section>

        <div className="queue-main-grid">
          <div className="queue-primary">
            <section className="panel stream-panel">
              <SectionHeader title="Stream: job-events" meta="Primary event delivery stream" actions={<span className="badge success">ACTIVE</span>} />
              <div className="stream-content">
                <div className="stream-stats">
                  <div><span>STREAM LENGTH</span><strong>84,921</strong></div><div><span>EVENTS / SEC</span><strong>143</strong></div>
                  <div><span>FIRST EVENT</span><strong>18:02:41</strong></div><div><span>LATEST EVENT</span><strong>18:47:12</strong></div>
                  <div className="event-types"><span>EVENT TYPES</span><b>JOB_CREATED</b><b>JOB_RETRY</b></div>
                </div>
                <div className="chart-area"><div className="chart-heading"><span>THROUGHPUT · LAST 30 MIN</span><strong>143 <small>events/s</small></strong></div><MiniChart values={throughput} /><div className="chart-axis"><span>30m ago</span><span>20m</span><span>10m</span><span>now</span></div></div>
              </div>
            </section>

            <section className="panel">
              <SectionHeader title="Consumer Group — job-workers" meta="8 active consumers · 72,990 messages delivered" actions={<button className="text-button" onClick={() => setModal("drain")}><Icon name="drain" size={13} />Drain Consumers</button>} />
              <div className="queue-table"><table><thead><tr><th>CONSUMER</th><th>WORKER ID</th><th>PENDING</th><th>DELIVERED</th><th>ACKED</th><th>LAST DELIVERY</th><th>IDLE</th><th>STATUS</th></tr></thead>
                <tbody>{consumers.map((row) => <tr className={row[7] === "WARNING" ? "warning-row" : ""} key={row[0]}>{row.map((cell, i) => <td key={i}>{i === 0 || i === 1 ? <button className="table-link" onClick={() => notify(`Opening ${cell}`)}>{cell}</button> : i === 7 ? <span className={`badge ${cell === "HEALTHY" ? "success" : "warning"}`}>{cell}</span> : <span className={(i === 2 || i === 6) && row[7] === "WARNING" ? "warning-text" : ""}>{cell}</span>}</td>)}</tr>)}</tbody>
              </table></div>
            </section>

            <section className="panel pending-panel">
              <SectionHeader title="Pending Messages / In-flight Events" meta="Delivered to a consumer but not yet acknowledged" actions={<span className="pending-count">17 PENDING</span>} />
              <div className="info-strip"><span>PEL</span><p>Redis retains ownership and delivery metadata until the consumer sends <code>XACK</code>. Stale messages can be reclaimed by a healthy worker.</p></div>
              <div className="queue-table"><table><thead><tr><th>STREAM ID</th><th>JOB ID</th><th>CONSUMER</th><th>DELIVERY COUNT</th><th>IDLE TIME</th><th>STATUS</th></tr></thead>
                <tbody>{pending.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i < 3 ? <button className="table-link" onClick={() => notify(`Inspecting ${cell}`)}>{cell}</button> : i === 5 ? <span className="badge warning">{cell}</span> : cell}</td>)}</tr>)}</tbody>
              </table></div>
            </section>

            <section className="panel retry-panel">
              <SectionHeader title="Retry Pipeline" meta="Exponential backoff + full jitter" actions={<div className="retry-summary"><span>RETRYING <b>12</b></span><span>SCHEDULED <b>34</b></span><span>DEAD / FAILED <b className="danger-text">3</b></span></div>} />
              <div className="retry-body">
                <div className="retry-flow">{["Job Failure","Exponential Backoff","scheduled_at","Retry Scheduler","Outbox","Redis Stream","Worker"].map((item,i) => <div key={item}><span>{i+1}</span><strong>{item}</strong>{i < 6 && <i>→</i>}</div>)}</div>
                <div className="backoff-chart"><div className="attempt-bar"><span>ATTEMPT 1</span><i style={{width:"24%"}} /><strong>1.2s</strong></div><div className="attempt-bar"><span>ATTEMPT 2</span><i style={{width:"48%"}} /><strong>2.6s</strong></div><div className="attempt-bar"><span>ATTEMPT 3</span><i style={{width:"86%"}} /><strong>5.1s</strong></div><div className="jitter-note">AVG RETRY DELAY <strong>2.8s</strong><span>Randomized jitter prevents retry storms</span></div></div>
              </div>
            </section>
          </div>

          <aside className="queue-secondary">
            <section className="panel latency-card">
              <SectionHeader title="Queue Latency" meta="Last 30 minutes" />
              <div className="percentiles"><div><span>P50</span><strong>18<small>ms</small></strong></div><div><span>P95</span><strong>72<small>ms</small></strong></div><div><span>P99</span><strong>184<small>ms</small></strong></div></div>
              <MiniChart values={latency} color="#9a86ee" /><div className="chart-axis"><span>30m ago</span><span>15m</span><span>now</span></div>
            </section>

            <section className="panel backpressure-card">
              <SectionHeader title="Backpressure" meta="Producer / consumer balance" actions={<span className="badge success">NORMAL</span>} />
              <div className="pressure-gauge"><div><span style={{width:"53%"}} /></div><div className="gauge-labels"><span>NORMAL</span><span>ELEVATED</span><span>CRITICAL</span></div></div>
              <dl><div><dt>Incoming</dt><dd>151 jobs/s</dd></div><div><dt>Processing</dt><dd>143 jobs/s</dd></div><div><dt>Queue growth</dt><dd className="warning-text">+8 jobs/s</dd></div><div><dt>Estimated drain time</dt><dd>2m 41s</dd></div></dl>
              <div className="pressure-note"><i>PRODUCERS +5.6%</i><span>Consumers are keeping pace within the configured threshold.</span></div>
            </section>

            <section className="panel outbox-card">
              <SectionHeader title="Transactional Outbox" meta="Reliable event publication" actions={<span className="badge success">HEALTHY</span>} />
              <div className="outbox-metrics"><div><span>UNPUBLISHED</span><strong>12</strong></div><div><span>PUBLISHED TODAY</span><strong>184,291</strong></div><div><span>OLDEST UNPUBLISHED</span><strong>1.4s</strong></div></div>
              <div className="outbox-flow">{["PostgreSQL transaction","outbox_events","publisher","Redis"].map((item,i) => <div key={item}><span className={i === 3 ? "redis-mark" : ""}>{i === 0 ? <Icon name="database" size={13} /> : i+1}</span><strong>{item}</strong>{i < 3 && <i>↓</i>}</div>)}</div>
              <p>Events are inserted atomically with job state, then published asynchronously to Redis.</p>
            </section>

            <section className="panel feed-card">
              <SectionHeader title="Queue Events" meta="Real-time event feed" actions={<div className="live"><span className="status-dot pulse" />LIVE</div>} />
              <div className="event-filters">{["ALL","JOBS","ACKS","SYSTEM"].map((filter) => <button className={eventFilter === filter ? "active" : ""} onClick={() => setEventFilter(filter)} key={filter}>{filter}</button>)}</div>
              <div className="event-feed">{events.map((event) => <button key={event[0]} onClick={() => notify(`Inspecting ${event[1]}`)}><time>{event[0]}</time><span className={`event-kind ${event[1] === "ACK" ? "ack" : event[1].includes("RECLAIMED") ? "warn" : ""}`}>{event[1]}</span><strong>{event[2]}</strong><code>{event[3]}</code></button>)}</div>
            </section>
          </aside>
        </div>
      </main>
    </div>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className={`modal-icon ${modal === "pause" || modal === "drain" ? "danger" : "amber"}`}><Icon name={modal === "pause" ? "pause" : modal === "resume" ? "play" : "drain"} size={20} /></div>
      <h2>{modal === "pause" ? "Pause queue delivery?" : modal === "drain" ? "Drain all consumers?" : "Resume queue delivery?"}</h2>
      <p>{modal === "pause" ? "Consumers will stop claiming new messages. In-flight jobs can finish, but queue depth and delivery latency will increase." : modal === "drain" ? "All consumers will stop claiming work after their current jobs complete. Pending messages remain recoverable in Redis." : "Consumers will resume claiming messages from the job-events stream."}</p>
      <div className="modal-facts"><span>STREAM</span><code>job-events</code><span>CONSUMERS</span><strong>8 active · 17 pending</strong></div>
      <div className="modal-actions"><button className="button" onClick={() => setModal(null)}>Cancel</button><button className="button destructive" onClick={() => { notify(`${modal} operation submitted`); setModal(null); }}>Confirm {modal}</button></div>
    </div></div>}
    {toast && <div className="toast"><Icon name="check" size={14} />{toast}</div>}
  </div>;
}
