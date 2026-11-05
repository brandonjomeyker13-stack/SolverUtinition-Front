import { api } from "./api";
import type { RankingFila, RankingMes, Ritmo } from "./types";

export function rankingPorElo(ritmo: Ritmo): Promise<RankingFila[]> {
  return api<RankingFila[]>(`/ranking?ritmo=${ritmo}`);
}

/** Solo Lichess hasta que Chess.com entregue su API. */
export function rankingDelMes(ritmo: Ritmo): Promise<RankingMes> {
  return api<RankingMes>(`/ranking/mes?ritmo=${ritmo}&plataforma=lichess`);
}

export function nombreDelMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  const texto = new Date(anio, numero - 1, 1).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
