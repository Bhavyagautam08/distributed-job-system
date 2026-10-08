import { useEffect, useMemo, useState } from "react";

type Status = "QUEUED" | "RUNNING" | "SUCCESS" | "RETRYING" | "FAILED";
type Job = {
  id: string;
  type: "calculate_primes" | "process_json" | "cpu_intensive" | "long_running";
  status: Status;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  attempt: number;
  maxAttempts: number;
  worker?: string;
  scheduled: string;
  created: string;
  duration: string;
  updated: string;
  key: string;
  reason?: string;
};

const fullIds = [
  "8f31c9d2-762e-4b68-91ea-82985bfaa91a", "51ab22d1-0448-4da4-a594-cbcf0f81a42c",
  "22de91af-d4d0-49fc-a326-e0af99a8e81f", "0a91d8aa-8fc4-473a-bc39-d60b2d98a17d",
  "91fe72bc-6fda-4c47-b071-5cfc284b1a82", "f4c8910e-a402-4d83-9ced-cc83872db309",
  "a17bc50d-2acd-43cb-a91a-774e5e63f850", "bc72e90a-9fb8-41b5-85ba-3ad2a813cc18",
  "482cf93a-c038-4e8d-b1df-c80c68bd161e", "d1827f39-57a2-40c8-9c91-a20879408d26",
  "69b1cf03-42d0-45ab-ade7-80f54333ff09", "ef04d5b8-349c-45ba-b49d-4e15c58a6c22",
  "3d7e12fa-43e3-4053-9a88-e711bc88bd14", "c91568e2-eeac-4de5-8430-c76a03bb460c",
  "74f08bc1-b9e8-4d22-81bd-459de20f8ae4", "6a31d9eb-69af-4942-af84-90df268cb938",
  "2fe880a1-2577-42df-b0e9-7cbfd8fa1e02", "9cbe6f32-d322-44c3-a070-568fc2e419fd",
  "117bad92-b7d7-4bd0-92af-3daf91d89cc4", "e61a3d5b-a98a-4a78-88ac-64f134893b0d",
  "4f8190cc-d792-45cd-a885-e4a9811b557e", "301dabb8-e9e1-48a4-98f5-177f71b3dc07",
  "dab044f2-0cad-4340-a849-f2186087a410", "88f12ba3-52e0-41f5-a186-9531ab04c2d1",
  "570ac421-c681-4e2a-9239-343178c3b5c0", "7ae17294-45ce-4abd-b9bf-f77a28810e03",
  "ae2059fc-6d0a-4a95-9bb1-cf514380936a", "dc7820a7-a3b0-48ea-b7cf-f43aa4ec50da",
  "15fc841d-a314-4ca7-b287-22a28599eb13", "b60a029f-4482-45f0-80a9-ae62fdcb4c3f",
];
const types: Job["type"][] = ["calculate_primes", "process_json", "cpu_intensive", "long_running"];
const statuses: Status[] = ["SUCCESS", "RUNNING", "QUEUED", "RETRYING", "FAILED"];
const priorities: Job["priority"][] = ["NORMAL", "HIGH", "NORMAL", "HIGH", "CRITICAL", "LOW"];

const initialJobs: Job[] = fullIds.map((id, i) => {
  const status = statuses[i % statuses.length];
  const attempt = status === "FAILED" ? 3 : status === "RETRYING" ? 2 : status === "QUEUED" ? 0 : 1;
  return {
    id,
    type: types[i % types.length],
    status,
    priority: priorities[i % priorities.length],
    attempt,
    maxAttempts: 3,
    worker: status === "QUEUED" ? undefined : `worker-0${(i % 8) + 1}`,
    scheduled: status === "QUEUED" ? `in ${(2.1 + (i % 5) * 1.3).toFixed(1)}s` : status === "RETRYING" ? `in ${(1.3 + (i % 4) * .9).toFixed(1)}s` : "—",
    created: `${8 + i * 3} sec ago`,
    duration: status === "SUCCESS" ? `${84 + i * 37} ms` : status === "FAILED" ? "912 ms" : status === "RETRYING" ? "4.1 s" : "—",
    updated: `${1 + (i % 9)} sec ago`,
    key: `${types[i % types.length].replace("_", "-")}-${id.slice(0, 4)}-2026`,
    reason: status === "FAILED" ? (i % 2 ? "Handler execution timeout" : "Worker lease expired") : undefined,
  };
});

const iconPaths: Record<string, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  jobs: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  down: <path d="m6 9 6 6 6-6"/>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  worker: <><rect x="4" y="4" width="16" height="6" rx="2"/><rect x="4" y="14" width="16" height="6" rx="2"/><path d="M8 7h.01M8 17h.01"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8z"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  queue: <><path d="M5 6h14M5 12h9M5 18h6"/><circle cx="18" cy="17" r="3"/></>,
  pulse: <path d="M3 12h4l2-7 4 14 2-7h6"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{iconPaths[name]}</svg>;
}

function Sidebar() {
  const sections = [
    ["OVERVIEW", [["Command Center", "grid"]]],
    ["JOBS", [["All Jobs", "jobs"], ["Create Job", "plus"], ["Retry Queue", "refresh"], ["Failed Jobs", "info"]]],
    ["INFRASTRUCTURE", [["Workers", "worker"], ["Queue", "queue"], ["Events", "pulse"]]],
    ["OBSERVABILITY", [["Metrics", "pulse"], ["System Health", "info"]]],
    ["SYSTEM", [["Settings", "settings"]]],
  ];
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark"><span/><span/><span/></div><span>JOBMESH</span></div>
    <nav>{sections.map(([label, items]) => <div className="nav-section" key={label as string}>
      <div className="nav-label">{label as string}</div>
      {(items as string[][]).map(([item, icon]) => <button className={`nav-item ${item === "All Jobs" ? "active" : ""}`} key={item}><Icon name={icon}/><span>{item}</span>{item === "Failed Jobs" && <em>23</em>}</button>)}
    </div>)}</nav>
    <div className="system-card">
      <div className="operational"><span className="health-dot"/>ALL SYSTEMS OPERATIONAL</div>
      <div className="health-row"><span>API</span><strong>Healthy</strong></div>
      <div className="health-row"><span>Postgres</span><strong>Healthy</strong></div>
      <div className="health-row"><span>Redis</span><strong>Healthy</strong></div>
      <div className="health-row"><span>Workers</span><strong>12 Active</strong></div>
    </div>
  </aside>;
}

function Topbar() {
  return <header className="topbar">
    <div className="mobile-brand">JM</div>
    <div className="breadcrumb"><span>Jobs</span><Icon name="chevron" size={13}/><b>All Jobs</b></div>
    <div className="global-search"><Icon name="search"/><span>Search jobs, IDs, idempotency keys...</span><kbd>⌘ K</kbd></div>
    <div className="top-meta"><span className="environment">PRODUCTION</span><span className="synced"><i/>Synced 2 sec ago</span><button className="icon-btn" aria-label="Notifications"><Icon name="bell"/></button><div className="avatar">AK</div></div>
  </header>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status status-${status.toLowerCase()}`}><i/>{status}</span>;
}

function FilterDropdown({ label, value, options, onChange }: { label: string; value?: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="filter-wrap">
    <button className={`filter-button ${value ? "has-value" : ""}`} onClick={() => setOpen(!open)}>{label}<Icon name="down" size={13}/></button>
    {open && <div className="filter-menu">{options.map(option => <button key={option} onClick={() => { onChange(option); setOpen(false); }}><span>{option}</span>{value === option && <Icon name="check" size={14}/>}</button>)}</div>}
  </div>;
}

function JobId({ job, copy }: { job: Job; copy: (value: string) => void }) {
  return <div className="job-id"><button className="id-link" title={job.id}>{job.id.slice(0, 8)}...{job.id.slice(-3)}</button><button className="copy" title="Copy job ID" onClick={(e) => { e.stopPropagation(); copy(job.id); }}><Icon name="copy" size={13}/></button><span className="idempotent" title="This job was created with an Idempotency-Key. Duplicate requests resolve to the same logical job."><Icon name="check" size={10}/></span></div>;
}

function Pagination() {
  return <div className="pagination">
    <div>Showing <b>1–30</b> of <b>1,284,932</b> jobs <span className="server-note">· Server-side results</span></div>
    <div className="page-controls"><button disabled>Previous</button><button className="current">1</button><button>2</button><button>3</button><span>…</span><button>25</button><button>Next</button></div>
    <div className="page-size">Page 1 of 25,699 <select defaultValue="50"><option>50 / page</option><option>100 / page</option><option>250 / page</option></select></div>
  </div>;
}

function App() {
  const [jobs, setJobs] = useState(initialJobs);
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("");
  const [worker, setWorker] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [details, setDetails] = useState<Job | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [create, setCreate] = useState(false);
  const [showUpdates, setShowUpdates] = useState(true);
  const [sort, setSort] = useState<"default" | "asc" | "desc">("desc");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => jobs.filter(job =>
    (status === "ALL" || job.status === status) &&
    (!type || job.type === type) &&
    (!worker || job.worker === worker) &&
    (!priority || job.priority === priority) &&
    (!search || `${job.id} ${job.type} ${job.key}`.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => sort === "default" ? 0 : sort === "desc" ? jobs.indexOf(a) - jobs.indexOf(b) : jobs.indexOf(b) - jobs.indexOf(a)), [jobs, status, type, worker, priority, search, sort]);

  const activeFilters = [["Status", status === "ALL" ? "" : status], ["Type", type], ["Worker", worker], ["Priority", priority]].filter(([, v]) => v);
  const clear = () => { setStatus("ALL"); setType(""); setWorker(""); setPriority(""); setSearch(""); };
  const copy = (value: string) => { navigator.clipboard?.writeText(value); setToast("Job ID copied"); };
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const retrySelected = () => {
    setJobs(current => current.map(j => selected.has(j.id) && j.status === "FAILED" ? { ...j, status: "RETRYING", scheduled: "in 3.8s", updated: "now", reason: undefined } : j));
    setSelected(new Set()); setConfirm(false); setToast("Retry scheduled with exponential backoff + jitter");
  };
  const createJob = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = jobs.find(j => j.key === "prime-test-001");
    if (existing) { setToast(`Existing job returned · ${existing.id.slice(0, 8)}...`); setCreate(false); return; }
    const job: Job = { ...initialJobs[2], id: "8f31c9d2-new1-4b68-91ea-82985bfaa91a", key: "prime-test-001", type: "calculate_primes", status: "QUEUED", created: "now", updated: "now", scheduled: "in 1.2s" };
    setJobs(j => [job, ...j]); setCreate(false); setToast("Job created · Job ID: 8f31c9d2...");
    setTimeout(() => setJobs(js => js.map(x => x.id === job.id ? { ...x, status: "RUNNING", worker: "worker-03", attempt: 1, scheduled: "—", updated: "now" } : x)), 1800);
    setTimeout(() => setJobs(js => js.map(x => x.id === job.id ? { ...x, status: "SUCCESS", duration: "284 ms", updated: "now" } : x)), 4800);
  };

  return <div className="app-shell">
    <Sidebar/><div className="workspace"><Topbar/>
    <main className="content">
      <div className="page-header">
        <div><div className="eyebrow"><span className="live-dot"/>LIVE <span>12 workers processing</span></div><h1>Jobs</h1><p>Inspect, filter and manage distributed job execution.</p></div>
        <div className="header-actions"><button className="secondary" onClick={() => setToast("Jobs refreshed · Synced now")}><Icon name="refresh"/>Refresh</button><button className="primary" onClick={() => setCreate(true)}><Icon name="plus"/>Create Job</button></div>
      </div>
      <div className="summary-line"><span><b>1,284,932</b> total jobs</span><span><i className="q"/>47 queued</span><span><i className="r"/>126 running</span><span><i className="f"/>23 failed</span><span><i className="s"/>1,264,736 completed</span></div>

      <section className="status-summary">
        {[["ALL","1,284,932"],["QUEUED","47"],["RUNNING","126"],["SUCCESS","1,264,736"],["FAILED","23"]].map(([name, count]) => <button key={name} onClick={() => setStatus(name)} className={status === name ? "selected" : ""}><span>{name}</span><b>{count}</b></button>)}
      </section>

      <section className="table-shell">
        {selected.size ? <div className="bulk-bar"><div><b>{selected.size} jobs selected</b><span>{[...selected].filter(id => jobs.find(j => j.id === id)?.status === "FAILED").length} failed · {[...selected].filter(id => jobs.find(j => j.id === id)?.status === "QUEUED").length} queued</span></div><div><button onClick={() => setConfirm(true)}><Icon name="refresh"/>Retry</button><button><span>×</span>Cancel</button><button>Export</button><button className="clear-selection" onClick={() => setSelected(new Set())}>Clear selection</button></div></div> :
        <div className="filters">
          <label className="search-field"><Icon name="search"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Job ID, type, idempotency key..."/><kbd>/</kbd></label>
          <div className="filter-list">
            <FilterDropdown label="Status" value={status === "ALL" ? "" : status} options={["ALL","QUEUED","RUNNING","SUCCESS","FAILED"]} onChange={setStatus}/>
            <FilterDropdown label="Type" value={type} options={types} onChange={setType}/>
            <FilterDropdown label="Worker" value={worker} options={Array.from({length: 8}, (_, i) => `worker-0${i + 1}`)} onChange={setWorker}/>
            <FilterDropdown label="Priority" value={priority} options={["LOW","NORMAL","HIGH","CRITICAL"]} onChange={setPriority}/>
            <FilterDropdown label="Created time" options={["Last 5 minutes","Last hour","Last 24 hours","Last 7 days","Custom"]} onChange={() => setToast("Created time filter applied")}/>
            <FilterDropdown label="Attempt count" options={["1","2","3","3+"]} onChange={() => setToast("Attempt filter applied")}/>
            <button className="more-filter"><Icon name="filter"/>More filters</button>
          </div>
          <div className="view-controls"><button onClick={clear}>Clear filters</button><div><button className="active">Table</button><button>Compact</button></div></div>
        </div>}
        {!!activeFilters.length && <div className="chips">{activeFilters.map(([name, value]) => <button key={name} onClick={() => name === "Status" ? setStatus("ALL") : name === "Type" ? setType("") : name === "Worker" ? setWorker("") : setPriority("")}><span>{name}:</span> {value} ×</button>)}<button className="clear-all" onClick={clear}>Clear all</button></div>}
        {showUpdates && <div className="updates"><span><Icon name="pulse"/>7 jobs updated since your last sync</span><button onClick={() => {setShowUpdates(false); setToast("Showing latest job updates");}}>View updates</button></div>}

        <div className="table-scroll">
          <table>
            <thead><tr>
              <th className="check-cell"><input type="checkbox" checked={filtered.length > 0 && filtered.every(j => selected.has(j.id))} onChange={() => filtered.every(j => selected.has(j.id)) ? setSelected(new Set()) : setSelected(new Set(filtered.map(j => j.id)))}/></th>
              <th>STATUS</th><th>JOB ID</th><th>TYPE</th><th>PRIORITY</th><th title="Attempt count: Number of execution attempts made by workers.">ATTEMPT</th><th title="Distributed worker currently responsible for execution.">WORKER</th><th title="Time at which the job becomes eligible for execution.">SCHEDULED</th>
              <th><button className="sort" onClick={() => setSort(sort === "desc" ? "asc" : sort === "asc" ? "default" : "desc")}>CREATED {sort === "desc" ? "↓" : sort === "asc" ? "↑" : ""}</button></th><th>DURATION</th><th>UPDATED</th><th/>
            </tr></thead>
            <tbody>{filtered.map(job => <tr key={job.id} className={job.updated === "now" ? "just-updated" : ""} onClick={() => setDetails(job)}>
              <td className="check-cell"><input type="checkbox" checked={selected.has(job.id)} onChange={() => toggle(job.id)} onClick={e => e.stopPropagation()}/></td>
              <td><StatusBadge status={job.status}/>{job.reason && <small className="failure-reason" title={`${job.reason}. No retries remaining.`}>{job.reason}</small>}</td>
              <td><JobId job={job} copy={copy}/><small className="key-preview">{job.key}</small></td>
              <td><span className="job-type">{job.type}</span></td>
              <td><span className={`priority priority-${job.priority.toLowerCase()}`}>{job.priority}</span></td>
              <td><span className="attempt">{job.attempt ? `${job.attempt} / ${job.maxAttempts}` : "—"}</span></td>
              <td>{job.worker ? <span className="worker"><i/>{job.worker}</span> : <span className="muted">—</span>}</td>
              <td><span className={job.scheduled !== "—" ? "scheduled" : "muted"}>{job.scheduled !== "—" && <Icon name="clock" size={13}/>} {job.scheduled}</span></td>
              <td className="mono">{job.created}</td><td className="mono">{job.duration}</td><td className="mono">{job.updated}</td>
              <td className="row-end"><Icon name="arrow" size={15}/><button onClick={(e) => {e.stopPropagation(); setMenu(menu === job.id ? null : job.id);}}><Icon name="more"/></button>
                {menu === job.id && <div className="action-menu" onClick={e => e.stopPropagation()}><button onClick={() => setDetails(job)}>View details</button>{job.status === "RUNNING" && <button>View worker</button>}{job.status === "FAILED" && <button className="retry" onClick={() => { setSelected(new Set([job.id])); setConfirm(true); setMenu(null); }}>Retry job</button>}{job.status === "QUEUED" && <button>Cancel job</button>}<button onClick={() => copy(job.id)}>Copy job ID</button></div>}
              </td>
            </tr>)}</tbody>
          </table>
          {!filtered.length && <div className="empty"><div className="empty-icon"><Icon name="search" size={22}/></div><b>No jobs match your filters.</b><span>Try adjusting your search or clearing active filters.</span><button className="secondary" onClick={clear}>Clear filters</button></div>}
        </div>
        <div className="mobile-jobs">{filtered.map(job => <button className="job-card" key={job.id} onClick={() => setDetails(job)}><div><StatusBadge status={job.status}/><Icon name="chevron"/></div><JobId job={job} copy={copy}/><strong>{job.type}</strong><div className="card-meta"><span>Attempt {job.attempt || "—"} / 3</span><span>{job.worker || "Unassigned"}</span><span>{job.updated}</span></div></button>)}</div>
        <Pagination/>
      </section>
      <div className="architecture-note"><span>PostgreSQL <b>SOURCE OF TRUTH</b></span><i/><span>Redis Streams <b>QUEUE / COORDINATION</b></span><i/><span>Workers <b>EXECUTION</b></span><i/><span>Delivery <b>AT-LEAST-ONCE</b></span></div>
    </main></div>

    {toast && <div className="toast"><span className="toast-icon"><Icon name="check"/></span><div><b>{toast.split(" · ")[0]}</b>{toast.includes(" · ") && <span>{toast.split(" · ")[1]}</span>}</div></div>}
    {details && <div className="overlay" onMouseDown={() => setDetails(null)}><aside className="details-panel" onMouseDown={e => e.stopPropagation()}><div className="panel-head"><div><span>JOB DETAILS</span><h2>{details.id.slice(0, 8)}...{details.id.slice(-3)}</h2></div><button onClick={() => setDetails(null)}>×</button></div><StatusBadge status={details.status}/><div className="detail-grid"><div><span>Job type</span><b>{details.type}</b></div><div><span>Priority</span><b>{details.priority}</b></div><div><span>Attempt</span><b>{details.attempt || "—"} / 3</b></div><div><span>Worker</span><b>{details.worker || "Unassigned"}</b></div></div><div className="detail-section"><span>IDEMPOTENCY KEY</span><code>{details.key}</code><p><Icon name="info" size={14}/> Duplicate requests with this key resolve to this same logical job.</p></div><div className="detail-section"><span>EXECUTION</span><div className="execution-step done"><i/><div><b>PostgreSQL job persisted</b><small>Transactional source of truth</small></div></div><div className="execution-step done"><i/><div><b>Outbox event published</b><small>Reliably delivered to Redis Stream</small></div></div><div className={`execution-step ${details.status !== "QUEUED" ? "done" : ""}`}><i/><div><b>Worker execution</b><small>{details.worker ? `Claimed by ${details.worker}` : "Awaiting worker claim"}</small></div></div></div>{details.reason && <div className="error-box"><b>{details.reason}</b><span>No retries remaining · Attempt 3 of 3</span></div>}<div className="delivery-note"><Icon name="info"/><span><b>At-least-once delivery</b>Duplicate delivery is possible. Idempotent handlers are recommended.</span></div></aside></div>}
    {confirm && <div className="overlay center"><div className="modal"><div className="modal-icon"><Icon name="refresh"/></div><h2>Retry selected jobs?</h2><p>Failed jobs will be scheduled using exponential backoff with jitter. Attempt counts are preserved.</p><div className="modal-actions"><button className="secondary" onClick={() => setConfirm(false)}>Cancel</button><button className="primary" onClick={retrySelected}>Retry jobs</button></div></div></div>}
    {create && <div className="overlay center"><form className="modal create-modal" onSubmit={createJob}><div className="form-heading"><div><span>CREATE JOB</span><h2>Submit a distributed job</h2></div><button type="button" onClick={() => setCreate(false)}>×</button></div><label>Job type<select defaultValue="calculate_primes"><option>calculate_primes</option><option>process_json</option><option>cpu_intensive</option><option>long_running</option></select></label><label>Payload<textarea defaultValue={'{\n  "limit": 100000\n}'}/></label><label>Idempotency-Key <small>Required</small><input defaultValue="prime-test-001" required/></label><div className="idempotency-help"><Icon name="info"/>Submitting this key again returns the existing logical job instead of creating a duplicate.</div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setCreate(false)}>Cancel</button><button className="primary" type="submit">Create Job</button></div></form></div>}
  </div>;
}

export default App;
