import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken } from "./api";
import type { Perfil, TokenResponse } from "./types";

type AuthCtx = {
  usuario: Perfil | null;
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  registrar: (nombre: string, email: string, password: string) => Promise<void>;
  entrarConGoogle: (idToken: string) => Promise<void>;
  recargar: () => Promise<void>;
  salir: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  async function recargar() {
    try {
      const perfil = await api<Perfil>("/auth/me");
      setUsuario(perfil);
    } catch {
      setUsuario(null);
      setToken(null);
    }
  }

  useEffect(() => {
    recargar().finally(() => setCargando(false));
  }, []);

  async function guardarSesion(data: TokenResponse) {
    setToken(data.access_token);
    setUsuario(data.usuario);
  }

  const value = useMemo<AuthCtx>(
    () => ({
      usuario,
      cargando,
      recargar,
      async entrar(email, password) {
        const data = await api<TokenResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        });
        await guardarSesion(data);
      },
      async registrar(nombre, email, password) {
        const data = await api<TokenResponse>("/auth/registro", {
          method: "POST",
          body: JSON.stringify({ nombre, email, password }),
          skipAuth: true,
        });
        await guardarSesion(data);
      },
      async entrarConGoogle(idToken) {
        const data = await api<TokenResponse>("/auth/google", {
          method: "POST",
          body: JSON.stringify({ id_token: idToken }),
          skipAuth: true,
        });
        await guardarSesion(data);
      },
      async salir() {
        try {
          await api("/auth/logout", { method: "POST" });
        } finally {
          setToken(null);
          setUsuario(null);
        }
      },
    }),
    [usuario, cargando],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
