import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Notificaciones } from "../components/Notificaciones";
import { Tablero } from "../components/Tablero";
import { api, HttpError } from "../lib/api";
import { jugar, sanDeVariante } from "../lib/analisis";
import type { Puzzle, ResumenSemanal } from "../lib/types";

export function Resumen() {
  const [resumen, setResumen] = useState<ResumenSemanal | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ResumenSemanal | null>("/analisis/resumen")
      .then(setResumen)
      .catch((e: unknown) => setError(e instanceof HttpError ? e.message : "No se pudo cargar el resumen"));
  }, []);

  if (error) return <p className="card p-5 text-bad">{error}</p>;
  if (resumen === undefined) return <p className="card p-5 text-mute">Cargando tu resumen…</p>;

  if (resumen === null) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Resumen semanal</h1>
        <p className="card p-5 text-sm text-mute">
          Todavía no tienes resumen. Cada lunes revisamos las partidas de tu semana en Lichess y Chess.com y te
          dejamos aquí lo más importante, con puzzles de tus propios errores.
        </p>
        <Notificaciones />
      </div>
    );
  }

  const d = resumen.datos;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-accent">
          Semana del {new Date(resumen.semana + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{resumen.titulo}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Dato fondo="bg-lila" valor={String(d.partidas)} titulo="Partidas" detalle={`${d.ganadas}G · ${d.tablas}T · ${d.perdidas}P`} />
        <Dato fondo="bg-menta" valor={d.precision !== null ? `${d.precision} %` : "—"} titulo="Precisión media" detalle="Como la de Lichess" />
        <Dato fondo="bg-rosa" valor={String(d.errores_graves)} titulo="Errores graves" detalle="En toda la semana" />
        <Dato fondo="bg-durazno" valor={String(d.apresuradas)} titulo="Errores por prisa" detalle="Con más de medio reloj" />
      </div>

      <section className="card p-4 sm:p-5">
        <ul className="space-y-2">
          {resumen.puntos.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-ink">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </section>

      {d.puzzles.length > 0 ? <Puzzles lista={d.puzzles} /> : null}

      <Link to="/partidas" className="btn-ghost w-full sm:w-auto">
        Ver y analizar tus partidas
      </Link>
    </div>
  );
}

function Dato({ fondo, valor, titulo, detalle }: { fondo: string; valor: string; titulo: string; detalle: string }) {
  return (
    <div className={`rounded-[20px] p-4 ${fondo}`}>
      <p className="text-xl font-semibold tabular-nums text-ink">{valor}</p>
      <p className="text-sm font-medium text-ink/80">{titulo}</p>
      <p className="mt-0.5 truncate text-xs text-mute">{detalle}</p>
    </div>
  );
}

function Puzzles({ lista }: { lista: Puzzle[] }) {
  const [indice, setIndice] = useState(0);
  const [estado, setEstado] = useState<"pensando" | "bien" | "mal" | "solucion">("pensando");
  const [fen, setFen] = useState(lista[0].fen);
  const puzzle = lista[indice];
  const orientacion = puzzle.fen.split(" ")[1] === "b" ? "black" : "white";
  const solucionSan = sanDeVariante(puzzle.fen, [puzzle.solucion], 1)[0] ?? puzzle.solucion;
  const tuyaSan = sanDeVariante(puzzle.fen, [puzzle.jugada], 1)[0] ?? puzzle.jugada;

  function ir(n: number) {
    setIndice(n);
    setFen(lista[n].fen);
    setEstado("pensando");
  }

  function alMover(desde: string, hasta: string) {
    const m = jugar(fen, desde, hasta);
    if (!m) return;
    setFen(m.fenDespues);
    setEstado(m.uci.slice(0, 4) === puzzle.solucion.slice(0, 4) ? "bien" : "mal");
  }

  return (
    <section className="card space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Puzzles de tus errores</h2>
        <span className="text-xs text-mute">
          {indice + 1} de {lista.length}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
        <Tablero
          fen={fen}
          orientacion={orientacion}
          alMover={estado === "pensando" ? alMover : undefined}
          flechas={
            estado === "solucion" || estado === "bien"
              ? [{ desde: puzzle.solucion.slice(0, 2), hasta: puzzle.solucion.slice(2, 4), color: "green" }]
              : []
          }
        />
        <div className="space-y-3 text-sm">
          <p className="text-ink">
            Juegan las {orientacion === "white" ? "blancas" : "negras"}. En la partida jugaste{" "}
            <span className="font-semibold">{tuyaSan}</span> y perdiste ventaja. ¿Qué era mejor?
          </p>
          {estado === "bien" ? <p className="font-semibold text-good">¡Exacto! {solucionSan} era la mejor.</p> : null}
          {estado === "mal" ? <p className="font-semibold text-bad">No es esa. Inténtalo otra vez.</p> : null}
          {estado === "solucion" ? <p className="font-semibold text-ink">La mejor era {solucionSan}.</p> : null}
          <div className="flex flex-wrap gap-2">
            {estado === "mal" ? (
              <button type="button" className="btn-ghost" onClick={() => ir(indice)}>
                Reintentar
              </button>
            ) : null}
            {estado !== "bien" && estado !== "solucion" ? (
              <button type="button" className="btn-ghost" onClick={() => setEstado("solucion")}>
                Ver solución
              </button>
            ) : null}
            {indice + 1 < lista.length ? (
              <button type="button" className="btn" onClick={() => ir(indice + 1)}>
                Siguiente puzzle
              </button>
            ) : null}
          </div>
          {puzzle.url ? (
            <a href={puzzle.url} target="_blank" rel="noreferrer" className="inline-block text-xs font-medium text-accent underline">
              Ver la partida original
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
