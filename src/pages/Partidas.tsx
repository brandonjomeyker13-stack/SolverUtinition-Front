import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { partidasEnCache, partidasGenerales, RITMOS_GENERALES } from "../lib/partidasGenerales";
import type { Partida, PartidaGeneral, Plataforma, Ritmo } from "../lib/types";

type Pestana = Plataforma | "comunidad";

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: "lichess", label: "Lichess" },
  { id: "chesscom", label: "Chess.com" },
  { id: "comunidad", label: "Comunidad" },
];

export function Partidas() {
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const porDefecto: Pestana = usuario?.lichess ? "lichess" : usuario?.chesscom ? "chesscom" : "comunidad";
  const pedida = params.get("ver") as Pestana | null;
  const pestana = PESTANAS.some((p) => p.id === pedida) ? pedida! : porDefecto;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tus partidas</h1>
        <p className="mt-1 text-sm text-mute">
          Toca una partida para analizarla con Stockfish: barra de ventaja, errores marcados y variantes.
        </p>
      </div>
      <div className="segmento md:w-[420px]">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={pestana === p.id}
            onClick={() => setParams({ ver: p.id }, { replace: true })}
            className="segmento-boton"
          >
            {p.label}
          </button>
        ))}
      </div>
      {pestana === "comunidad" ? (
        <PartidasComunidad />
      ) : (
        <PartidasGenerales
          key={pestana}
          plataforma={pestana}
          vinculada={pestana === "lichess" ? !!usuario?.lichess : !!usuario?.chesscom}
        />
      )}
    </div>
  );
}

const RESULTADO = {
  gano: { texto: "Ganaste", clase: "bg-good/10 text-good" },
  perdio: { texto: "Perdiste", clase: "bg-bad/10 text-bad" },
  tablas: { texto: "Tablas", clase: "bg-canvas text-mute" },
} as const;

function fechaCorta(iso: string) {
  const fecha = new Date(iso);
  const otroAno = fecha.getFullYear() !== new Date().getFullYear();
  return fecha.toLocaleDateString("es", { day: "numeric", month: "short", ...(otroAno && { year: "numeric" }) });
}

function PartidasGenerales({ plataforma, vinculada }: { plataforma: Plataforma; vinculada: boolean }) {
  const navigate = useNavigate();
  const [filas, setFilas] = useState<PartidaGeneral[] | null>(() => partidasEnCache(plataforma));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(vinculada);
  const nombre = plataforma === "lichess" ? "Lichess" : "Chess.com";

  useEffect(() => {
    if (!vinculada) return;
    let vivo = true;
    partidasGenerales(plataforma)
      .then((lista) => vivo && setFilas(lista))
      .catch((e: unknown) => vivo && setError(e instanceof HttpError ? e.message : "No se pudieron cargar las partidas"))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [plataforma, vinculada]);

  if (!vinculada) {
    return (
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-mute">Vincula tu cuenta de {nombre} para ver y analizar tus partidas.</p>
        <Link to="/cuenta" className="btn">
          Vincular {nombre}
        </Link>
      </div>
    );
  }

  if (!filas && cargando) {
    return (
      <div className="card space-y-3 p-4" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-canvas" />
        ))}
        <p className="text-center text-sm text-mute">Trayendo tus partidas de {nombre}…</p>
      </div>
    );
  }
  if (error && !filas) return <p className="card p-5 text-bad">{error}</p>;
  if (!filas || filas.length === 0) {
    return <p className="card p-5 text-sm text-mute">No encontramos partidas recientes en {nombre}.</p>;
  }

  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {filas.map((p) => {
        const rival = p.color === "white" ? p.negras : p.blancas;
        const r = RESULTADO[p.resultado];
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() =>
                navigate(`/analisis/${p.plataforma}/${encodeURIComponent(p.id)}`, { state: { partida: p } })
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas md:px-5"
            >
              <span
                className={`h-8 w-8 shrink-0 rounded-lg border border-line ${p.color === "white" ? "bg-white" : "bg-[#403d39]"}`}
                aria-label={p.color === "white" ? "Jugaste con blancas" : "Jugaste con negras"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  vs {rival.nombre}
                  {rival.elo ? <span className="font-normal text-mute"> ({rival.elo})</span> : null}
                </p>
                <p className="truncate text-xs text-mute">
                  {RITMOS_GENERALES[p.ritmo] ?? p.ritmo} · {p.control} ·{" "}
                  {fechaCorta(p.terminada_en)}
                  {p.apertura ? ` · ${p.apertura}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${r.clase}`}>{r.texto}</span>
                <span className="text-xs font-medium text-accent">
                  {p.analizada ? `${p.precision ?? "—"} % precisión` : "Analizar"}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

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

function miLado(p: Partida, usuarioId: number | undefined) {
  const soyBlanca = usuarioId === p.blanca_id;
  const gano = p.resultado === (soyBlanca ? "1-0" : "0-1");
  const perdio = p.resultado === (soyBlanca ? "0-1" : "1-0");
  return {
    soyBlanca,
    rival: soyBlanca ? p.negra_nombre : p.blanca_nombre,
    delta: soyBlanca ? p.delta_blanca : p.delta_negra,
    elo: soyBlanca ? p.elo_blanca_antes : p.elo_negra_antes,
    resultado: gano ? "Ganaste" : perdio ? "Perdiste" : "Tablas",
    claseResultado: gano ? "text-good" : perdio ? "text-bad" : "text-mute",
  };
}

function PartidasComunidad() {
  const { usuario } = useAuth();
  const [filas, setFilas] = useState<Partida[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(true);

  useEffect(() => {
    let vivo = true;
    let listaNueva = false;

    api<Partida[]>("/partidas/mias")
      .then((datos) => {
        if (vivo && !listaNueva) setFilas(datos);
      })
      .catch((e: unknown) => {
        if (!vivo || (e instanceof HttpError && e.status === 401)) return;
        setError(e instanceof HttpError ? e.message : "No se pudieron cargar las partidas");
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    api("/partidas/sincronizar-ahora", { method: "POST" })
      .then(() => api<Partida[]>("/partidas/mias"))
      .then((datos) => {
        listaNueva = true;
        if (vivo) setFilas(datos);
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setBuscando(false);
      });

    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm text-mute">
        {buscando
          ? "Buscando en Lichess y Chess.com las partidas nuevas de la comunidad…"
          : "Solo las que ya se anotaron en el ranking de la comunidad."}
      </p>

      <div className="card overflow-hidden">
        {cargando ? (
          <p className="px-4 py-10 text-mute sm:px-5">Cargando…</p>
        ) : error ? (
          <p className="px-4 py-10 text-bad sm:px-5">{error}</p>
        ) : filas.length === 0 ? (
          <p className="px-4 py-10 text-mute sm:px-5">
            {buscando
              ? "Buscando partidas nuevas…"
              : "Aún no hay partidas. Cuenta si ambos ya tenían esa plataforma vinculada antes de que terminara, y si fue bala, blitz o rápida estándar."}
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line/60 md:hidden">
              {filas.map((p) => {
                const yo = miLado(p, usuario?.id);
                return (
                  <li key={p.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium break-words">vs {yo.rival}</p>
                        <p className="mt-1 text-sm text-mute">
                          {yo.soyBlanca ? "Blancas" : "Negras"} · {RITMO[p.ritmo]}
                        </p>
                        <p className="mt-1 text-xs text-mute">
                          {new Date(p.terminada_en).toLocaleString("es")}
                        </p>
                      </div>
                      <p className="shrink-0 text-right">
                        <span className={yo.delta >= 0 ? "text-good" : "text-bad"}>
                          {delta(yo.delta)}
                        </span>
                        <span className="mt-1 block text-xs text-mute">desde {yo.elo}</span>
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className={`font-medium ${yo.claseResultado}`}>{yo.resultado}</span>
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
                    <th className="px-5 py-3 font-medium">Rival</th>
                    <th className="px-5 py-3 font-medium">Color</th>
                    <th className="px-5 py-3 font-medium">Ritmo</th>
                    <th className="px-5 py-3 font-medium">Resultado</th>
                    <th className="px-5 py-3 font-medium">Elo</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((p) => {
                    const yo = miLado(p, usuario?.id);
                    return (
                      <tr key={p.id} className="border-b border-line/60 last:border-0">
                        <td className="px-5 py-3 text-mute">
                          {new Date(p.terminada_en).toLocaleString("es")}
                        </td>
                        <td className="px-5 py-3 font-medium">{yo.rival}</td>
                        <td className="px-5 py-3">{yo.soyBlanca ? "Blancas" : "Negras"}</td>
                        <td className="px-5 py-3 text-mute">{RITMO[p.ritmo]}</td>
                        <td className={`px-5 py-3 font-medium ${yo.claseResultado}`}>{yo.resultado}</td>
                        <td className="px-5 py-3">
                          <span className={yo.delta >= 0 ? "text-good" : "text-bad"}>
                            {delta(yo.delta)}
                          </span>
                          <span className="ml-2 text-mute">desde {yo.elo}</span>
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
