import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { RankingFila, Ritmo } from "../lib/types";

const RITMOS: { id: Ritmo; label: string }[] = [
  { id: "rapid", label: "Rápida" },
  { id: "blitz", label: "Blitz" },
  { id: "bullet", label: "Bala" },
];

export function Ranking() {
  const { usuario, cargando: cargandoSesion } = useAuth();
  const [ritmo, setRitmo] = useState<Ritmo>("rapid");
  const [filas, setFilas] = useState<RankingFila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    setError(null);
    api<RankingFila[]>(`/ranking?ritmo=${ritmo}`)
      .then(setFilas)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? e.message : "No se pudo cargar el ranking");
        setFilas([]);
      })
      .finally(() => setCargando(false));
  }, [ritmo]);

  return (
    <div className="space-y-8">
      <section className="max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-gold-dim">Comunidad</p>
        <h1 className="font-display text-4xl leading-tight text-cream">Ranking interno</h1>
        <p className="mt-3 text-mute">
          Todos empiezan en 1000. Solo cuentan partidas estándar de bala, blitz y rápida
          jugadas en Chess.com después de que ambos ya estén vinculados. Rated y no rated
          suman igual.
        </p>
      </section>

      {!cargandoSesion && !usuario ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-panel px-5 py-4">
          <p className="text-cream">Crea tu cuenta o inicia sesión para seguir el ranking.</p>
          <div className="flex gap-2">
            <Link to="/entrar" className="rounded-full px-4 py-2 text-sm text-mute hover:text-cream">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-ink">
              Crear cuenta
            </Link>
          </div>
        </section>
      ) : null}

      <div className="flex gap-2">
        {RITMOS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRitmo(r.id)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              ritmo === r.id ? "bg-gold text-ink" : "bg-raised text-mute hover:text-cream"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        {cargando ? (
          <p className="px-5 py-10 text-mute">Cargando ranking…</p>
        ) : error ? (
          <p className="px-5 py-10 text-bad">{error}</p>
        ) : filas.length === 0 ? (
          <p className="px-5 py-10 text-mute">
            Todavía no hay partidas en este ritmo. Conecta Chess.com y juega con alguien de
            la comunidad.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-mute">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Jugador</th>
                <th className="px-5 py-3 font-medium">Elo</th>
                <th className="px-5 py-3 font-medium">Partidas</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.usuario_id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3 text-gold">{fila.posicion}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{fila.nombre}</div>
                    {fila.chesscom_username ? (
                      <div className="text-xs text-mute">{fila.chesscom_username}</div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 font-display text-lg">{fila.elo}</td>
                  <td className="px-5 py-3 text-mute">{fila.partidas_jugadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
