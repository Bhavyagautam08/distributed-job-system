import { fetchApi } from "./client";
import type { Job } from "./jobs";

export interface DashboardEvent {
  id: string;
  event_type: string;
  aggregate_id: string;
  created_at: string;
  published: boolean;
}

export interface DashboardResponse {
  counts: Record<string, number>;
  activeWorkers: number;
  workers: WorkerLease[];
  jobs: Job[];
  events: DashboardEvent[];
  chart: { created: number; failed: number }[];
  unpublishedOutboxEvents: number;
}

export interface WorkerLease {
  id: string;
  activeJobs: number;
  jobIds: string[];
  lastActivityAt: string;
}

export interface WorkersResponse {
  workers: WorkerLease[];
  source: string;
}

export interface QueueResponse {
  counts: Record<string, number>;
  events: DashboardEvent[];
  outbox: { unpublished: number; published: number };
  maxAttemptDurationMs: number;
}

export function getOverview(range = "15m"): Promise<DashboardResponse> {
  return fetchApi(`/api/overview?range=${encodeURIComponent(range)}`);
}

export function getWorkers(): Promise<WorkersResponse> {
  return fetchApi("/api/workers");
}

export function getQueueSnapshot(): Promise<QueueResponse> {
  return fetchApi("/api/queues");
}
