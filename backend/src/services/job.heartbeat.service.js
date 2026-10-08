import { pool } from "../config/database.js";
import { JOB_STATUS } from "../utils/job-status.js";

export async function heartbeatJob(jobId, workerId) {
    const result = await pool.query(
        `
        UPDATE jobs
        SET updated_at = NOW()
        WHERE id = $1 AND locked_by = $2 AND status = $3
        RETURNING *
        `,
        [jobId, workerId, JOB_STATUS.RUNNING]
    );

    return result.rows[0] || null;
}
