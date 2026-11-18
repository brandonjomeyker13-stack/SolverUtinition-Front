import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { BarraEval, GraficaEval } from "../components/BarraEval";
import { Insignia, META } from "../components/Insignia";
import { Tablero, type Flecha } from "../components/Tablero";
import { HttpError } from "../lib/api";
import {
  CATEGORIAS,
  categoria,
  evaluacionFinal,
  evaluarJugadas,
  jugar,
  leerPartida,
  sanDeVariante,
  textoEvaluacion,
  totales,
  type Categoria,
  type DatosJugada,
  type Evaluacion,
  type Mov,
} from "../lib/analisis";
import { explicar } from "../lib/explicaciones";
import { Motor, type Linea } from "../lib/motor";
import {
  analisisGuardado,
  buscarPartida,
  guardarAnalisis,
  partidasGenerales,
  RITMOS_GENERALES,
} from "../lib/partidasGenerales";
import type { PartidaGeneral, Plataforma } from "../lib/types";

const PROFUNDIDAD_PARTIDA = 12;
const PROFUNDIDAD_VIVO = 18;

const MALAS: Categoria[] = ["imprecision", "error", "oportunidad", "error_grave"];

type Variante = { base: number; movs: Mov[] };

function prefijoComun(a: Mov[], b: Mov[]) {
  let i = 0;
  while (i < a.length && i < b.length && a[i].uci === b[i].uci) i++;
  return i;
}

export function Analisis() {
  const { plataforma, id } = useParams<{ plataforma: Plataforma; id: string }>();
  const location = useLocation();
  const desdeLista = (location.state as { partida?: PartidaGeneral } | null)?.partida;

  const [partida, setPartida] = useState<PartidaGeneral | null>(desdeLista ?? null);
  const [error, setError] = useState<string | null>(null);
  const [evals, setEvals] = useState<(Evaluacion | null)[]>([]);
  const [mejores, setMejores] = useState<(string | null)[]>([]);
  const [segundas, setSegundas] = useState<(Evaluacion | null)[]>([]);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [variante, setVariante] = useState<Variante | null>(null);
  const [cursor, setCursor] = useState(0);
  const [orientacion, setOrientacion] = useState<"white" | "black">("white");
  const [motorEncendido, setMotorEncendido] = useState(true);
  const [vivo, setVivo] = useState<{ fen: string; lineas: Linea[] } | null>(null);
  const motor = useRef<Motor | null>(null);
  const cancelado = useRef(false);

  useEffect(() => {
    motor.current = new Motor();
    cancelado.current = false;
    return () => {
      cancelado.current = true;
      motor.current?.cerrar();
      motor.current = null;
    };
  }, []);

  useEffect(() => {
    if (partida || !plataforma || !id) return;
    buscarPartida(plataforma, id)
      .then((p) => (p ? setPartida(p) : setError("No encontramos esa partida en tus últimas partidas.")))
      .catch((e: unknown) => setError(e instanceof HttpError ? e.message : "No se pudo cargar la partida"));
  }, [partida, plataforma, id]);

  useEffect(() => {
    if (!partida || partida.plataforma !== "chesscom" || partida.precision_oficial !== undefined) return;
    partidasGenerales("chesscom")
      .then((lista) => {
        const fresca = lista.find((p) => p.id === partida.id);
        setPartida((actual) => (actual ? { ...actual, precision_oficial: fresca?.precision_oficial ?? null } : actual));
      })
      .catch(() => {});
  }, [partida]);

  const pgn = partida?.pgn;
  const base = useMemo(() => {
    if (!pgn) return null;
    try {
      return leerPartida(pgn);
    } catch {
      return null;
    }
  }, [pgn]);

  // Solo al cambiar de partida: actualizar datos sueltos de la misma no debe borrar el análisis.
  const plataformaPartida = partida?.plataforma;
  const idPartida = partida?.id;
  const colorPartida = partida?.color;
  useEffect(() => {
    if (!plataformaPartida || !idPartida || !colorPartida || !base) return;
    setOrientacion(colorPartida);
    setEvals(Array(base.movs.length + 1).fill(null));
    setMejores(Array(base.movs.length + 1).fill(null));
    setSegundas(Array(base.movs.length + 1).fill(null));
    setCursor(0);
    setVariante(null);
    analisisGuardado(plataformaPartida, idPartida)
      .then((a) => {
        if (a.evals.length !== base.movs.length) return;
        setEvals([a.eval_inicial, ...a.evals]);
        setMejores([...a.mejores, null]);
        if (a.segundas?.length === base.movs.length) setSegundas([...a.segundas, null]);
      })
      .catch(() => {});
  }, [plataformaPartida, idPartida, colorPartida, base]);

  const movs = base?.movs ?? [];
  const linea = useMemo(
    () => (variante ? movs.slice(0, variante.base).concat(variante.movs) : movs),
    [movs, variante],
  );
  const fen = cursor === 0 ? base?.inicial ?? "" : linea[cursor - 1]?.fenDespues ?? "";
  const enPrincipal = !variante || cursor <= variante.base;
  const completo = evals.length > 0 && evals.every((e) => e !== null);
  const blancasEmpiezan = (base?.inicial.split(" ")[1] ?? "w") === "w";
  const jugadas = useMemo(
    () => (completo ? evaluarJugadas(evals[0]!, evals.slice(1) as Evaluacion[], blancasEmpiezan) : null),
    [completo, evals, blancasEmpiezan],
  );
  const clasificadas = useMemo(() => {
    if (!completo) return null;
    return movs.map((mov, k) => {
      const datos: DatosJugada = {
        mov,
        ply: k,
        blancas: (k % 2 === 0) === blancasEmpiezan,
        antes: evals[k]!,
        despues: evals[k + 1]!,
        mejor: mejores[k] ?? null,
        segunda: segundas[k] ?? null,
        respuesta: mejores[k + 1] ?? null,
        previa: k > 0 ? evals[k - 1] : null,
        movPrevio: k > 0 ? movs[k - 1] : null,
      };
      const cat = categoria(datos);
      return { datos, categoria: cat };
    });
  }, [completo, movs, evals, mejores, segundas, blancasEmpiezan]);

  useEffect(() => {
    if (!motorEncendido || progreso !== null || !fen || !motor.current) return;
    if (evaluacionFinal(fen)) {
      setVivo(null);
      return;
    }
    const id = window.setTimeout(() => {
      void motor.current?.analizar(fen, {
        profundidad: PROFUNDIDAD_VIVO,
        multipv: 3,
        alInfo: (lineas) => setVivo({ fen, lineas }),
      });
    }, 120);
    return () => window.clearTimeout(id);
  }, [fen, motorEncendido, progreso]);

  useEffect(() => {
    if (!motorEncendido) motor.current?.detener();
  }, [motorEncendido]);

  const lineasVivas = vivo && vivo.fen === fen ? vivo.lineas : [];
  const evalFinal = fen ? evaluacionFinal(fen) : null;
  const evalActual: Evaluacion | null =
    evalFinal ??
    (lineasVivas[0] && lineasVivas[0].profundidad >= 8 ? lineasVivas[0].evaluacion : null) ??
    (enPrincipal ? evals[cursor] ?? null : null) ??
    lineasVivas[0]?.evaluacion ??
    null;

  const irA = useCallback((n: number) => setCursor(Math.max(0, Math.min(linea.length, n))), [linea.length]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") irA(cursor - 1);
      else if (e.key === "ArrowRight") irA(cursor + 1);
      else if (e.key === "Home") irA(0);
      else if (e.key === "End") irA(linea.length);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [cursor, irA, linea.length]);

  function agregarJugada(nueva: Mov, en: number) {
    const nuevaLinea = linea.slice(0, en).concat(nueva);
    const comun = prefijoComun(nuevaLinea, movs);
    setVariante(comun === nuevaLinea.length ? null : { base: comun, movs: nuevaLinea.slice(comun) });
    setCursor(en + 1);
  }

  function alMover(desde: string, hasta: string) {
    const nueva = jugar(fen, desde, hasta);
    if (nueva) agregarJugada(nueva, cursor);
  }

  function probarUci(fenOrigen: string, uci: string, en: number) {
    const nueva = jugar(fenOrigen, uci.slice(0, 2), uci.slice(2, 4));
    if (nueva) agregarJugada(nueva, en);
  }

  async function analizarPartida() {
    if (!partida || !base || !motor.current) return;
    const posiciones = [base.inicial, ...base.movs.map((m) => m.fenDespues)];
    const nuevasEvals: (Evaluacion | null)[] = [...evals];
    const nuevasMejores: (string | null)[] = [...mejores];
    const nuevasSegundas: (Evaluacion | null)[] = [...segundas];
    setAviso(null);
    setProgreso(0);
    for (let i = 0; i < posiciones.length; i++) {
      if (cancelado.current) return;
      const final = evaluacionFinal(posiciones[i]);
      if (final) {
        nuevasEvals[i] = final;
        nuevasMejores[i] = null;
        nuevasSegundas[i] = null;
      } else {
        const r = await motor.current.analizar(posiciones[i], {
          profundidad: PROFUNDIDAD_PARTIDA,
          multipv: 2,
          msMaximo: 1200,
        });
        if (cancelado.current) return;
        if (!r || !r[0]) {
          setProgreso(null);
          setAviso("El análisis se interrumpió. Vuelve a intentarlo.");
          return;
        }
        nuevasEvals[i] = r[0].evaluacion;
        nuevasMejores[i] = r[0].pv[0] ?? null;
        nuevasSegundas[i] = r[1]?.evaluacion ?? null;
      }
      setEvals([...nuevasEvals]);
      setMejores([...nuevasMejores]);
      setSegundas([...nuevasSegundas]);
      setProgreso((i + 1) / posiciones.length);
    }
    setProgreso(null);
    try {
      await guardarAnalisis(
        partida,
        nuevasEvals[0]!,
        nuevasEvals.slice(1) as Evaluacion[],
        nuevasMejores.slice(0, base.movs.length),
        nuevasSegundas.slice(0, base.movs.length),
      );
      setPartida({ ...partida, analizada: true });
    } catch (e) {
      setAviso(
        e instanceof HttpError
          ? `El análisis está listo pero no se guardó: ${e.message}`
          : "El análisis está listo pero no se guardó.",
      );
    }
  }

  if (error) {
    return (
      <div className="card space-y-3 p-5">
        <p className="text-bad">{error}</p>
        <Link to="/partidas" className="btn-ghost">
          Volver a tus partidas
        </Link>
      </div>
    );
  }
  if (!partida || !base) {
    return <p className="card p-5 text-mute">Cargando la partida…</p>;
  }

  const ultima = cursor > 0 ? linea[cursor - 1] : null;
  const actual = enPrincipal && clasificadas && cursor > 0 ? clasificadas[cursor - 1] : null;
  const refutacion =
    actual && ultima && vivo?.fen === ultima.fenDespues && (lineasVivas[0]?.profundidad ?? 0) >= 14
      ? lineasVivas[0].pv
      : null;
  const explicacion = actual ? explicar(actual.datos, actual.categoria, refutacion) : null;
  const mejorPrevia = actual && MALAS.includes(actual.categoria) ? mejores[cursor - 1] : null;
  const sanMejorPrevia =
    ultima && mejorPrevia && mejorPrevia !== ultima.uci ? sanDeVariante(ultima.fenAntes, [mejorPrevia], 1)[0] : null;

  const flechas: Flecha[] = [];
  if (lineasVivas[0]?.pv[0]) {
    const uci = lineasVivas[0].pv[0];
    flechas.push({ desde: uci.slice(0, 2), hasta: uci.slice(2, 4), color: "green" });
  }

  const oficial = partida.precision_oficial ?? null;
  const tuyo = jugadas ? totales(jugadas, partida.color === "white") : null;
  const rival = jugadas ? totales(jugadas, partida.color !== "white") : null;
  const yo = partida.color === "white" ? partida.blancas : partida.negras;
  const otro = partida.color === "white" ? partida.negras : partida.blancas;
  const arriba = orientacion === partida.color ? otro : yo;
  const abajo = orientacion === partida.color ? yo : otro;

  return (
    <div className="space-y-3 lg:-my-3 lg:flex lg:h-[calc(100dvh-3rem)] lg:flex-col">
      <div className="flex items-center gap-3">
        <Link
          to="/partidas"
          aria-label="Volver a tus partidas"
          title="Volver a tus partidas"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-panel text-accent ring-1 ring-line hover:bg-canvas"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
            {partida.blancas.nombre} vs {partida.negras.nombre}
          </h1>
          <p className="truncate text-xs text-mute">
            {RITMOS_GENERALES[partida.ritmo] ?? partida.ritmo} · {partida.control}
            {partida.apertura ? ` · ${partida.apertura}` : ""}
          </p>
        </div>
        <a href={partida.url} target="_blank" rel="noreferrer" className="btn-ghost shrink-0 px-3 text-xs">
          {partida.plataforma === "lichess" ? "Abrir en Lichess" : "Abrir en Chess.com"}
        </a>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[auto_minmax(320px,1fr)]">
        <div className="mx-auto w-full space-y-1.5 lg:w-[max(300px,min(640px,calc(100dvh_-_12.5rem)))]">
          <Jugador nombre={arriba.nombre} elo={arriba.elo} />
          <div className="flex items-stretch gap-2">
            <BarraEval evaluacion={evalActual} orientacion={orientacion} />
            <div className="min-w-0 flex-1">
              <Tablero
                fen={fen}
                orientacion={orientacion}
                ultima={ultima ? [ultima.desde, ultima.hasta] : undefined}
                flechas={flechas}
                alMover={progreso === null ? alMover : undefined}
                insignia={
                  actual && ultima
                    ? { casilla: ultima.hasta, contenido: <Insignia categoria={actual.categoria} /> }
                    : undefined
                }
              />
            </div>
          </div>
          <Jugador nombre={abajo.nombre} elo={abajo.elo} />

          <div className="card flex items-center justify-between gap-1 p-1">
            <Boton etiqueta="Inicio" onClick={() => irA(0)} d="M6 5v14M18 6l-8 6 8 6V6Z" />
            <Boton etiqueta="Anterior" onClick={() => irA(cursor - 1)} d="M15 6l-6 6 6 6" />
            <Boton etiqueta="Siguiente" onClick={() => irA(cursor + 1)} d="M9 6l6 6-6 6" />
            <Boton etiqueta="Final" onClick={() => irA(linea.length)} d="M18 5v14M6 6l8 6-8 6V6Z" />
            <Boton
              etiqueta="Girar tablero"
              onClick={() => setOrientacion(orientacion === "white" ? "black" : "white")}
              d="M7 7h11l-3-3M17 17H6l3 3"
            />
          </div>
        </div>

        <div className="space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <section className="card space-y-3 p-3">
            {jugadas && tuyo && rival && clasificadas ? null : progreso !== null ? (
              <div>
                <p className="text-sm font-medium text-ink">Analizando la partida… {Math.round(progreso * 100)} %</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progreso * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-mute">Corre en tu dispositivo con Stockfish. No cierres esta página.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-mute">
                  {oficial ? (
                    <p className="mb-0.5 font-medium text-ink">
                      Precisión en Chess.com: tú {oficial[partida.color]} % · {otro.nombre}{" "}
                      {oficial[partida.color === "white" ? "black" : "white"]} %
                    </p>
                  ) : null}
                  <p>Revisa toda la partida para ver tu precisión y por qué cada jugada es buena o mala.</p>
                </div>
                <button type="button" className="btn shrink-0" onClick={() => void analizarPartida()}>
                  Analizar partida
                </button>
              </div>
            )}
            {aviso ? <p className="text-sm text-bad">{aviso}</p> : null}
            {actual && ultima ? (
              <div className="flex items-start gap-3 text-sm">
                <Insignia categoria={actual.categoria} />
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: META[actual.categoria].color }}>
                    {ultima.san} es {META[actual.categoria].nombre.toLowerCase()}
                  </p>
                  {explicacion ? <p className="mt-0.5 text-ink/80">{explicacion}</p> : null}
                  {sanMejorPrevia && mejorPrevia ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-medium text-accent underline"
                      onClick={() => probarUci(ultima.fenAntes, mejorPrevia, cursor - 1)}
                    >
                      Probar {sanMejorPrevia}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : jugadas ? (
              <p className="text-sm text-mute">Avanza por las jugadas para ver por qué cada una es buena o mala.</p>
            ) : null}
          </section>
          <section className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Motor</h2>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-mute">
                <input
                  type="checkbox"
                  checked={motorEncendido}
                  onChange={(e) => setMotorEncendido(e.target.checked)}
                  className="h-4 w-4 accent-[#5d5fef]"
                />
                Stockfish 19
              </label>
            </div>
            {!motorEncendido ? (
              <p className="text-xs text-mute">Apagado.</p>
            ) : evalFinal ? (
              <p className="text-xs text-mute">Fin de la partida.</p>
            ) : lineasVivas.length === 0 ? (
              <p className="text-xs text-mute">{progreso !== null ? "Ocupado analizando la partida…" : "Pensando…"}</p>
            ) : (
              <ul className="space-y-1.5">
                {lineasVivas.map((l) => (
                  <li key={l.multipv}>
                    <button
                      type="button"
                      onClick={() => l.pv[0] && probarUci(fen, l.pv[0], cursor)}
                      className="flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-sm hover:bg-canvas"
                    >
                      <span
                        className={`w-14 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums ${
                          (l.evaluacion.mate ?? l.evaluacion.cp ?? 0) >= 0 ? "bg-white text-ink ring-1 ring-line" : "bg-[#403d39] text-white"
                        }`}
                      >
                        {textoEvaluacion(l.evaluacion)}
                      </span>
                      <span className="min-w-0 truncate text-ink/80">{sanDeVariante(fen, l.pv).join(" ")}</span>
                    </button>
                  </li>
                ))}
                <li className="px-1 text-[11px] text-mute">Profundidad {lineasVivas[0]?.profundidad}</li>
              </ul>
            )}
          </section>

          <section className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Jugadas</h2>
              {variante ? (
                <button
                  type="button"
                  className="text-xs font-medium text-accent underline"
                  onClick={() => {
                    setCursor(Math.min(cursor, variante.base));
                    setVariante(null);
                  }}
                >
                  Volver a la partida
                </button>
              ) : null}
            </div>
            <ListaJugadas
              movs={movs}
              categorias={clasificadas?.map((c) => c.categoria) ?? null}
              actual={enPrincipal ? cursor : -1}
              blancasEmpiezan={blancasEmpiezan}
              alElegir={(n) => {
                setVariante(null);
                setCursor(n);
              }}
            />
            {variante ? (
              <div className="mt-3 rounded-xl bg-accent-soft/60 p-2 text-sm">
                <p className="mb-1 text-xs font-medium text-accent">Tu variante</p>
                <div className="flex flex-wrap gap-1">
                  {variante.movs.map((m, i) => {
                    const n = variante.base + i + 1;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCursor(n)}
                        className={`rounded-md px-1.5 py-0.5 ${cursor === n ? "bg-accent text-white" : "text-ink hover:bg-white"}`}
                      >
                        {m.san}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          {completo ? (
            <GraficaEval
              evals={evals}
              actual={enPrincipal ? cursor : variante?.base ?? 0}
              alElegir={(n) => {
                setVariante(null);
                setCursor(n);
              }}
            />
          ) : null}

          {jugadas && tuyo && rival && clasificadas ? (
            <section className="card space-y-3 p-3">
              <div className="grid grid-cols-2 gap-3">
                <Precision
                  titulo="Tú"
                  valor={oficial ? oficial[partida.color] : tuyo.precision}
                  propia={oficial ? tuyo.precision : null}
                  destacado
                />
                <Precision
                  titulo={otro.nombre}
                  valor={oficial ? oficial[partida.color === "white" ? "black" : "white"] : rival.precision}
                  propia={oficial ? rival.precision : null}
                />
              </div>
              <p className="text-[11px] text-mute">
                {oficial
                  ? "Precisión oficial de Chess.com (de su Game Review). Debajo, la que calculamos con nuestro motor."
                  : "Precisión calculada con nuestro motor. Si abres el Game Review en Chess.com, aquí verás la oficial."}
              </p>
              <Conteo clasificadas={clasificadas} tuyas={partida.color === "white"} rival={otro.nombre} />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Jugador({ nombre, elo }: { nombre: string; elo: number | null }) {
  return (
    <p className="flex items-center gap-2 px-1 text-sm">
      <span className="font-semibold text-ink">{nombre}</span>
      {elo ? <span className="text-mute">({elo})</span> : null}
    </p>
  );
}

function Boton({ etiqueta, onClick, d }: { etiqueta: string; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="grid min-h-11 flex-1 place-items-center rounded-xl text-ink hover:bg-canvas"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d={d} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Precision({
  titulo,
  valor,
  propia,
  destacado = false,
}: {
  titulo: string;
  valor: number | null;
  /** La nuestra, cuando la principal es la oficial de Chess.com. */
  propia: number | null;
  destacado?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-3 ${destacado ? "bg-accent-soft" : "bg-canvas"}`}>
      <p className="truncate text-xs text-mute">{titulo}</p>
      <p className={`text-2xl font-semibold tabular-nums ${destacado ? "text-accent" : "text-ink"}`}>
        {valor ?? "—"}
        <span className="text-sm font-medium"> %</span>
      </p>
      <p className="text-[11px] text-mute">
        {propia !== null ? `Precisión · nuestra: ${propia} %` : "Precisión"}
      </p>
    </div>
  );
}

function Conteo({
  clasificadas,
  tuyas,
  rival,
}: {
  clasificadas: { datos: DatosJugada; categoria: Categoria }[];
  tuyas: boolean;
  rival: string;
}) {
  const contar = (blancas: boolean, cat: Categoria) =>
    clasificadas.filter((c) => c.datos.blancas === blancas && c.categoria === cat).length;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] text-mute">
          <th className="pb-1 text-left font-medium">Jugadas</th>
          <th className="w-16 pb-1 text-center font-medium">Tú</th>
          <th className="w-16 pb-1 text-center font-medium" title={rival}>
            Rival
          </th>
        </tr>
      </thead>
      <tbody>
        {CATEGORIAS.map((cat) => (
          <tr key={cat}>
            <td className="py-0.5">
              <span className="flex items-center gap-2">
                <Insignia categoria={cat} tamano="sm" />
                <span className="text-ink/80">{META[cat].nombre}</span>
              </span>
            </td>
            <td className="text-center font-semibold tabular-nums" style={{ color: META[cat].color }}>
              {contar(tuyas, cat)}
            </td>
            <td className="text-center font-semibold tabular-nums" style={{ color: META[cat].color }}>
              {contar(!tuyas, cat)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ListaJugadas({
  movs,
  categorias,
  actual,
  blancasEmpiezan,
  alElegir,
}: {
  movs: Mov[];
  categorias: Categoria[] | null;
  actual: number;
  blancasEmpiezan: boolean;
  alElegir: (n: number) => void;
}) {
  const desfase = blancasEmpiezan ? 0 : 1;
  const filas: { numero: number; indices: (number | null)[] }[] = [];
  for (let i = -desfase; i < movs.length; i += 2) {
    filas.push({
      numero: filas.length + 1,
      indices: [i >= 0 ? i : null, i + 1 < movs.length ? i + 1 : null],
    });
  }
  return (
    <ol className="grid max-h-72 grid-cols-[auto_1fr_1fr] gap-x-1 overflow-y-auto text-sm lg:max-h-96">
      {filas.map((f) => (
        <li key={f.numero} className="contents">
          <span className="py-1 pr-1 text-right text-xs tabular-nums text-mute">{f.numero}.</span>
          {f.indices.map((i, k) =>
            i === null ? (
              <span key={k} />
            ) : (
              <button
                key={k}
                type="button"
                onClick={() => alElegir(i + 1)}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-left ${actual === i + 1 ? "bg-accent text-white" : "text-ink hover:bg-canvas"}`}
              >
                {categorias?.[i] && categorias[i] !== "buena" && categorias[i] !== "excelente" ? (
                  <Insignia categoria={categorias[i]} tamano="sm" />
                ) : null}
                {movs[i].san}
              </button>
            ),
          )}
        </li>
      ))}
    </ol>
  );
}
