import { api } from "./api";
import type { AnalisisGuardado, Plataforma, PartidaGeneral } from "./types";

const CLAVE = (p: Plataforma) => `partidas_generales_${p}`;

export async function partidasGenerales(plataforma: Plataforma): Promise<PartidaGeneral[]> {
  const lista = await api<PartidaGeneral[]>(`/analisis/partidas?plataforma=${plataforma}&limit=40`);
  sessionStorage.setItem(CLAVE(plataforma), JSON.stringify(lista));
  return lista;
}

export function partidasEnCache(plataforma: Plataforma): PartidaGeneral[] | null {
  try {
    const raw = sessionStorage.getItem(CLAVE(plataforma));
    return raw ? (JSON.parse(raw) as PartidaGeneral[]) : null;
  } catch {
    return null;
  }
}

/** Para recargar la página de análisis sin perder la partida. */
export async function buscarPartida(plataforma: Plataforma, id: string): Promise<PartidaGeneral | null> {
  const enCache = partidasEnCache(plataforma)?.find((p) => p.id === id);
  if (enCache) return enCache;
  return (await partidasGenerales(plataforma)).find((p) => p.id === id) ?? null;
}

export function analisisGuardado(plataforma: Plataforma, id: string): Promise<AnalisisGuardado> {
  return api<AnalisisGuardado>(`/analisis/${plataforma}/${encodeURIComponent(id)}`);
}

function marcarAnalizada(plataforma: Plataforma, id: string, precision: number | null) {
  const lista = partidasEnCache(plataforma);
  if (!lista) return;
  const nueva = lista.map((p) => (p.id === id ? { ...p, analizada: true, precision } : p));
  sessionStorage.setItem(CLAVE(plataforma), JSON.stringify(nueva));
}

export async function guardarAnalisis(
  partida: PartidaGeneral,
  eval_inicial: AnalisisGuardado["eval_inicial"],
  evals: AnalisisGuardado["evals"],
  mejores: (string | null)[],
): Promise<AnalisisGuardado> {
  const guardado = await api<AnalisisGuardado>("/analisis", {
    method: "POST",
    body: JSON.stringify({
      plataforma: partida.plataforma,
      partida_id: partida.id,
      url: partida.url,
      color: partida.color,
      ritmo: partida.ritmo,
      resultado: partida.resultado,
      apertura: partida.apertura,
      terminada_en: partida.terminada_en,
      pgn: partida.pgn,
      eval_inicial,
      evals,
      mejores,
    }),
  });
  marcarAnalizada(partida.plataforma, partida.id, guardado.precision);
  return guardado;
}

export const RITMOS_GENERALES: Record<string, string> = {
  ultraBullet: "Ultrabala",
  bullet: "Bala",
  blitz: "Blitz",
  rapid: "Rápida",
  classical: "Clásica",
  correspondence: "Por correspondencia",
  daily: "Diaria",
};
