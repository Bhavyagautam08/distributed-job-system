import { pool } from "../config/database.js";

export async function healthCheck(req, res) {
    try {
        await pool.query('SELECT 1');

        res.status(200).json({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
