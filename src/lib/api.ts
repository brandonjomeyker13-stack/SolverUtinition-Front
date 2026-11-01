import type { ApiError } from "./types";

const API = (import.meta.env.VITE_API_URL || "https://solverutinition.onrender.com").replace(/\/$/, "");

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

export function guardarTokens(access: string, refresh: string): void {
  setToken(access);
  setRefreshToken(refresh);
}

export function limpiarSesion(): void {
  setToken(null);
  setRefreshToken(null);
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

let renovacion: Promise<boolean> | null = null;

async function renovar(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  const res = await fetch(`${API}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    limpiarSesion();
    return false;
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  guardarTokens(data.access_token, data.refresh_token);
  return true;
}

export function refreshAccess(): Promise<boolean> {
  if (!renovacion) {
    renovacion = renovar().finally(() => {
      renovacion = null;
    });
  }
  return renovacion;
}

type Options = RequestInit & { skipAuth?: boolean; yaReintento?: boolean };

function puedeRenovar(path: string): boolean {
  return !path.startsWith("/auth/login")
    && !path.startsWith("/auth/registro")
    && !path.startsWith("/auth/google")
    && !path.startsWith("/auth/refresh")
    && !path.startsWith("/auth/logout");
}

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
    signal: options.signal ?? AbortSignal.timeout(90000),
  });

  if (res.status === 401 && !options.skipAuth && !options.yaReintento && puedeRenovar(path)) {
    const ok = await refreshAccess();
    if (ok) return api<T>(path, { ...options, yaReintento: true });
    window.dispatchEvent(new Event("sesion-expirada"));
  }

  if (res.status === 204) return undefined as T;
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}
