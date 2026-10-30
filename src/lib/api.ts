import type { ApiError } from "./types";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const TOKEN_KEY = "access_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class HttpError extends Error {
  status: number;
  codigo?: string;

  constructor(status: number, detail: string, codigo?: string) {
    super(detail);
    this.status = status;
    this.codigo = codigo;
  }
}

async function parseError(res: Response): Promise<HttpError> {
  try {
    const body = (await res.json()) as ApiError;
    return new HttpError(res.status, body.detail || "Error inesperado", body.codigo);
  } catch {
    return new HttpError(res.status, "Error inesperado");
  }
}

async function refreshAccess(): Promise<boolean> {
  const res = await fetch(`${API}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    setToken(null);
    return false;
  }
  const data = (await res.json()) as { access_token: string };
  setToken(data.access_token);
  return true;
}

type Options = RequestInit & { skipAuth?: boolean };

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token && !options.skipAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API}/api/v1${path}`, {
    ...options,
    headers,
    credentials: "include",
    signal: options.signal ?? AbortSignal.timeout(45000),
  });

  if (res.status === 401 && !options.skipAuth && !path.startsWith("/auth/")) {
    const ok = await refreshAccess();
    if (ok) return api<T>(path, { ...options, skipAuth: false });
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}
