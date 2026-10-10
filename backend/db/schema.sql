CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- USERS AND SESSIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
ON auth_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
ON auth_sessions (expires_at);


-- =========================================================
-- JOBS
-- =========================================================

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,

    payload JSONB NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',

    priority INTEGER NOT NULL DEFAULT 0,

    idempotency_key VARCHAR(255) NOT NULL,

    attempt_count INTEGER NOT NULL DEFAULT 0,

    max_attempts INTEGER NOT NULL DEFAULT 3,

    result JSONB,

    error TEXT,

    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    retry_event_published BOOLEAN NOT NULL DEFAULT TRUE,

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

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS retry_event_published BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_user_idempotency_key
ON jobs (user_id, idempotency_key);


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

CREATE INDEX IF NOT EXISTS idx_jobs_retry_scheduler
ON jobs(status, scheduled_at, retry_event_published);


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