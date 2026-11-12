import { api } from "./api";
import type { Plataforma, RankingFila, RankingReal, Ritmo } from "./types";

export function rankingPorElo(ritmo: Ritmo): Promise<RankingFila[]> {
  return api<RankingFila[]>(`/ranking?ritmo=${ritmo}`);
}

/** Rating real de cada cuenta en la plataforma: cuánto subió en el mes. */
export function rankingRealDelMes(plataforma: Plataforma, ritmo: Ritmo): Promise<RankingReal> {
  return api<RankingReal>(`/ranking/mes/real?plataforma=${plataforma}&ritmo=${ritmo}`);
}

export function nombreDelMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  const texto = new Date(anio, numero - 1, 1).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
