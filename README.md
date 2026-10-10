# JobMesh

JobMesh is a distributed job-processing system with a PostgreSQL-backed job
queue, Redis Streams delivery, background workers, retries, and a real-time
operations dashboard.

## Screenshots

### Command center

![JobMesh command center](docs/screenshots/dashboard-overview.png)

### Activity and outbox health

![Recent job activity, outbox events, and system health](docs/screenshots/dashboard-activity.png)

### Job details

![Job status and execution lifecycle](docs/screenshots/job-details.png)

### Execution details

![Execution attempts, payload, result, and queue state](docs/screenshots/job-execution.png)

Account details have been removed from the screenshots.

## Components

- **Frontend:** React and Vite dashboard.
- **Backend:** Node.js API and worker processes.
- **Persistence:** PostgreSQL stores jobs, attempts, and transactional outbox events.
- **Delivery:** Redis Streams distributes job events to workers.
- **CI:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) builds the
  frontend and runs backend tests against PostgreSQL.

## Local development

Use Node.js 22 or later, PostgreSQL, and an Upstash Redis REST database. Copy
[`backend/.env.example`](backend/.env.example) to `backend/.env` and configure
the database and Redis credentials.

Start each process in a separate terminal:

```sh
cd backend
npm ci
npm run dev
```

```sh
cd backend
npm run worker
```

```sh
cd frontend
npm ci
npm run dev
```

The backend test suite can be run with:

```sh
npm test --prefix backend
```
