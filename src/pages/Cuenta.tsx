import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Ritmo } from "../lib/types";

const LABELS: Record<Ritmo, string> = {
  rapid: "Rápida",
  blitz: "Blitz",
  bullet: "Bala",
};

const MOTIVOS: Record<string, string> = {
  denegado:
    "Cancelaste el acceso en Lichess. Si tienes el modo infantil activo, Lichess no deja autorizar apps: desactívalo en Preferencias.",
  ocupada: "Esa cuenta de Lichess ya está en uso por otro miembro.",
  expirado: "Tardaste demasiado en autorizar. Vuelve a pulsar Conectar Lichess.",
  datos: "Lichess no confirmó la cuenta. Prueba de nuevo o escribe tu usuario abajo.",
};

export function Cuenta() {
  const { usuario, recargar, salir } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [usuarioLichess, setUsuarioLichess] = useState("");

  useEffect(() => {
    const lichess = params.get("lichess");
    if (!lichess) return;
    if (lichess === "ok") {
      setAviso("Lichess quedó vinculado. Solo cuentan las partidas de ahora en adelante.");
      void recargar();
    } else {
      const motivo = params.get("motivo") || "";
      setError(MOTIVOS[motivo] || "No se pudo vincular Lichess. Inténtalo de nuevo.");
    }
    setParams({}, { replace: true });
  }, [params, recargar, setParams]);

  async function conectar() {
    setError(null);
    setOcupado(true);
    try {
      const data = await api<{ url: string }>("/lichess/conectar");
      window.location.assign(data.url);
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo abrir Lichess");
      setOcupado(false);
    }
  }

  async function vincularUsuario(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setOcupado(true);
    try {
      await api("/lichess/vincular", {
        method: "POST",
        body: JSON.stringify({ username: usuarioLichess }),
      });
      await recargar();
      setAviso("Lichess quedó vinculado. Solo cuentan las partidas de ahora en adelante.");
      setUsuarioLichess("");
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo vincular Lichess");
    } finally {
      setOcupado(false);
    }
  }

  async function desvincular() {
    setError(null);
    setOcupado(true);
    try {
      await api("/lichess", { method: "DELETE" });
      await recargar();
      setAviso("Se desvinculó Lichess.");
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo desvincular");
    } finally {
      setOcupado(false);
    }
  }

  async function desvincularChesscom() {
    setError(null);
    setOcupado(true);
    try {
      await api("/chesscom", { method: "DELETE" });
      await recargar();
      setAviso("Se desvinculó Chess.com. Ya puedes conectar Lichess.");
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo desvincular");
    } finally {
      setOcupado(false);
    }
  }

  async function sincronizar() {
    setError(null);
    setOcupado(true);
    try {
      const r = await api<{ aplicadas: number; revisadas: number; omitidas: number }>(
        "/partidas/sincronizar-ahora",
        { method: "POST" },
      );
      await recargar();
      setAviso(
        `Sincronizado: ${r.aplicadas} partida(s) nueva(s), ${r.omitidas} ya anotada(s).`,
      );
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo sincronizar");
    } finally {
      setOcupado(false);
    }
  }

  if (!usuario) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl break-words">{usuario.nombre}</h1>
        <p className="mt-1 break-all text-sm text-mute">{usuario.email}</p>
      </div>

      {aviso ? (
        <p className="rounded-xl border border-good/40 bg-raised px-4 py-3 text-sm text-good">
          {aviso}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-bad/40 bg-raised px-4 py-3 text-sm text-bad">
          {error}
        </p>
      ) : null}

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        {(["rapid", "blitz", "bullet"] as Ritmo[]).map((ritmo) => {
          const rating = usuario.ratings.find((r) => r.ritmo === ritmo);
          return (
            <div key={ritmo} className="card px-3 py-3 sm:px-5 sm:py-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-mute">{LABELS[ritmo]}</p>
              <p className="mt-1 font-display text-2xl tabular-nums sm:text-3xl">{rating?.elo ?? 1000}</p>
              <p className="text-xs text-mute sm:text-sm">{rating?.partidas_jugadas ?? 0} partidas</p>
            </div>
          );
        })}
      </section>

      <section className="card p-4 sm:p-6">
        <h2 className="font-display text-xl">Lichess</h2>
        {usuario.lichess ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-mute">
              Vinculado como{" "}
              <span className="font-medium text-ink">{usuario.lichess.username_visible}</span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" disabled={ocupado} onClick={() => void sincronizar()} className="btn w-full sm:w-auto">
                Buscar partidas nuevas
              </button>
              <button type="button" disabled={ocupado} onClick={() => void desvincular()} className="btn-ghost w-full sm:w-auto">
                Desvincular
              </button>
            </div>
          </div>
        ) : usuario.chesscom ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-mute">
              Esta cuenta sigue en Chess.com como{" "}
              <span className="font-medium text-ink">{usuario.chesscom.username_visible}</span>. Un
              jugador usa una sola plataforma. Desvincúlala para entrar con Lichess.
            </p>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void desvincularChesscom()}
              className="btn-ghost w-full sm:w-auto"
            >
              Desvincular Chess.com
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-mute">
              Entras con tu cuenta de Lichess. Desde ese momento, las partidas nuevas contra
              alguien de la comunidad entran al ranking. Si el botón no abre Lichess, escribe
              tu usuario.
            </p>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void conectar()}
              className="btn w-full sm:w-auto"
            >
              Conectar Lichess
            </button>
            <form onSubmit={(ev) => void vincularUsuario(ev)} className="space-y-3">
              <label className="block text-sm font-medium">
                Usuario de Lichess
                <input
                  type="text"
                  autoComplete="username"
                  value={usuarioLichess}
                  onChange={(e) => setUsuarioLichess(e.target.value)}
                  placeholder="tuusuario"
                  className="field"
                />
              </label>
              <button type="submit" disabled={ocupado || usuarioLichess.trim().length < 2} className="btn-ghost w-full sm:w-auto">
                Vincular con usuario
              </button>
            </form>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => {
          void salir().finally(() => navigate("/", { replace: true }));
        }}
        className="btn-ghost w-full text-bad md:hidden"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
