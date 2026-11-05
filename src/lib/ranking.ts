import { api } from "./api";
import type { RankingFila, RankingProgresoFila, Ritmo } from "./types";

export function rankingPorElo(ritmo: Ritmo): Promise<RankingFila[]> {
  return api<RankingFila[]>(`/ranking?ritmo=${ritmo}`);
}

/** Ordenado por puntos subidos desde el inicio. Aún no se muestra en ninguna página. */
export function rankingPorProgreso(ritmo: Ritmo): Promise<RankingProgresoFila[]> {
  return api<RankingProgresoFila[]>(`/ranking/progreso?ritmo=${ritmo}`);
}
