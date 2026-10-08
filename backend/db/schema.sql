CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =========================================================
-- JOBS
-- =========================================================

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    type VARCHAR(50) NOT NULL,

    payload JSONB NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',

    priority INTEGER NOT NULL DEFAULT 0,

    idempotency_key VARCHAR(255) NOT NULL UNIQUE,

    attempt_count INTEGER NOT NULL DEFAULT 0,

    max_attempts INTEGER NOT NULL DEFAULT 3,

    result JSONB,

    error TEXT,

    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    started_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    version INTEGER NOT NULL DEFAULT 0,

    locked_by VARCHAR(255),

    locked_at TIMESTAMPTZ,

    CONSTRAINT jobs_attempt_count_check
        CHECK (attempt_count >= 0),

    CONSTRAINT jobs_max_attempts_check
        CHECK (max_attempts > 0)
);


-- =========================================================
-- JOB INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_jobs_status
ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_jobs_status_updated
ON jobs(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_jobs_scheduled
ON jobs(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled_priority
ON jobs(status, scheduled_at, priority DESC);


-- =========================================================
-- JOB ATTEMPTS
-- =========================================================

CREATE TABLE IF NOT EXISTS job_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id UUID NOT NULL
        REFERENCES jobs(id)
        ON DELETE CASCADE,

    attempt_number INTEGER NOT NULL,

    status VARCHAR(30) NOT NULL,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    error TEXT,

    result JSONB
);


CREATE INDEX IF NOT EXISTS idx_job_attempts_job_id
ON job_attempts(job_id);


CREATE UNIQUE INDEX IF NOT EXISTS idx_job_attempt_unique
ON job_attempts(job_id, attempt_number);


-- =========================================================
-- IDEMPOTENCY KEYS
-- =========================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,

    job_id UUID NOT NULL
        REFERENCES jobs(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ
);


-- =========================================================
-- TRANSACTIONAL OUTBOX
-- =========================================================

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    event_type VARCHAR(100) NOT NULL,

    aggregate_id UUID NOT NULL,

    payload JSONB NOT NULL,

    published BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    published_at TIMESTAMPTZ
);


CREATE INDEX IF NOT EXISTS idx_outbox_unpublished
ON outbox_events(published, created_at);