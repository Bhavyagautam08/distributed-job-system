import { publishOutboxEvents } from "./outbox.publisher.js";

const POLL_INTERVAL_MS = 1000;

let running = true;

async function processOutbox() {
    while (running) {
        try {
            const publishedCount = await publishOutboxEvents();

            if (publishedCount > 0) {
                console.log(
                    `Published ${publishedCount} outbox event(s)`
                );
            }
        } catch (error) {
            console.error(
                "Outbox publisher error:",
                error
            );
        }

        await new Promise((resolve) => {
            setTimeout(resolve, POLL_INTERVAL_MS); // sleep for the specified interval before the next poll
        });
    }
}

function shutdown(signal) {
    console.log(
        `${signal} received. Stopping outbox worker...`
    );

    running = false;
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

processOutbox();