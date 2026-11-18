import { centipeones, porcentajeVictoria, textoEvaluacion, type Evaluacion } from "../lib/analisis";

/** Vertical al lado del tablero. Blanco abajo cuando miras con blancas. */
export function BarraEval({ evaluacion, orientacion }: { evaluacion: Evaluacion | null; orientacion: "white" | "black" }) {
  const blancas = evaluacion ? porcentajeVictoria(centipeones(evaluacion)) : 50;
  const texto = evaluacion ? textoEvaluacion(evaluacion) : "…";
  const ventajaBlancas = blancas >= 50;
  const abajoBlanco = orientacion === "white";
  return (
    <div
      className="relative w-3 shrink-0 overflow-hidden rounded-md bg-[#403d39] sm:w-6"
      role="meter"
      aria-label="Ventaja"
      aria-valuenow={Math.round(blancas)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={texto}
    >
      <div
        className={`absolute inset-x-0 bg-white transition-[height] duration-300 ${abajoBlanco ? "bottom-0" : "top-0"}`}
        style={{ height: `${blancas}%` }}
      />
      <span
        className={`absolute inset-x-0 hidden text-center text-[10px] font-semibold sm:block ${
          ventajaBlancas === abajoBlanco ? "bottom-1 text-[#403d39]" : "top-1 text-white"
        }`}
      >
        {texto}
      </span>
    </div>
  );
}

export function GraficaEval({
  evals,
  actual,
  alElegir,
}: {
  evals: (Evaluacion | null)[];
  actual: number;
  alElegir: (indice: number) => void;
}) {
  if (evals.length < 2) return null;
  const ancho = 600;
  const alto = 90;
  const paso = ancho / (evals.length - 1);
  const ys = evals.map((e) => (e ? alto - (porcentajeVictoria(centipeones(e)) / 100) * alto : alto / 2));
  const linea = ys.map((y, i) => `${(i * paso).toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className="h-20 w-full cursor-pointer rounded-xl bg-[#403d39]"
      preserveAspectRatio="none"
      onClick={(e) => {
        const caja = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - caja.left) / caja.width) * ancho;
        alElegir(Math.max(0, Math.min(evals.length - 1, Math.round(x / paso))));
      }}
      role="img"
      aria-label="Gráfica de la ventaja durante la partida"
    >
      <polygon points={`0,${alto} ${linea} ${ancho},${alto}`} fill="#ffffff" />
      <line x1="0" x2={ancho} y1={alto / 2} y2={alto / 2} stroke="#8a8784" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={actual * paso} x2={actual * paso} y1="0" y2={alto} stroke="#5d5fef" strokeWidth="3" />
    </svg>
  );
}
