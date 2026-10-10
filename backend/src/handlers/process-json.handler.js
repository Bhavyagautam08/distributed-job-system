export async function processJson(jobOrPayload) {
    const payload = (jobOrPayload && typeof jobOrPayload === "object" && "payload" in jobOrPayload)
        ? jobOrPayload.payload
        : jobOrPayload;

    if (
        payload === null ||
        typeof payload !== "object"
    ) {
        throw new Error(
            "process_json requires an object payload"
        );
    }

    const serialized = JSON.stringify(payload);

    if (serialized === undefined) {
        throw new Error(
            "Payload could not be serialized"
        );
    }

    const parsed = JSON.parse(serialized);

    const statistics = {
        objects: 0,
        arrays: 0,
        strings: 0,
        numbers: 0,
        booleans: 0,
        nulls: 0
    };

    function inspect(value) {
        if (value === null) {
            statistics.nulls++;
            return;
        }

        if (Array.isArray(value)) {
            statistics.arrays++;

            for (const item of value) {
                inspect(item);
            }

            return;
        }

        if (typeof value === "object") {
            statistics.objects++;

            for (const nestedValue of Object.values(value)) {
                inspect(nestedValue);
            }

            return;
        }

        if (typeof value === "string") {
            statistics.strings++;
            return;
        }

        if (typeof value === "number") {
            statistics.numbers++;
            return;
        }

        if (typeof value === "boolean") {
            statistics.booleans++;
        }
    }

    inspect(parsed);

    return {
        serializedSizeBytes: Buffer.byteLength(
            serialized,
            "utf8"
        ),
        statistics,
        processed: true
    };
}

export const processJsonHandler = processJson;