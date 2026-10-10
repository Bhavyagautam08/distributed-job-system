const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function getApiUrl(endpoint: string): string {
  return `${API_URL}${endpoint}`;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = getApiUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let body: unknown;
    try {
      const data: unknown = await response.json();
      body = data;
      if (typeof data === "object" && data !== null && "error" in data) {
        const error = data.error;
        if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
          message = error.message;
        } else if (typeof error === "string") {
          message = error;
        }
      } else if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        message = data.message;
      }
    } catch {}
    throw new ApiError(message, response.status, body);
  }

  return response.json();
}
