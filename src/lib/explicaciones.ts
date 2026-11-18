import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";
import type { Categoria, DatosJugada, Evaluacion } from "./analisis";

const NOMBRE: Record<PieceSymbol, string> = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
  k: "rey",
};

const VALOR: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

function articulo(tipo: PieceSymbol) {
  return tipo === "r" || tipo === "q" ? "la" : "el";
}

function mover(fen: string, uci: string | null): Move | null {
  if (!uci) return null;
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
  } catch {
    return null;
  }
}

/** Mate desde quien mueve: positivo si él da mate, negativo si lo recibe. */
function mate(e: Evaluacion, blancas: boolean): number | null {
  if (e.mate === undefined || e.mate === null || e.mate === 0) return null;
  return blancas ? e.mate : -e.mate;
}

/** Piezas de `victima` que ataca la pieza recién jugada en `desde`, de mayor a menor valor. */
function blancosDe(juego: Chess, desde: Square, victima: Color): { tipo: PieceSymbol; casilla: Square }[] {
  const atacante = juego.get(desde);
  if (!atacante) return [];
  const salida: { tipo: PieceSymbol; casilla: Square }[] = [];
  for (const fila of juego.board()) {
    for (const c of fila) {
      if (!c || c.color !== victima) continue;
      if (c.type !== "k" && VALOR[c.type] < 3) continue;
      if (!juego.attackers(c.square, atacante.color).includes(desde)) continue;
      const defendida = juego.attackers(c.square, victima).length > 0;
      if (c.type === "k" || !defendida || VALOR[c.type] > VALOR[atacante.type]) {
        salida.push({ tipo: c.type, casilla: c.square });
      }
    }
  }
  return salida.sort((a, b) => VALOR[b.tipo] - VALOR[a.tipo]);
}

const DIRECCIONES: Record<"b" | "r", [number, number][]> = {
  b: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  r: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
};

/** Si la pieza en `desde` clava una pieza rival contra su rey o su dama. */
function clavada(juego: Chess, desde: Square): { clavada: PieceSymbol; contra: PieceSymbol; casilla: Square } | null {
  const pieza = juego.get(desde);
  if (!pieza || !["b", "r", "q"].includes(pieza.type)) return null;
  const direcciones =
    pieza.type === "q" ? [...DIRECCIONES.b, ...DIRECCIONES.r] : DIRECCIONES[pieza.type as "b" | "r"];
  for (const [df, dr] of direcciones) {
    let f = desde.charCodeAt(0) - 97 + df;
    let r = Number(desde[1]) + dr;
    let primera: { tipo: PieceSymbol; casilla: Square } | null = null;
    while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
      const casilla = `${String.fromCharCode(97 + f)}${r}` as Square;
      const otra = juego.get(casilla);
      if (otra) {
        if (otra.color === pieza.color) break;
        if (!primera) {
          if (otra.type === "k") break;
          primera = { tipo: otra.type, casilla };
        } else {
          const detras = otra.type === "k" || (otra.type === "q" && pieza.type !== "q");
          if (detras && VALOR[primera.tipo] < VALOR[otra.type]) {
            return { clavada: primera.tipo, contra: otra.type, casilla: primera.casilla };
          }
          break;
        }
      }
      f += df;
      r += dr;
    }
  }
  return null;
}

/** Qué hace la mejor respuesta del rival. */
function castigo(d: DatosJugada): string | null {
  const r = mover(d.mov.fenDespues, d.respuesta);
  if (!r) return null;
  const juego = new Chess(r.after);
  const mio: Color = d.blancas ? "w" : "b";
  if (r.san.endsWith("#")) return `El rival da jaque mate con ${r.san}.`;

  const dobles = blancosDe(juego, r.to, mio);
  if (dobles.length >= 2) {
    const [a, b] = dobles;
    return a.tipo === "k"
      ? `${r.san} da jaque y a la vez ataca tu ${NOMBRE[b.tipo]} de ${b.casilla}: doble ataque.`
      : `${r.san} ataca a la vez tu ${NOMBRE[a.tipo]} y tu ${NOMBRE[b.tipo]}: doble ataque.`;
  }
  const antesDeCapturar = new Chess(d.mov.fenDespues);
  const defendida = r.captured ? antesDeCapturar.attackers(r.to, mio).length > 0 : false;
  const tomada = new Chess(d.mov.fenAntes).get(d.mov.hasta as Square);
  const cambio = r.captured && r.to === d.mov.hasta && tomada && VALOR[tomada.type] >= VALOR[r.captured];
  const ganaMaterial = r.captured && !cambio && (!defendida || VALOR[r.piece] < VALOR[r.captured]);
  if (r.captured && ganaMaterial) {
    if (r.to === d.mov.hasta) {
      const lo = articulo(r.captured) === "la" ? "la" : "lo";
      return `Tu ${NOMBRE[r.captured]} en ${r.to} queda sin defensa suficiente: el rival ${lo} captura con ${r.san}.`;
    }
    return `El rival responde ${r.san} y gana tu ${NOMBRE[r.captured]} de ${r.to}.`;
  }
  const clava = clavada(juego, r.to);
  if (clava) {
    return `${r.san} clava tu ${NOMBRE[clava.clavada]} de ${clava.casilla} contra tu ${NOMBRE[clava.contra]}.`;
  }
  if (r.promotion) return `El rival corona con ${r.san}.`;
  if (r.san.includes("+")) return `El rival toma la iniciativa con ${r.san}, con jaque.`;
  return null;
}

function otro(c: Color): Color {
  return c === "w" ? "b" : "w";
}

/** La misma posición pero moviendo `color`: sirve para ver qué amenaza cada lado. */
function conTurno(fen: string, color: Color): Chess | null {
  const partes = fen.split(" ");
  partes[1] = color;
  partes[3] = "-";
  try {
    return new Chess(partes.join(" "));
  } catch {
    return null;
  }
}

function material(juego: Chess): Record<Color, Record<PieceSymbol, number>> {
  const vacio = () => ({ p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 });
  const cuenta: Record<Color, Record<PieceSymbol, number>> = { w: vacio(), b: vacio() };
  for (const fila of juego.board()) for (const c of fila) if (c) cuenta[c.color][c.type]++;
  return cuenta;
}

function balance(juego: Chess, mio: Color) {
  const m = material(juego);
  const suma = (c: Color) => (Object.keys(m[c]) as PieceSymbol[]).reduce((s, t) => s + (t === "k" ? 0 : m[c][t] * VALOR[t]), 0);
  return suma(mio) - suma(otro(mio));
}

const NUMEROS = ["", "un", "dos", "tres", "cuatro", "cinco"];

/** "un peón", "la calidad", "una pieza"... según lo que cambió de manos. */
function queSePierde(antes: Chess, despues: Chess, mio: Color): string {
  const a = material(antes);
  const b = material(despues);
  const perdi = (t: PieceSymbol) => a[mio][t] - b[mio][t] - (a[otro(mio)][t] - b[otro(mio)][t]);
  if (perdi("q") > 0 && perdi("r") < 0) return "la dama a cambio de una torre";
  if (perdi("q") > 0 && perdi("n") + perdi("b") < 0) return "la dama a cambio de una pieza";
  if (perdi("q") > 0) return "la dama";
  if (perdi("r") > 0 && perdi("n") + perdi("b") < 0) return "la calidad (torre por pieza menor)";
  if (perdi("r") > 0) return "una torre";
  if (perdi("n") + perdi("b") > 0) return "una pieza";
  const peones = Math.max(1, perdi("p"));
  return peones === 1 ? "un peón" : `${NUMEROS[peones] ?? peones} peones`;
}

type Linea = { sans: string[]; perdida: number; queSe: string; jaques: number; corona: boolean };

/** Juega la línea del motor y mira qué pasa con el material cuando se calman las capturas. */
function seguirLinea(fen: string, pv: string[], mio: Color, maximo = 6): Linea | null {
  const juego = new Chess(fen);
  const inicio = new Chess(fen);
  const balInicial = balance(juego, mio);
  const sans: string[] = [];
  let jaques = 0;
  let corona = false;
  let tranquila = { sans: 0, fen };
  const movs = pv.slice(0, maximo);
  for (let i = 0; i < movs.length; i++) {
    let m: Move;
    try {
      m = juego.move({ from: movs[i].slice(0, 2), to: movs[i].slice(2, 4), promotion: movs[i][4] });
    } catch {
      break;
    }
    sans.push(m.san);
    if (m.color !== mio && m.san.includes("+")) jaques++;
    if (m.color !== mio && m.promotion) corona = true;
    const siguiente = movs[i + 1];
    const siguienteCaptura = siguiente ? Boolean(juego.get(siguiente.slice(2, 4) as Square)) : false;
    if (!siguienteCaptura) tranquila = { sans: sans.length, fen: juego.fen() };
  }
  if (sans.length === 0) return null;
  const final = new Chess(tranquila.fen);
  const perdida = balInicial - balance(final, mio);
  return {
    sans: sans.slice(0, Math.max(2, tranquila.sans)),
    perdida,
    queSe: perdida > 0 ? queSePierde(inicio, final, mio) : "",
    jaques,
    corona,
  };
}

/** Capturas que ganan material o mates en una que tendría `color` si le tocara jugar. */
function amenazas(fen: string, color: Color, salvo: Square | null = null): string | null {
  const juego = conTurno(fen, color);
  if (!juego) return null;
  let mejor: { texto: string; valor: number } | null = null;
  for (const m of juego.moves({ verbose: true })) {
    if (m.san.endsWith("#")) return "dar mate";
    if (!m.captured || m.to === salvo) continue;
    const defendida = juego.attackers(m.to, otro(color)).length > 0;
    if (defendida && VALOR[m.piece] >= VALOR[m.captured]) continue;
    if (VALOR[m.captured] < 3) continue;
    if (!mejor || VALOR[m.captured] > mejor.valor) {
      mejor = { texto: `ganar ${articulo(m.captured)} ${NOMBRE[m.captured]} de ${m.to}`, valor: VALOR[m.captured] };
    }
  }
  return mejor?.texto ?? null;
}

function movilidad(fen: string, casilla: Square, color: Color) {
  return conTurno(fen, color)?.moves({ square: casilla }).length ?? 0;
}

const INICIALES: Record<Color, Square[]> = {
  w: ["b1", "g1", "c1", "f1"],
  b: ["b8", "g8", "c8", "f8"],
};

function sinDesarrollar(juego: Chess, color: Color) {
  return INICIALES[color].filter((c) => {
    const p = juego.get(c);
    return p && p.color === color && (p.type === "n" || p.type === "b");
  }).length;
}

/** Algo de la propia jugada que la hace floja aunque no pierda material enseguida. */
function problemaDePosicion(d: DatosJugada): string | null {
  const antes = new Chess(d.mov.fenAntes);
  const despues = new Chess(d.mov.fenDespues);
  const mio: Color = d.blancas ? "w" : "b";
  const pieza = despues.get(d.mov.hasta as Square);
  if (!pieza) return null;
  const nombre = NOMBRE[pieza.type];
  const filaInicial = mio === "w" ? "1" : "8";
  const rey = antes.findPiece({ type: "k", color: mio })[0];
  const columnaRey = rey ? rey[0] : "e";

  if (pieza.type === "p" && rey && rey[1] === filaInicial) {
    const flanco = "fgh".includes(columnaRey) ? "fgh" : "abc".includes(columnaRey) ? "abc" : "";
    if (flanco.includes(d.mov.desde[0])) return "Adelantas un peón del enroque y dejas a tu rey con menos protección.";
  }
  const derechos = (fen: string) => (fen.split(" ")[2] ?? "-").split("").filter((c) => (mio === "w" ? c === c.toUpperCase() : c === c.toLowerCase()) && c !== "-").length;
  if (pieza.type === "k" && !d.mov.san.startsWith("O-O") && derechos(d.mov.fenAntes) > 0) {
    return "Mueves el rey sin enrocar: pierdes el enroque y tu rey queda expuesto en el centro.";
  }
  if (d.ply < 24 && (pieza.type === "n" || pieza.type === "b") && d.mov.hasta[1] === filaInicial) {
    return `Retiras tu ${nombre} a la primera fila y pierdes tiempo de desarrollo.`;
  }
  if (d.ply < 14 && pieza.type === "q" && sinDesarrollar(antes, mio) >= 2) {
    return "Sacas la dama muy pronto, con piezas sin desarrollar: el rival puede ganar tiempos atacándola.";
  }
  if (d.ply < 16 && (pieza.type === "n" || pieza.type === "b") && !INICIALES[mio].includes(d.mov.desde as Square) && sinDesarrollar(antes, mio) >= 2) {
    return `Mueves otra vez tu ${nombre} mientras otras piezas siguen sin salir.`;
  }
  if (["n", "b", "r", "q"].includes(pieza.type)) {
    const antesMov = movilidad(d.mov.fenAntes, d.mov.desde as Square, mio);
    const despuesMov = movilidad(d.mov.fenDespues, d.mov.hasta as Square, mio);
    if (despuesMov <= 3 && antesMov - despuesMov >= 3) {
      return `Tu ${nombre} queda pasiva en ${d.mov.hasta}, con solo ${despuesMov} casilla${despuesMov === 1 ? "" : "s"} para moverse.`;
    }
  }
  const capturada = antes.get(d.mov.hasta as Square);
  const esCambio = capturada && VALOR[capturada.type] >= VALOR[pieza.type];
  const pendiente = amenazas(d.mov.fenDespues, otro(mio), esCambio ? (d.mov.hasta as Square) : null);
  if (pendiente) return `Dejas que el rival pueda ${pendiente}.`;
  return null;
}

/** Qué hace la respuesta del rival cuando no gana material. */
function ideaDelRival(d: DatosJugada, uci: string): string | null {
  const r = mover(d.mov.fenDespues, uci);
  if (!r) return null;
  const mio: Color = d.blancas ? "w" : "b";
  const juego = new Chess(r.after);
  const atacadas = blancosDe(juego, r.to, mio);
  if (atacadas.length === 1 && atacadas[0].tipo !== "k") {
    return `El rival responde ${r.san} y ataca tu ${NOMBRE[atacadas[0].tipo]} de ${atacadas[0].casilla}.`;
  }
  const amenaza = amenazas(r.after, otro(mio));
  if (amenaza) return `El rival responde ${r.san} y amenaza ${amenaza}.`;
  if (r.piece === "p" && ["d", "e"].includes(r.to[0]) && ["4", "5"].includes(r.to[1])) {
    return `El rival aprovecha para tomar el centro con ${r.san}.`;
  }
  return null;
}

/** Para qué servía la mejor jugada, si no es una captura o un jaque. */
function ideaDeLaMejor(d: DatosJugada, m: Move): string | null {
  const mio: Color = d.blancas ? "w" : "b";
  if (m.san.startsWith("O-O")) return "poniendo tu rey a salvo";
  const amenaza = amenazas(m.after, mio);
  if (amenaza) return `que amenaza ${amenaza}`;
  const filaInicial = mio === "w" ? "1" : "8";
  if ((m.piece === "n" || m.piece === "b") && m.from[1] === filaInicial) return `desarrollando tu ${NOMBRE[m.piece]}`;
  if (m.piece === "r") {
    const columna = m.to[0];
    const juego = new Chess(m.after);
    const hayPeonPropio = ["1", "2", "3", "4", "5", "6", "7", "8"].some((f) => {
      const p = juego.get(`${columna}${f}` as Square);
      return p && p.type === "p" && p.color === mio;
    });
    if (!hayPeonPropio && m.from[0] !== columna) return "llevando la torre a una columna abierta";
  }
  if (m.piece === "p") {
    const reyRival = new Chess(m.after).findPiece({ type: "k", color: otro(mio) })[0];
    if (reyRival && Math.abs(reyRival.charCodeAt(0) - m.to.charCodeAt(0)) <= 2 && "abcfgh".includes(m.to[0])) {
      return "para abrir líneas contra el rey rival";
    }
    if (["d", "e"].includes(m.to[0])) return "luchando por el centro";
  }
  if (["d", "e"].includes(m.to[0]) && ["4", "5"].includes(m.to[1])) return "centralizando tu pieza";
  return null;
}

/** Qué conseguía la mejor jugada. */
function alternativa(d: DatosJugada): string | null {
  if (!d.mejor || d.mejor === d.mov.uci) return null;
  const m = mover(d.mov.fenAntes, d.mejor);
  if (!m) return null;
  if (m.san.endsWith("#")) return `${m.san} era jaque mate.`;
  if (m.captured) return `Era mejor ${m.san}, capturando ${articulo(m.captured)} ${NOMBRE[m.captured]} de ${m.to}.`;
  if (m.promotion) return `Era mejor ${m.san}, coronando.`;
  const juego = new Chess(m.after);
  const dobles = blancosDe(juego, m.to, d.blancas ? "b" : "w");
  if (dobles.length >= 2) {
    return `Era mejor ${m.san}, con doble ataque a ${articulo(dobles[0].tipo)} ${NOMBRE[dobles[0].tipo]} y ${articulo(dobles[1].tipo)} ${NOMBRE[dobles[1].tipo]}.`;
  }
  if (m.san.includes("+")) return `Era mejor ${m.san}, con jaque.`;
  const idea = ideaDeLaMejor(d, m);
  return idea ? `Era mejor ${m.san}, ${idea}.` : `Era mejor ${m.san}.`;
}

/** Cuánto empeora la evaluación para quien movió, en peones; null si hay mates de por medio. */
function peonesPerdidos(d: DatosJugada): string | null {
  if (d.antes.mate != null || d.despues.mate != null) return null;
  const signo = d.blancas ? 1 : -1;
  const perdida = (((d.antes.cp ?? 0) - (d.despues.cp ?? 0)) * signo) / 100;
  if (perdida < 0.3 || Math.abs(d.antes.cp ?? 0) >= 1000) return null;
  return perdida.toFixed(1);
}

/** Una línea larga del motor puede cortar a mitad de una combinación; solo se cree si la evaluación también cae. */
function coincideConElMotor(d: DatosJugada, perdida: number) {
  if (d.antes.mate != null || d.despues.mate != null) return true;
  const signo = d.blancas ? 1 : -1;
  const caida = (((d.antes.cp ?? 0) - (d.despues.cp ?? 0)) * signo) / 100;
  return caida >= perdida * 0.6;
}

function sanDe(fen: string, uci: string | null) {
  return mover(fen, uci)?.san ?? null;
}

/**
 * Una a tres frases para el aviso de la jugada. `refutacion` es la línea del
 * motor desde la posición después de la jugada, si ya la tenemos: con ella se
 * ve qué gana el rival unas jugadas más adelante.
 */
export function explicar(d: DatosJugada, cat: Categoria, refutacion: string[] | null = null): string {
  const frases: string[] = [];
  const jugada = new Chess(d.mov.fenAntes).move(d.mov.san);
  const mejorSan = sanDe(d.mov.fenAntes, d.mejor);

  switch (cat) {
    case "teoria":
      return "Jugada normal de apertura.";
    case "brillante": {
      const pieza = new Chess(d.mov.fenDespues).get(d.mov.hasta as Square);
      return pieza
        ? `¡Sacrificio! Entregas tu ${NOMBRE[pieza.type]} en ${d.mov.hasta} y la posición sigue a tu favor.`
        : "¡Sacrificio correcto!";
    }
    case "genial":
      frases.push("Era la única jugada buena: cualquier otra perdía mucha ventaja.");
      break;
    case "mejor":
      frases.push("Es la jugada que elige el motor.");
      break;
    case "excelente":
      return mejorSan && mejorSan !== d.mov.san ? `Casi tan buena como la mejor, ${mejorSan}.` : "Muy precisa.";
    case "buena":
      return mejorSan && mejorSan !== d.mov.san ? `Correcta, aunque ${mejorSan} era más precisa.` : "Correcta.";
    default:
      break;
  }

  if (cat === "genial" || cat === "mejor") {
    if (jugada.san.endsWith("#")) return "¡Jaque mate!";
    const m = mate(d.antes, d.blancas);
    const dobles = blancosDe(new Chess(jugada.after), jugada.to, d.blancas ? "b" : "w");
    const capturaGrande = jugada.captured && VALOR[jugada.captured] >= 3;
    if (m !== null && m > 0) frases.push(`Vas hacia mate en ${m}.`);
    else if (dobles.length >= 2 && !capturaGrande) {
      const [a, b] = dobles;
      frases.push(
        a.tipo === "k"
          ? `Da jaque y a la vez ataca ${articulo(b.tipo)} ${NOMBRE[b.tipo]} de ${b.casilla}: doble ataque.`
          : `Ataca a la vez ${articulo(a.tipo)} ${NOMBRE[a.tipo]} y ${articulo(b.tipo)} ${NOMBRE[b.tipo]}: doble ataque.`,
      );
    } else if (jugada.captured) frases.push(`Capturas ${articulo(jugada.captured)} ${NOMBRE[jugada.captured]}.`);
    return frases.join(" ");
  }

  // Imprecisión, error, oportunidad perdida o error grave.
  if (cat === "oportunidad") frases.push("Tu rival se había equivocado y lo dejaste pasar.");
  const contra = mate(d.despues, d.blancas);
  const aFavor = mate(d.antes, d.blancas);
  if (contra !== null && contra < 0) {
    frases.push(`Esta jugada permite mate en ${-contra}.`);
  } else if (aFavor !== null && aFavor > 0 && mejorSan) {
    frases.push(`Tenías mate en ${aFavor} empezando con ${mejorSan}.`);
    return frases.join(" ");
  }
  const mio: Color = d.blancas ? "w" : "b";
  const linea = refutacion?.length ? seguirLinea(d.mov.fenDespues, refutacion, mio) : null;
  const porQue = castigo(d);
  if (linea && linea.perdida >= 1 && coincideConElMotor(d, linea.perdida) && !porQue?.includes("gana tu")) {
    frases.push(`Después de ${linea.sans.join(" ")}, pierdes ${linea.queSe}.`);
  } else if (porQue) {
    frases.push(porQue);
  } else if (linea?.corona) {
    frases.push(`El rival consigue coronar: ${linea.sans.join(" ")}.`);
  } else if (linea && linea.jaques >= 2) {
    frases.push(`El rival lanza un ataque contra tu rey: ${linea.sans.join(" ")}.`);
  } else if (cat !== "oportunidad") {
    const posicion = problemaDePosicion(d);
    const respuesta = refutacion?.[0] ?? d.respuesta;
    const rival = respuesta ? ideaDelRival(d, respuesta) : null;
    if (posicion) frases.push(posicion);
    if (rival && !posicion?.startsWith("Dejas que")) frases.push(rival);
    if (!posicion && !rival) {
      const sanRespuesta = sanDe(d.mov.fenDespues, respuesta);
      const peones = peonesPerdidos(d);
      const cuanto = peones ? ` (unos ${peones} peones según el motor)` : "";
      frases.push(
        d.mov.san.includes("x")
          ? `Este cambio en ${d.mov.hasta} le conviene más al rival que a ti${cuanto}.`
          : sanRespuesta
          ? `Es una jugada lenta: no mejora tu posición y le da tiempo al rival para jugar ${sanRespuesta}${cuanto}.`
          : `Es una jugada lenta que no mejora tu posición${cuanto}.`,
      );
    }
  }
  const mejor = alternativa(d);
  if (mejor) frases.push(mejor);
  return frases.slice(0, 3).join(" ");
}
