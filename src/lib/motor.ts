import type { Evaluacion } from "./analisis";

const RUTA = "/stockfish/stockfish-19-lite-single.js";

export type Linea = {
  multipv: number;
  profundidad: number;
  evaluacion: Evaluacion;
  pv: string[];
};

type Busqueda = {
  fen: string;
  comando: string;
  multipv: number;
  alInfo?: (lineas: Linea[]) => void;
  resolver: (lineas: Linea[] | null) => void;
  lineas: Map<number, Linea>;
  cancelada: boolean;
};

function blancasJuegan(fen: string) {
  return fen.split(" ")[1] !== "b";
}

function leerInfo(linea: string, blancas: boolean): Linea | null {
  const t = linea.split(" ");
  const pvEn = t.indexOf("pv");
  const scoreEn = t.indexOf("score");
  if (pvEn < 0 || scoreEn < 0) return null;
  const tipo = t[scoreEn + 1];
  const valor = Number(t[scoreEn + 2]);
  if (!Number.isFinite(valor)) return null;
  const signo = blancas ? 1 : -1;
  const evaluacion: Evaluacion = tipo === "mate" ? { mate: valor * signo } : { cp: valor * signo };
  const mpv = t.indexOf("multipv");
  const prof = t.indexOf("depth");
  return {
    multipv: mpv >= 0 ? Number(t[mpv + 1]) : 1,
    profundidad: prof >= 0 ? Number(t[prof + 1]) : 0,
    evaluacion,
    pv: t.slice(pvEn + 1),
  };
}

/** Un Stockfish por pestaña. Una búsqueda a la vez: pedir otra cancela la que corre. */
export class Motor {
  private worker: Worker;
  private listo: Promise<void>;
  private actual: Busqueda | null = null;
  private pendiente: Busqueda | null = null;
  private multipvActual = 1;

  constructor() {
    this.worker = new Worker(RUTA);
    let avisarListo: () => void = () => {};
    this.listo = new Promise((r) => (avisarListo = r));
    this.worker.onmessage = (e: MessageEvent<string>) => {
      const linea = String(e.data);
      if (linea === "uciok") {
        this.worker.postMessage("setoption name Hash value 32");
        this.worker.postMessage("isready");
      } else if (linea === "readyok") {
        avisarListo();
      } else if (linea.startsWith("info") && this.actual) {
        this.alInfo(linea);
      } else if (linea.startsWith("bestmove")) {
        this.alTerminar();
      }
    };
    this.worker.postMessage("uci");
  }

  analizar(
    fen: string,
    opciones: { profundidad: number; multipv?: number; msMaximo?: number; alInfo?: (l: Linea[]) => void },
  ): Promise<Linea[] | null> {
    return new Promise((resolver) => {
      const limite = opciones.msMaximo ? ` movetime ${opciones.msMaximo}` : "";
      const busqueda: Busqueda = {
        fen,
        comando: `go depth ${opciones.profundidad}${limite}`,
        multipv: opciones.multipv ?? 1,
        alInfo: opciones.alInfo,
        resolver,
        lineas: new Map(),
        cancelada: false,
      };
      if (this.pendiente) this.pendiente.resolver(null);
      this.pendiente = busqueda;
      if (this.actual) {
        this.actual.cancelada = true;
        this.worker.postMessage("stop");
      } else {
        void this.arrancar();
      }
    });
  }

  detener() {
    if (this.pendiente) {
      this.pendiente.resolver(null);
      this.pendiente = null;
    }
    if (this.actual) {
      this.actual.cancelada = true;
      this.worker.postMessage("stop");
    }
  }

  cerrar() {
    this.detener();
    this.worker.terminate();
  }

  private async arrancar() {
    await this.listo;
    if (this.actual || !this.pendiente) return;
    const b = this.pendiente;
    this.pendiente = null;
    this.actual = b;
    if (b.multipv !== this.multipvActual) {
      this.worker.postMessage(`setoption name MultiPV value ${b.multipv}`);
      this.multipvActual = b.multipv;
    }
    this.worker.postMessage(`position fen ${b.fen}`);
    this.worker.postMessage(b.comando);
  }

  private alInfo(linea: string) {
    const b = this.actual!;
    if (b.cancelada) return;
    const info = leerInfo(linea, blancasJuegan(b.fen));
    if (!info) return;
    b.lineas.set(info.multipv, info);
    b.alInfo?.(this.ordenadas(b));
  }

  private alTerminar() {
    const b = this.actual;
    this.actual = null;
    if (b) b.resolver(b.cancelada ? null : this.ordenadas(b));
    if (this.pendiente) void this.arrancar();
  }

  private ordenadas(b: Busqueda) {
    return [...b.lineas.values()].sort((x, y) => x.multipv - y.multipv);
  }
}
