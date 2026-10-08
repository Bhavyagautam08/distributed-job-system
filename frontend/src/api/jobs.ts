import { fetchApi } from "./client";

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface Job {
  id: string;
  idempotency_key: string;
  type: string;
  status: JobStatus;
  payload: unknown;
  result: unknown;
  error: string | null;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  version: number;
}

export interface JobAttempt {
  id: string;
  job_id: string;
  attempt_number: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  result: unknown;
}

export interface JobEvent {
  id: string;
  event_type: string;
  aggregate_id: string;
  created_at: string;
  published: boolean;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  statusCounts: Record<string, number>;
}

export async function getJobs(filters: Record<string, string | number | undefined> = {}): Promise<JobsResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  return fetchApi(`/api/jobs${suffix}`);
}

export async function getJob(id: string): Promise<{ job: Job; attempts: JobAttempt[]; events: JobEvent[] }> {
  return fetchApi(`/api/jobs/${encodeURIComponent(id)}`);
}

export async function createJob(type: string, payload: unknown, idempotencyKey: string): Promise<{ job: Job }> {
  return fetchApi("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ type, payload }),
    headers: { "Idempotency-Key": idempotencyKey }
  });
}

export async function retryJob(id: string): Promise<{ job: Job }> {
  return fetchApi(`/api/jobs/${encodeURIComponent(id)}/retry`, { method: "POST" });
}

export async function cancelJob(id: string): Promise<{ job: Job }> {
  return fetchApi(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}
