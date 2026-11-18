import { Chess, type Move } from "chess.js";

/** Desde las blancas. Las mismas fórmulas que `app/analisis/metricas.py` del backend. */
export type Evaluacion = { cp?: number | null; mate?: number | null };

export type Clase = "error_grave" | "error" | "imprecision" | null;

export const CP_MATE = 10000;

export function centipeones(e: Evaluacion): number {
  if (e.mate !== undefined && e.mate !== null) return e.mate > 0 ? CP_MATE : -CP_MATE;
  return e.cp ?? 0;
}

export function porcentajeVictoria(cp: number): number {
  const c = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

function precisionJugada(antes: number, despues: number) {
  const caida = Math.max(0, antes - despues);
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * caida) - 3.1669 + 1));
}

export function clase(caida: number): Clase {
  if (caida >= 15) return "error_grave";
  if (caida >= 10) return "error";
  if (caida >= 5) return "imprecision";
  return null;
}

export type JugadaEvaluada = { blancas: boolean; caida: number; clase: Clase; precision: number };

export function evaluarJugadas(inicial: Evaluacion, evals: Evaluacion[], blancasEmpiezan = true): JugadaEvaluada[] {
  let previo = porcentajeVictoria(centipeones(inicial));
  return evals.map((e, i) => {
    const blancas = (i % 2 === 0) === blancasEmpiezan;
    const actual = porcentajeVictoria(centipeones(e));
    const [antes, despues] = blancas ? [previo, actual] : [100 - previo, 100 - actual];
    const caida = Math.max(0, antes - despues);
    previo = actual;
    return { blancas, caida, clase: clase(caida), precision: precisionJugada(antes, despues) };
  });
}

export function totales(jugadas: JugadaEvaluada[], blancas: boolean) {
  const mias = jugadas.filter((j) => j.blancas === blancas);
  const precision = mias.length ? mias.reduce((s, j) => s + j.precision, 0) / mias.length : null;
  return {
    precision: precision === null ? null : Math.round(precision * 10) / 10,
    imprecisiones: mias.filter((j) => j.clase === "imprecision").length,
    errores: mias.filter((j) => j.clase === "error").length,
    errores_graves: mias.filter((j) => j.clase === "error_grave").length,
  };
}

export function textoEvaluacion(e: Evaluacion): string {
  if (e.mate !== undefined && e.mate !== null) return e.mate === 0 ? "#" : `M${Math.abs(e.mate)}`;
  const p = (e.cp ?? 0) / 100;
  return `${p > 0 ? "+" : ""}${p.toFixed(1)}`;
}

/** Fin de partida sin preguntarle al motor: mate o tablas. */
export function evaluacionFinal(fen: string): Evaluacion | null {
  const juego = new Chess(fen);
  if (juego.isCheckmate()) return { cp: juego.turn() === "w" ? -CP_MATE : CP_MATE };
  if (juego.isGameOver()) return { cp: 0 };
  return null;
}

export type Mov = { san: string; uci: string; desde: string; hasta: string; fenAntes: string; fenDespues: string };

export function movDesde(m: Move): Mov {
  return {
    san: m.san,
    uci: m.from + m.to + (m.promotion ?? ""),
    desde: m.from,
    hasta: m.to,
    fenAntes: m.before,
    fenDespues: m.after,
  };
}

export function leerPartida(pgn: string): { inicial: string; movs: Mov[] } {
  const juego = new Chess();
  juego.loadPgn(pgn);
  const movs = juego.history({ verbose: true }).map(movDesde);
  return { inicial: movs[0]?.fenAntes ?? juego.fen(), movs };
}

/** Las primeras jugadas de una variante del motor en notación normal. */
export function sanDeVariante(fen: string, pv: string[], maximo = 8): string[] {
  const juego = new Chess(fen);
  const salida: string[] = [];
  for (const uci of pv.slice(0, maximo)) {
    try {
      const m = juego.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      salida.push(m.san);
    } catch {
      break;
    }
  }
  return salida;
}

export function jugadasLegales(fen: string): Map<string, string[]> {
  const juego = new Chess(fen);
  const destinos = new Map<string, string[]>();
  for (const m of juego.moves({ verbose: true })) {
    const lista = destinos.get(m.from) ?? [];
    lista.push(m.to);
    destinos.set(m.from, lista);
  }
  return destinos;
}

export function jugar(fen: string, desde: string, hasta: string): Mov | null {
  const juego = new Chess(fen);
  try {
    return movDesde(juego.move({ from: desde, to: hasta, promotion: "q" }));
  } catch {
    return null;
  }
}
