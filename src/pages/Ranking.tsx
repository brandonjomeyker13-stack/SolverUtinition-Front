import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { nombreDelMes, rankingPorElo, rankingRealDelMes } from "../lib/ranking";
import type { Plataforma, RankingFila, RankingReal, RankingRealFila, Ritmo } from "../lib/types";

const RITMOS: { id: Ritmo; label: string }[] = [
  { id: "rapid", label: "Rápida" },
  { id: "blitz", label: "Blitz" },
  { id: "bullet", label: "Bala" },
];

const PLATAFORMAS: { id: Plataforma; label: string }[] = [
  { id: "lichess", label: "Lichess" },
  { id: "chesscom", label: "Chess.com" },
];

type Vista = "mes" | "elo";

type Datos =
  | { vista: "elo"; filas: RankingFila[] }
  | { vista: "mes"; lichess: RankingReal; chesscom: RankingReal };

function pedir(vista: Vista, ritmo: Ritmo): Promise<Datos> {
  if (vista === "mes") {
    return Promise.all([rankingRealDelMes("lichess", ritmo), rankingRealDelMes("chesscom", ritmo)]).then(
      ([lichess, chesscom]) => ({ vista, lichess, chesscom }),
    );
  }
  return rankingPorElo(ritmo).then((filas) => ({ vista, filas }));
}

function conSigno(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "+0";
}

function tonoCambio(n: number) {
  return n > 0 ? "bg-good/10 text-good" : n < 0 ? "bg-bad/10 text-bad" : "bg-canvas text-mute";
}

const AVATARES = [
  "bg-rosa text-rosa-fuerte",
  "bg-durazno text-durazno-fuerte",
  "bg-menta text-good",
  "bg-lila text-lila-fuerte",
  "bg-accent-soft text-accent",
];

function Avatar({ id, nombre }: { id: number; nombre: string }) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${AVATARES[id % AVATARES.length]}`}
      aria-hidden="true"
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

function Puesto({ n }: { n: number }) {
  const estilo =
    n === 1
      ? "bg-durazno text-durazno-fuerte"
      : n === 2
        ? "bg-accent-soft text-accent"
        : n === 3
          ? "bg-rosa text-rosa-fuerte"
          : "text-mute";
  return (
    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular-nums ${estilo}`}>
      {n}
    </span>
  );
}

export function Ranking() {
  const { usuario, cargando: cargandoSesion } = useAuth();
  const [vista, setVista] = useState<Vista>("mes");
  const [ritmo, setRitmo] = useState<Ritmo>("rapid");
  const [plataforma, setPlataforma] = useState<Plataforma>("lichess");
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

  const mes = datos?.vista === "mes" ? datos : null;

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="flex flex-col gap-1">
        <p className="text-sm font-medium text-accent">
          {mes ? nombreDelMes(mes.lichess.mes) : "Comunidad"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Ranking</h1>
        <p className="max-w-2xl text-sm text-mute">
          {vista === "mes"
            ? "Con el rating real de tu cuenta. Gana quien más sube en el mes, empiece donde empiece."
            : "El Elo interno de la comunidad, con las partidas entre miembros."}
        </p>
      </section>

      {!cargandoSesion && !usuario ? (
        <section className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-ink">Crea tu cuenta o inicia sesión para entrar al ranking.</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link to="/entrar" className="btn-ghost">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="btn">
              Crear cuenta
            </Link>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="segmento md:w-80">
          {(
            [
              { id: "mes", label: "Este mes" },
              { id: "elo", label: "Elo interno" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={vista === v.id}
              onClick={() => setVista(v.id)}
              className="segmento-boton"
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
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition ${
                ritmo === r.id
                  ? "bg-ink text-white"
                  : "bg-panel text-mute shadow-[0_2px_10px_rgb(21_29_72/0.05)] hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <Esqueleto tarda={tarda} />
      ) : error ? (
        <p className="card px-5 py-10 text-bad">{error}</p>
      ) : mes ? (
        <>
          <Resumen lichess={mes.lichess} chesscom={mes.chesscom} usuarioId={usuario?.id} />

          <div className="segmento lg:hidden">
            {PLATAFORMAS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={plataforma === p.id}
                onClick={() => setPlataforma(p.id)}
                className="segmento-boton"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {PLATAFORMAS.map((p) => (
              <div key={p.id} className={plataforma === p.id ? "" : "hidden lg:block"}>
                <TablaReal
                  titulo={p.label}
                  datos={p.id === "lichess" ? mes.lichess : mes.chesscom}
                  usuarioId={usuario?.id}
                />
              </div>
            ))}
          </div>
        </>
      ) : datos?.vista === "elo" ? (
        <TablaElo filas={datos.filas} usuarioId={usuario?.id} />
      ) : null}
    </div>
  );
}

function Esqueleto({ tarda }: { tarda: boolean }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-[20px] bg-panel" />
        ))}
      </div>
      <div className="card space-y-3 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-canvas" />
            <div className="h-4 flex-1 animate-pulse rounded-full bg-canvas" />
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-mute">
        Cargando ranking…
        {tarda ? " El servidor estaba dormido y está arrancando. Puede tardar cerca de un minuto." : null}
      </p>
    </div>
  );
}

function Tarjeta({
  fondo,
  icono,
  titulo,
  valor,
  detalle,
}: {
  fondo: string;
  icono: string;
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className={`rounded-[20px] p-4 ${fondo}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-full text-white ${icono}`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M5 15l5-5 4 4 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-3 truncate text-xl font-semibold tabular-nums text-ink">{valor}</p>
      <p className="text-sm font-medium text-ink/80">{titulo}</p>
      <p className="mt-0.5 truncate text-xs text-mute">{detalle}</p>
    </div>
  );
}

function Resumen({
  lichess,
  chesscom,
  usuarioId,
}: {
  lichess: RankingReal;
  chesscom: RankingReal;
  usuarioId?: number;
}) {
  const lider = (d: RankingReal) => d.filas[0];
  const jugadores = new Set([...lichess.filas, ...chesscom.filas].map((f) => f.usuario_id)).size;
  const mioL = lichess.filas.find((f) => f.usuario_id === usuarioId);
  const mioC = chesscom.filas.find((f) => f.usuario_id === usuarioId);
  const mio = [mioL ? `Lichess ${conSigno(mioL.subida)}` : null, mioC ? `Chess.com ${conSigno(mioC.subida)}` : null]
    .filter(Boolean)
    .join(" · ");
  const lichessLider = lider(lichess);
  const chesscomLider = lider(chesscom);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tarjeta
        fondo="bg-rosa"
        icono="bg-rosa-fuerte"
        titulo="Líder en Lichess"
        valor={lichessLider ? conSigno(lichessLider.subida) : "—"}
        detalle={lichessLider ? lichessLider.nombre : "Sin datos todavía"}
      />
      <Tarjeta
        fondo="bg-durazno"
        icono="bg-durazno-fuerte"
        titulo="Líder en Chess.com"
        valor={chesscomLider ? conSigno(chesscomLider.subida) : "—"}
        detalle={chesscomLider ? chesscomLider.nombre : "Sin datos todavía"}
      />
      <Tarjeta
        fondo="bg-menta"
        icono="bg-menta-fuerte"
        titulo="Jugadores"
        valor={String(jugadores)}
        detalle="En alguna de las dos tablas"
      />
      <Tarjeta
        fondo="bg-lila"
        icono="bg-lila-fuerte"
        titulo="Tu cambio"
        valor={mioL ? conSigno(mioL.subida) : mioC ? conSigno(mioC.subida) : "—"}
        detalle={mio || (usuarioId ? "Vincula una cuenta" : "Inicia sesión")}
      />
    </div>
  );
}

function TablaReal({
  titulo,
  datos,
  usuarioId,
}: {
  titulo: string;
  datos: RankingReal;
  usuarioId?: number;
}) {
  const maximo = Math.max(1, ...datos.filas.map((f) => Math.abs(f.subida)));
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between px-4 pt-4 pb-2 md:px-5">
        <h2 className="text-base font-semibold text-ink">{titulo}</h2>
        <span className="text-xs text-mute">{datos.filas.length} jugadores</span>
      </header>
      {datos.filas.length === 0 ? (
        <p className="px-4 pb-8 pt-4 text-sm text-mute md:px-5">
          Nadie con {titulo} tiene partidas en este ritmo todavía. La tabla se llena cuando cada uno abre la app con
          su cuenta vinculada.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {datos.filas.map((f) => (
            <FilaReal key={f.usuario_id} fila={f} maximo={maximo} mia={f.usuario_id === usuarioId} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FilaReal({ fila, maximo, mia }: { fila: RankingRealFila; maximo: number; mia: boolean }) {
  const ancho = `${Math.max(4, Math.round((Math.abs(fila.subida) / maximo) * 100))}%`;
  return (
    <li className={`flex items-center gap-3 px-4 py-3 md:px-5 ${mia ? "bg-accent-soft/50" : ""}`}>
      <Puesto n={fila.posicion} />
      <Avatar id={fila.usuario_id} nombre={fila.nombre} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {fila.nombre}
          {mia ? <span className="ml-1.5 text-xs font-medium text-accent">Tú</span> : null}
        </p>
        <p className="truncate text-xs text-mute">
          {fila.username}
          {fila.partidas !== null ? ` · ${fila.partidas} partidas` : null}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div
            className={`h-full rounded-full ${fila.subida >= 0 ? "bg-good" : "bg-bad"}`}
            style={{ width: fila.subida === 0 ? "0%" : ancho }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className={`inline-block rounded-lg px-2 py-0.5 text-sm font-semibold tabular-nums ${tonoCambio(fila.subida)}`}>
          {conSigno(fila.subida)}
        </span>
        <p className="mt-1 text-xs tabular-nums text-mute">
          {fila.elo_inicio} → <span className="font-medium text-ink">{fila.elo}</span>
        </p>
      </div>
    </li>
  );
}

function TablaElo({ filas, usuarioId }: { filas: RankingFila[]; usuarioId?: number }) {
  if (filas.length === 0) {
    return (
      <p className="card px-5 py-10 text-sm text-mute">
        Todavía no hay partidas entre miembros en este ritmo. Vincula tu cuenta y juega con alguien de la comunidad.
      </p>
    );
  }
  return (
    <section className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {filas.map((f) => {
          const mia = f.usuario_id === usuarioId;
          const cuentas = [f.lichess_username, f.chesscom_username].filter(Boolean).join(" · ");
          return (
            <li key={f.usuario_id} className={`flex items-center gap-3 px-4 py-3 md:px-5 ${mia ? "bg-accent-soft/50" : ""}`}>
              <Puesto n={f.posicion} />
              <Avatar id={f.usuario_id} nombre={f.nombre} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {f.nombre}
                  {mia ? <span className="ml-1.5 text-xs font-medium text-accent">Tú</span> : null}
                </p>
                <p className="truncate text-xs text-mute">{cuentas || "Sin cuenta vinculada"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold tabular-nums leading-none text-ink">{f.elo}</p>
                <p className="mt-1 text-xs text-mute">{f.partidas_jugadas} partidas</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
