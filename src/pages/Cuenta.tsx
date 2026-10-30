import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Ritmo } from "../lib/types";

const LABELS: Record<Ritmo, string> = {
  rapid: "Rápida",
  blitz: "Blitz",
  bullet: "Bala",
};

export function Cuenta() {
  const { usuario, recargar } = useAuth();
  const [params, setParams] = useSearchParams();
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const chesscom = params.get("chesscom");
    if (chesscom === "ok") {
      setAviso("Chess.com quedó vinculado.");
      void recargar();
      setParams({}, { replace: true });
    }
    if (chesscom === "error") {
      setError("No se pudo vincular Chess.com. Inténtalo de nuevo.");
      setParams({}, { replace: true });
    }
  }, [params, recargar, setParams]);

  async function conectar() {
    setError(null);
    setOcupado(true);
    try {
      const data = await api<{ url: string }>("/chesscom/conectar");
      window.location.assign(data.url);
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo iniciar Chess.com");
      setOcupado(false);
    }
  }

  async function desvincular() {
    setError(null);
    setOcupado(true);
    try {
      await api("/chesscom", { method: "DELETE" });
      await recargar();
      setAviso("Se desvinculó Chess.com.");
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
        <h1 className="font-display text-3xl">{usuario.nombre}</h1>
        <p className="mt-1 text-sm text-mute">{usuario.email}</p>
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

      <section className="grid gap-4 sm:grid-cols-3">
        {(["rapid", "blitz", "bullet"] as Ritmo[]).map((ritmo) => {
          const rating = usuario.ratings.find((r) => r.ritmo === ritmo);
          return (
            <div key={ritmo} className="rounded-2xl border border-line bg-panel px-5 py-4">
              <p className="text-xs uppercase tracking-wider text-mute">{LABELS[ritmo]}</p>
              <p className="mt-1 font-display text-3xl">{rating?.elo ?? 1000}</p>
              <p className="text-sm text-mute">{rating?.partidas_jugadas ?? 0} partidas</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="font-display text-xl">Chess.com</h2>
        {usuario.chesscom ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-mute">
              Vinculado como{" "}
              <span className="text-cream">{usuario.chesscom.username_visible}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void sincronizar()}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                Buscar partidas nuevas
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => void desvincular()}
                className="rounded-xl border border-line px-4 py-2 text-sm text-mute hover:text-cream disabled:opacity-60"
              >
                Desvincular
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-mute">
              Conecta tu cuenta para que las partidas nuevas contra alguien de la
              comunidad entren al ranking.
            </p>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void conectar()}
              className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              Conectar Chess.com
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
