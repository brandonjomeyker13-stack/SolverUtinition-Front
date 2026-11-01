import { useEffect, useState } from "react";
import { api, HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Partida, Ritmo } from "../lib/types";

const RITMO: Record<Ritmo, string> = {
  rapid: "Rápida",
  blitz: "Blitz",
  bullet: "Bala",
};

function delta(n: number) {
  if (n > 0) return `+${n}`;
  return String(n);
}

function verEn(plataforma: string) {
  return plataforma === "lichess" ? "ver en Lichess" : "ver en Chess.com";
}

export function Partidas() {
  const { usuario } = useAuth();
  const [filas, setFilas] = useState<Partida[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api<Partida[]>("/partidas/mias")
      .then(setFilas)
      .catch((e: unknown) => {
        if (e instanceof HttpError && e.status === 401) return;
        setError(e instanceof HttpError ? e.message : "No se pudieron cargar las partidas");
      })
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Tus partidas</h1>
        <p className="mt-2 text-sm text-mute">
          Solo las que ya se anotaron en el ranking de la comunidad.
        </p>
      </div>

      <div className="card overflow-hidden">
        {cargando ? (
          <p className="px-4 py-10 text-mute sm:px-5">Cargando…</p>
        ) : error ? (
          <p className="px-4 py-10 text-bad sm:px-5">{error}</p>
        ) : filas.length === 0 ? (
          <p className="px-4 py-10 text-mute sm:px-5">
            Aún no hay partidas. Juega en Lichess con alguien de la comunidad y pulsa
            “Buscar partidas nuevas” en tu cuenta.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line/60 md:hidden">
              {filas.map((p) => {
                const soyBlanca = usuario?.id === p.blanca_id;
                const miDelta = soyBlanca ? p.delta_blanca : p.delta_negra;
                const miElo = soyBlanca ? p.elo_blanca_antes : p.elo_negra_antes;
                return (
                  <li key={p.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm">
                          {soyBlanca ? "Blancas" : "Negras"} · {RITMO[p.ritmo]}
                        </p>
                        <p className="mt-1 text-xs text-mute">
                          {new Date(p.terminada_en).toLocaleString("es")}
                        </p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className={miDelta >= 0 ? "text-good" : "text-bad"}>
                          {delta(miDelta)}
                        </span>
                        <span className="mt-1 block text-xs text-mute">desde {miElo}</span>
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-mute">{p.resultado}</span>
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center font-medium text-accent underline"
                        >
                          {verEn(p.plataforma)}
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-mute">
                  <tr>
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Color</th>
                    <th className="px-5 py-3 font-medium">Ritmo</th>
                    <th className="px-5 py-3 font-medium">Resultado</th>
                    <th className="px-5 py-3 font-medium">Elo</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((p) => {
                    const soyBlanca = usuario?.id === p.blanca_id;
                    const miDelta = soyBlanca ? p.delta_blanca : p.delta_negra;
                    const miElo = soyBlanca ? p.elo_blanca_antes : p.elo_negra_antes;
                    return (
                      <tr key={p.id} className="border-b border-line/60 last:border-0">
                        <td className="px-5 py-3 text-mute">
                          {new Date(p.terminada_en).toLocaleString("es")}
                        </td>
                        <td className="px-5 py-3">{soyBlanca ? "Blancas" : "Negras"}</td>
                        <td className="px-5 py-3 text-mute">{RITMO[p.ritmo]}</td>
                        <td className="px-5 py-3">{p.resultado}</td>
                        <td className="px-5 py-3">
                          <span className={miDelta >= 0 ? "text-good" : "text-bad"}>
                            {delta(miDelta)}
                          </span>
                          <span className="ml-2 text-mute">desde {miElo}</span>
                          {p.url ? (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-3 inline-flex min-h-11 items-center font-medium text-accent underline"
                            >
                              {verEn(p.plataforma)}
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
