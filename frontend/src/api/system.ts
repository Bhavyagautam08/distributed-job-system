import { ApiError, fetchApi, getApiUrl } from "./client";

export interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
}

export interface ReadyResponse {
  status: string;
  checks: {
    database: string;
    redis: string;
  };
  timestamp: string;
}

export interface MetricsResponse {
  metrics: {
    process: { uptimeSeconds: number };
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    requests: {
      total: number;
      successful: number;
      clientErrors: number;
      serverErrors: number;
      averageLatencyMs: number;
    };
  };
  timestamp: string;
}

export type RequestMetrics = MetricsResponse["metrics"]["requests"];

export async function getHealth(): Promise<HealthResponse> {
  return fetchApi("/api/health");
}

export async function getReady(): Promise<ReadyResponse> {
  try {
    return await fetchApi("/api/ready");
  } catch (error) {
    if (error instanceof ApiError && error.status === 503 && isReadyResponse(error.body)) {
      return error.body;
    }
    throw error;
  }
}

export async function getMetrics(): Promise<MetricsResponse> {
  return fetchApi("/api/metrics");
}

export function subscribeToRequestMetrics(
  onUpdate: (requestMetrics: RequestMetrics) => void,
  onError: (error: Error) => void
): () => void {
  const source = new EventSource(getApiUrl("/api/metrics/stream"), { withCredentials: true });
  source.addEventListener("request-metrics", (event: MessageEvent<string>) => {
    try {
      const data: unknown = JSON.parse(event.data);
      if (!isRequestMetrics(data)) throw new Error("Invalid request metrics event");
      onUpdate(data);
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Unable to read request metrics"));
    }
  });
  source.onerror = () => onError(new Error("Request metrics stream disconnected; reconnecting"));
  return () => source.close();
}

function isReadyResponse(value: unknown): value is ReadyResponse {
  if (typeof value !== "object" || value === null || !("checks" in value) || !("status" in value) || !("timestamp" in value)) {
    return false;
  }
  const checks = value.checks;
  return typeof value.status === "string"
    && typeof value.timestamp === "string"
    && typeof checks === "object"
    && checks !== null
    && "database" in checks
    && "redis" in checks
    && typeof checks.database === "string"
    && typeof checks.redis === "string";
}

function isRequestMetrics(value: unknown): value is RequestMetrics {
  if (typeof value !== "object" || value === null) return false;
  return "total" in value
    && typeof value.total === "number"
    && "successful" in value
    && typeof value.successful === "number"
    && "clientErrors" in value
    && typeof value.clientErrors === "number"
    && "serverErrors" in value
    && typeof value.serverErrors === "number"
    && "averageLatencyMs" in value
    && typeof value.averageLatencyMs === "number";
}
