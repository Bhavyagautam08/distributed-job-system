import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
});

pool.on("error", (error) => {
    console.error(
        "Unexpected PostgreSQL pool error:",
        error
    );
});

export async function checkDatabaseConnection() {
    const client = await pool.connect();

    try {
        await client.query("SELECT 1");
    } finally {
        client.release();
    }
}