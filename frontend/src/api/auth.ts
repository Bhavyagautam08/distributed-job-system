import { fetchApi } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

interface AuthResponse {
  user: AuthUser;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await fetchApi("/api/auth/me") as AuthResponse;
  return response.user;
}

export async function registerUser(
  email: string,
  displayName: string,
  password: string
): Promise<AuthUser> {
  const response = await fetchApi("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, displayName, password })
  }) as AuthResponse;
  return response.user;
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const response = await fetchApi("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }) as AuthResponse;
  return response.user;
}

export async function logoutUser(): Promise<void> {
  await fetchApi("/api/auth/logout", { method: "POST" });
}
