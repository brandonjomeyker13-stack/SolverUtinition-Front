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
    <div className="space-y-6">
      <section className="max-w-2xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-accent">Comunidad</p>
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">Ranking interno</h1>
      </section>

      {!cargandoSesion && !usuario ? (
        <section className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-ink">Crea tu cuenta o inicia sesión para seguir el ranking.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/entrar" className="btn-ghost">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="btn">
              Crear cuenta
            </Link>
          </div>
        </section>
      ) : null}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {RITMOS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRitmo(r.id)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${
              ritmo === r.id ? "bg-accent text-white" : "border border-line bg-panel text-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {cargando ? (
          <p className="px-5 py-10 text-mute">Cargando ranking…</p>
        ) : error ? (
          <p className="px-5 py-10 text-bad">{error}</p>
        ) : filas.length === 0 ? (
          <p className="px-5 py-10 text-mute">
            Todavía no hay partidas en este ritmo. Conecta Lichess y juega con alguien de
            la comunidad.
          </p>
        ) : (
          <>
          <ul className="divide-y divide-line md:hidden">
            {filas.map((fila) => (
              <li key={fila.usuario_id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="w-8 shrink-0 text-center font-display text-lg tabular-nums text-gold">
                  {fila.posicion}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{fila.nombre}</p>
                  {fila.lichess_username || fila.chesscom_username ? (
                    <p className="break-all text-xs text-mute">
                      {fila.lichess_username || fila.chesscom_username}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl tabular-nums leading-none">{fila.elo}</p>
                  <p className="mt-1 text-xs text-mute">{fila.partidas_jugadas} partidas</p>
                </div>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-left text-sm md:table">
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
                <tr key={fila.usuario_id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3.5 font-display text-lg tabular-nums text-gold">{fila.posicion}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium break-words">{fila.nombre}</div>
                    {fila.lichess_username || fila.chesscom_username ? (
                      <div className="break-all text-xs text-mute">
                        {fila.lichess_username || fila.chesscom_username}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 font-display text-lg tabular-nums">{fila.elo}</td>
                  <td className="px-5 py-3.5 tabular-nums text-mute">{fila.partidas_jugadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  );
}
