import {
    readFile
} from "node:fs/promises";

import {
    pool
} from "../src/config/database.js";

async function migrate() {
    try {
        const schemaUrl =
            new URL(
                "../db/schema.sql",
                import.meta.url
            );

        const schema =
            await readFile(
                schemaUrl,
                "utf8"
            );

        console.log(
            "Running PostgreSQL migration..."
        );

        await pool.query(schema);

        console.log(
            "PostgreSQL migration completed successfully"
        );
    } catch (error) {
        console.error(
            "Migration failed:",
            error
        );

        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrate();