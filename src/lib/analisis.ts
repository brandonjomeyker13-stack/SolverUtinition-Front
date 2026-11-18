import { Chess, type Move, type Square } from "chess.js";

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
  if (caida >= 20) return "error_grave";
  if (caida >= 10) return "error";
  if (caida >= 5) return "imprecision";
  return null;
}

/** `peso`: cuánto se movía la partida alrededor de la jugada; las posiciones agitadas pesan más. */
export type JugadaEvaluada = { blancas: boolean; caida: number; clase: Clase; precision: number; peso: number };

function desviacion(valores: number[]) {
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  return Math.sqrt(valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length);
}

function pesos(porcentajes: number[], jugadasTotales: number) {
  const ventana = Math.max(2, Math.min(8, Math.floor(jugadasTotales / 10)));
  const deslizantes =
    porcentajes.length <= ventana
      ? [porcentajes]
      : porcentajes.slice(0, porcentajes.length - ventana + 1).map((_, i) => porcentajes.slice(i, i + ventana));
  const relleno = Array(Math.max(0, Math.min(ventana, porcentajes.length) - 2)).fill(porcentajes.slice(0, ventana));
  return [...relleno, ...deslizantes].map((v) => Math.max(0.5, Math.min(12, desviacion(v))));
}

export function evaluarJugadas(inicial: Evaluacion, evals: Evaluacion[], blancasEmpiezan = true): JugadaEvaluada[] {
  const porcentajes = [inicial, ...evals].map((e) => porcentajeVictoria(centipeones(e)));
  const listaPesos = pesos(porcentajes, evals.length);
  return evals.map((_, i) => {
    const blancas = (i % 2 === 0) === blancasEmpiezan;
    const [previo, actual] = [porcentajes[i], porcentajes[i + 1]];
    const [antes, despues] = blancas ? [previo, actual] : [100 - previo, 100 - actual];
    const caida = Math.max(0, antes - despues);
    const peso = listaPesos[i] ?? listaPesos[listaPesos.length - 1];
    return { blancas, caida, clase: clase(caida), precision: precisionJugada(antes, despues), peso };
  });
}

/** Como Lichess: media ponderada y media armónica a partes iguales, así un error grave pesa mucho. */
function precisionPartida(mias: JugadaEvaluada[]): number | null {
  if (mias.length === 0) return null;
  const ponderada = mias.reduce((s, j) => s + j.precision * j.peso, 0) / mias.reduce((s, j) => s + j.peso, 0);
  const armonica = mias.length / mias.reduce((s, j) => s + 1 / Math.max(1, j.precision), 0);
  return Math.round(((ponderada + armonica) / 2) * 10) / 10;
}

export function totales(jugadas: JugadaEvaluada[], blancas: boolean) {
  const mias = jugadas.filter((j) => j.blancas === blancas);
  return {
    precision: precisionPartida(mias),
    imprecisiones: mias.filter((j) => j.clase === "imprecision").length,
    errores: mias.filter((j) => j.clase === "error").length,
    errores_graves: mias.filter((j) => j.clase === "error_grave").length,
  };
}

/** Como en el informe de Chess.com, de mejor a peor. */
export type Categoria =
  | "brillante"
  | "genial"
  | "mejor"
  | "excelente"
  | "buena"
  | "teoria"
  | "imprecision"
  | "error"
  | "oportunidad"
  | "error_grave";

export const CATEGORIAS: Categoria[] = [
  "brillante",
  "genial",
  "mejor",
  "excelente",
  "buena",
  "teoria",
  "imprecision",
  "error",
  "oportunidad",
  "error_grave",
];

/** Lo que hace falta saber de una jugada para clasificarla y explicarla. */
export type DatosJugada = {
  mov: Mov;
  /** Medio movimiento desde el inicio, empezando en 0. */
  ply: number;
  blancas: boolean;
  antes: Evaluacion;
  despues: Evaluacion;
  /** Mejor jugada en la posición antes de mover. */
  mejor: string | null;
  /** Evaluación de la segunda mejor jugada en esa posición. */
  segunda: Evaluacion | null;
  /** Mejor respuesta del rival después de la jugada. */
  respuesta: string | null;
  /** Evaluación antes de la jugada anterior del rival. */
  previa: Evaluacion | null;
  movPrevio: Mov | null;
};

const VALOR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Probabilidad de ganar (0-100) para quien mueve. */
export function ganar(e: Evaluacion, blancas: boolean) {
  const p = porcentajeVictoria(centipeones(e));
  return blancas ? p : 100 - p;
}

/** Deja una pieza de valor donde el rival la puede tomar y no la recupera igual. */
export function esSacrificio(mov: Mov): boolean {
  const juego = new Chess(mov.fenDespues);
  const pieza = juego.get(mov.hasta as Square);
  if (!pieza || VALOR[pieza.type] < 3) return false;
  const capturada = new Chess(mov.fenAntes).get(mov.hasta as Square);
  if (VALOR[pieza.type] - (capturada ? VALOR[capturada.type] : 0) < 2) return false;
  const rival = pieza.color === "w" ? "b" : "w";
  const atacantes = juego.attackers(mov.hasta as Square, rival);
  if (atacantes.length === 0) return false;
  const defensores = juego.attackers(mov.hasta as Square, pieza.color);
  const menor = Math.min(...atacantes.map((c) => VALOR[juego.get(c)?.type ?? "k"] || 100));
  return defensores.length === 0 || menor < VALOR[pieza.type];
}

function esRecaptura(d: DatosJugada) {
  return Boolean(d.movPrevio && d.movPrevio.hasta === d.mov.hasta && d.mov.san.includes("x") && d.movPrevio.san.includes("x"));
}

export function categoria(d: DatosJugada): Categoria {
  const antes = ganar(d.antes, d.blancas);
  const despues = ganar(d.despues, d.blancas);
  const caida = Math.max(0, antes - despues);
  const esMejor = d.mejor === d.mov.uci || caida < 0.5;

  if (d.ply < 10 && caida < 2) return "teoria";
  if (caida < 2 && despues >= 50 && antes < 90 && esSacrificio(d.mov)) return "brillante";
  if (esMejor && d.segunda && antes - ganar(d.segunda, d.blancas) >= 15 && !esRecaptura(d)) return "genial";
  if (esMejor) return "mejor";
  if (caida < 2) return "excelente";
  if (caida < 5) return "buena";
  if (caida < 10) return "imprecision";
  const rivalSeEquivoco = d.previa !== null && antes - ganar(d.previa, d.blancas) >= 15;
  if (rivalSeEquivoco && antes >= 60 && despues >= 35) return "oportunidad";
  return caida >= 20 ? "error_grave" : "error";
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
