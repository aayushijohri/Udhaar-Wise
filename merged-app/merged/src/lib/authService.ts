/**
 * authService.ts
 * Wraps backend /api/auth endpoints and manages the session token in localStorage.
 */

import { api } from "./apiClient";

const TOKEN_KEY = "uw_access_token";
const USER_KEY = "uw_user";

export interface User {
  id: string;
  email: string;
}

export interface AuthData {
  session?: { access_token: string };
  user?: User;
}

export function saveSession(data: AuthData) {
  if (data?.session?.access_token) {
    localStorage.setItem(TOKEN_KEY, data.session.access_token);
  }
  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

export async function signup(payload: {
  name: string;
  business: string;
  category: string;
  phone: string;
  email: string;
  password: string;
}) {
  const res = await api.post<AuthData>("/api/auth/signup", payload, { public: true });
  if (res.success && res.data) {
    saveSession(res.data);
  }
  return res;
}

export async function login(email: string, password: string) {
  const res = await api.post<AuthData>("/api/auth/login", { email, password }, { public: true });
  if (res.success && res.data) {
    saveSession(res.data);
  }
  return res;
}

export async function logout() {
  try {
    await api.post("/api/auth/logout", {});
  } finally {
    clearSession();
  }
}
