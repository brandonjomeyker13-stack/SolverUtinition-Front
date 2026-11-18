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
  return `Era mejor ${m.san}.`;
}

/** Cuánto empeora la evaluación para quien movió, en peones; null si hay mates de por medio. */
function peonesPerdidos(d: DatosJugada): string | null {
  if (d.antes.mate != null || d.despues.mate != null) return null;
  const signo = d.blancas ? 1 : -1;
  const perdida = (((d.antes.cp ?? 0) - (d.despues.cp ?? 0)) * signo) / 100;
  if (perdida < 0.3 || Math.abs(d.antes.cp ?? 0) >= 1000) return null;
  return perdida.toFixed(1);
}

function sanDe(fen: string, uci: string | null) {
  return mover(fen, uci)?.san ?? null;
}

/** Una o dos frases para el aviso de la jugada. */
export function explicar(d: DatosJugada, cat: Categoria): string {
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
  const porQue = castigo(d);
  if (porQue) frases.push(porQue);
  else {
    const peones = peonesPerdidos(d);
    frases.push(peones ? `Pierdes cerca de ${peones} peones de ventaja.` : "Pierdes parte de tu ventaja.");
  }
  const mejor = alternativa(d);
  if (mejor) frases.push(mejor);
  return frases.slice(0, 3).join(" ");
}
