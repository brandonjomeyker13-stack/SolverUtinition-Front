import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { nombreDelMes, rankingDelMes, rankingPorElo } from "../lib/ranking";
import type { RankingFila, RankingMes, Ritmo } from "../lib/types";

const RITMOS: { id: Ritmo; label: string }[] = [
  { id: "rapid", label: "Rápida" },
  { id: "blitz", label: "Blitz" },
  { id: "bullet", label: "Bala" },
];

type Vista = "mes" | "elo";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "mes", label: "Este mes" },
  { id: "elo", label: "Elo general" },
];

type Datos = { vista: "elo"; filas: RankingFila[] } | { vista: "mes"; mes: RankingMes };

function pedir(vista: Vista, ritmo: Ritmo): Promise<Datos> {
  if (vista === "mes") return rankingDelMes(ritmo).then((mes) => ({ vista, mes }));
  return rankingPorElo(ritmo).then((filas) => ({ vista, filas }));
}

function conSigno(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

export function Ranking() {
  const { usuario, cargando: cargandoSesion } = useAuth();
  const [vista, setVista] = useState<Vista>("mes");
  const [ritmo, setRitmo] = useState<Ritmo>("rapid");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tarda, setTarda] = useState(false);
  const actual = useRef({ vista, ritmo });
  const generacion = useRef(0);
  actual.current = { vista, ritmo };

  useEffect(() => {
    if (!cargando) return;
    const id = window.setTimeout(() => setTarda(true), 4000);
    return () => window.clearTimeout(id);
  }, [cargando]);

  useEffect(() => {
    const marca = ++generacion.current;
    setCargando(true);
    setTarda(false);
    setError(null);
    pedir(vista, ritmo)
      .then((d) => {
        if (generacion.current === marca) setDatos(d);
      })
      .catch((e: unknown) => {
        if (generacion.current !== marca) return;
        setError(e instanceof HttpError ? e.message : "No se pudo cargar el ranking");
        setDatos(null);
      })
      .finally(() => {
        if (generacion.current === marca) setCargando(false);
      });
  }, [vista, ritmo]);

  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    api("/partidas/sincronizar-ahora", { method: "POST" })
      .then(() => {
        if (!vivo) return null;
        const pedido = actual.current;
        return pedir(pedido.vista, pedido.ritmo).then((d) => ({ pedido, d }));
      })
      .then((r) => {
        if (!vivo || !r) return;
        const ahora = actual.current;
        if (ahora.vista !== r.pedido.vista || ahora.ritmo !== r.pedido.ritmo) return;
        generacion.current += 1;
        setDatos(r.d);
        setCargando(false);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [usuario]);

  const vacio =
    datos === null ||
    (datos.vista === "elo" ? datos.filas.length === 0 : datos.mes.filas.length === 0);

  return (
    <div className="space-y-6">
      <section className="max-w-2xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-accent">Comunidad</p>
        <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">Ranking interno</h1>
        {vista === "mes" ? (
          <p className="mt-2 text-sm text-mute">
            {datos?.vista === "mes" ? `${nombreDelMes(datos.mes.mes)}. ` : null}
            Gana quien más Elo sube en el mes, empiece donde empiece. Se reinicia el día 1.
          </p>
        ) : null}
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

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-panel p-1 sm:inline-grid sm:w-80">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={vista === v.id}
              onClick={() => setVista(v.id)}
              className={`min-h-11 rounded-xl px-3 text-sm font-medium ${
                vista === v.id ? "bg-accent text-white" : "text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {RITMOS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={ritmo === r.id}
              onClick={() => setRitmo(r.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${
                ritmo === r.id ? "bg-accent text-white" : "border border-line bg-panel text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {cargando ? (
          <p className="px-5 py-10 text-mute">
            Cargando ranking…
            {tarda
              ? " El servidor estaba dormido y está arrancando. La primera vez puede tardar cerca de un minuto."
              : null}
          </p>
        ) : error ? (
          <p className="px-5 py-10 text-bad">{error}</p>
        ) : vacio ? (
          <p className="px-5 py-10 text-mute">
            {vista === "mes"
              ? "Nadie ha jugado este mes en este ritmo. Juega en Lichess con alguien de la comunidad."
              : "Todavía no hay partidas en este ritmo. Conecta Lichess y juega con alguien de la comunidad."}
          </p>
        ) : datos?.vista === "mes" ? (
          <TablaMes mes={datos.mes} />
        ) : datos?.vista === "elo" ? (
          <TablaElo filas={datos.filas} />
        ) : null}
      </div>
    </div>
  );
}

function TablaMes({ mes }: { mes: RankingMes }) {
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {mes.filas.map((fila) => (
          <li key={fila.usuario_id} className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-8 shrink-0 text-center font-display text-lg tabular-nums text-gold">
              {fila.posicion}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{fila.nombre}</p>
              <p className="break-all text-xs text-mute">
                {fila.lichess_username ? `${fila.lichess_username} · ` : null}
                {fila.ganadas}G {fila.tablas}T {fila.perdidas}P
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`font-display text-2xl tabular-nums leading-none ${
                  fila.subida >= 0 ? "text-good" : "text-bad"
                }`}
              >
                {conSigno(fila.subida)}
              </p>
              <p className="mt-1 text-xs text-mute">Elo {fila.elo}</p>
            </div>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-line text-mute">
          <tr>
            <th className="px-5 py-3 font-medium">#</th>
            <th className="px-5 py-3 font-medium">Jugador</th>
            <th className="px-5 py-3 font-medium">Subida</th>
            <th className="px-5 py-3 font-medium">Elo</th>
            <th className="px-5 py-3 font-medium">Partidas</th>
          </tr>
        </thead>
        <tbody>
          {mes.filas.map((fila) => (
            <tr key={fila.usuario_id} className="border-b border-line/70 last:border-0">
              <td className="px-5 py-3.5 font-display text-lg tabular-nums text-gold">{fila.posicion}</td>
              <td className="px-5 py-3.5">
                <div className="font-medium break-words">{fila.nombre}</div>
                {fila.lichess_username ? (
                  <div className="break-all text-xs text-mute">{fila.lichess_username}</div>
                ) : null}
              </td>
              <td
                className={`px-5 py-3.5 font-display text-lg tabular-nums ${
                  fila.subida >= 0 ? "text-good" : "text-bad"
                }`}
              >
                {conSigno(fila.subida)}
              </td>
              <td className="px-5 py-3.5 tabular-nums text-mute">{fila.elo}</td>
              <td className="px-5 py-3.5 tabular-nums text-mute">
                {fila.partidas}
                <span className="ml-2 text-xs">
                  {fila.ganadas}G {fila.tablas}T {fila.perdidas}P
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function TablaElo({ filas }: { filas: RankingFila[] }) {
  return (
    <>
      <ul className="divide-y divide-line md:hidden">
        {filas.map((fila) => (
          <li key={fila.usuario_id} className="flex items-center gap-3 px-4 py-3.5">
            <span className="w-8 shrink-0 text-center font-display text-lg tabular-nums text-gold">
              {fila.posicion}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{fila.nombre}</p>
              {fila.lichess_username ? (
                <p className="break-all text-xs text-mute">{fila.lichess_username}</p>
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
                {fila.lichess_username ? (
                  <div className="break-all text-xs text-mute">{fila.lichess_username}</div>
                ) : null}
              </td>
              <td className="px-5 py-3.5 font-display text-lg tabular-nums">{fila.elo}</td>
              <td className="px-5 py-3.5 tabular-nums text-mute">{fila.partidas_jugadas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
