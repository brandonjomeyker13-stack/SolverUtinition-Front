import type { Categoria } from "../lib/analisis";

export const META: Record<Categoria, { nombre: string; simbolo: string; color: string }> = {
  brillante: { nombre: "Brillante", simbolo: "!!", color: "#1baca6" },
  genial: { nombre: "Genial", simbolo: "!", color: "#5c8bb0" },
  mejor: { nombre: "Mejor", simbolo: "★", color: "#81b64c" },
  excelente: { nombre: "Excelente", simbolo: "✓", color: "#81b64c" },
  buena: { nombre: "Buena", simbolo: "✓", color: "#95b776" },
  teoria: { nombre: "Teoría", simbolo: "T", color: "#a88865" },
  imprecision: { nombre: "Imprecisión", simbolo: "?!", color: "#e6a700" },
  error: { nombre: "Error", simbolo: "?", color: "#ff8c42" },
  oportunidad: { nombre: "Oportunidad perdida", simbolo: "✗", color: "#ee6b5e" },
  error_grave: { nombre: "Error grave", simbolo: "??", color: "#e02f2f" },
};

export function Insignia({ categoria, tamano = "md" }: { categoria: Categoria; tamano?: "sm" | "md" }) {
  const m = META[categoria];
  const medida = tamano === "sm" ? "h-4 min-w-4 text-[9px]" : "h-6 min-w-6 text-[11px]";
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full px-1 font-bold leading-none text-white ${medida}`}
      style={{ backgroundColor: m.color }}
      title={m.nombre}
      aria-label={m.nombre}
    >
      {m.simbolo}
    </span>
  );
}
