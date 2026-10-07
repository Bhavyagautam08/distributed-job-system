import app from "./src/app.js";
import { env } from "./src/config/env.js";
import {
    checkDatabaseConnection,
    pool
} from "./src/config/database.js";
import { checkRedisConnection } from "./src/config/redis.js";

async function startServer() {
    try {
        await checkDatabaseConnection();
        console.log("PostgreSQL connection established");

        await checkRedisConnection();
        console.log("Redis connection established");

        const server = app.listen(env.PORT, () => {
            console.log(
                `API server running on http://localhost:${env.PORT}`
            );
        });

        const shutdown = async (signal) => {
            console.log(`${signal} received. Shutting down...`);

            server.close(async () => {
                try {
                    await pool.end();

                    console.log("PostgreSQL pool closed");
                    console.log("Server shut down successfully");

                    process.exit(0);
                } catch (error) {
                    console.error(
                        "Error during shutdown:",
                        error
                    );

                    process.exit(1);
                }
            });
        };

        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));
    } catch (error) {
        console.error(
            "Failed to start server:",
            error
        );

        process.exit(1);
    }
}

startServer();