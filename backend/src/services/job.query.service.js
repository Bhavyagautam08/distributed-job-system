import { pool } from "../config/database.js";

export async function getJobById(jobId) {
    const result = await pool.query(
        `SELECT * FROM jobs WHERE id = $1`,
        [jobId]
    );
    return result.rows[0] || null;
}

export async function getJobAttempts(jobId) {
    const result = await pool.query(
        `SELECT * FROM job_attempts WHERE job_id = $1 ORDER BY attempt_number ASC`,
        [jobId]
    );
    return result.rows;
}

export async function getJobEvents(jobId) {
    const result = await pool.query(
        `SELECT id, event_type, aggregate_id, created_at, published
         FROM outbox_events WHERE aggregate_id = $1 ORDER BY created_at ASC`,
        [jobId]
    );
    return result.rows;
}

export async function getJobsList(options = {}) {
    const { status, type, worker, priority, search, limit = 50, offset = 0 } = options;
    const filters = [];
    const values = [];

    const addFilter = (sql, value) => {
        values.push(value);
        filters.push(sql.replace("?", `$${values.length}`));
    };

    if (status) addFilter("status = ?", status);
    if (type) addFilter("type = ?", type);
    if (worker) addFilter("locked_by = ?", worker);
    if (priority !== undefined) addFilter("priority = ?", priority);
    if (search) {
        values.push(`%${search}%`);
        filters.push(`(id::text ILIKE $${values.length} OR type ILIKE $${values.length} OR idempotency_key ILIKE $${values.length})`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM jobs ${where}`, values);
    const listValues = [...values, limit, offset];
    const result = await pool.query(
        `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
        listValues
    );

    return { jobs: result.rows, total: countResult.rows[0].total };
}

export async function getJobStatusCounts() {
    const result = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM jobs GROUP BY status`
    );
    return Object.fromEntries(result.rows.map(({ status, count }) => [status, count]));
}

export async function getRecentOutboxEvents(limit = 20) {
    const result = await pool.query(
        `SELECT id, event_type, aggregate_id, created_at, published FROM outbox_events ORDER BY created_at DESC LIMIT $1`,
        [limit]
    );
    return result.rows;
}
