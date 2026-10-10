import { pool } from "../config/database.js";

export async function getJobById(jobId, userId) {
    const result = await pool.query(
        `SELECT * FROM jobs WHERE id = $1 AND user_id = $2`,
        [jobId, userId]
    );
    return result.rows[0] || null;
}

export async function getJobAttempts(jobId, userId) {
    const result = await pool.query(
        `SELECT a.* FROM job_attempts a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.job_id = $1 AND j.user_id = $2
         ORDER BY a.attempt_number ASC`,
        [jobId, userId]
    );
    return result.rows;
}

export async function getJobEvents(jobId, userId) {
    const result = await pool.query(
        `SELECT e.id, e.event_type, e.aggregate_id, e.created_at, e.published
         FROM outbox_events e
         JOIN jobs j ON j.id = e.aggregate_id
         WHERE e.aggregate_id = $1 AND j.user_id = $2
         ORDER BY e.created_at ASC`,
        [jobId, userId]
    );
    return result.rows;
}

export async function getJobsList(options = {}) {
    const { userId, status, type, worker, priority, search, limit = 50, offset = 0 } = options;
    if (!userId) throw new TypeError("userId is required to list jobs");
    const filters = ["user_id = $1"];
    const values = [userId];

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

export async function getJobStatusCounts(userId) {
    if (!userId) throw new TypeError("userId is required to count jobs");
    const result = await pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM jobs WHERE user_id = $1 GROUP BY status`,
        [userId]
    );
    return Object.fromEntries(result.rows.map(({ status, count }) => [status, count]));
}

export async function getRecentOutboxEvents(limit = 20, userId) {
    if (!userId) throw new TypeError("userId is required to list outbox events");
    const result = await pool.query(
        `SELECT e.id, e.event_type, e.aggregate_id, e.created_at, e.published
         FROM outbox_events e
         JOIN jobs j ON j.id = e.aggregate_id
         WHERE j.user_id = $1
         ORDER BY e.created_at DESC LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}
