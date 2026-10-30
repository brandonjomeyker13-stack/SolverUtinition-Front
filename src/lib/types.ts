export type Ritmo = "bullet" | "blitz" | "rapid";

export type ResultadoPartida = "1-0" | "0-1" | "1/2-1/2";

export type Rating = {
  ritmo: Ritmo;
  elo: number;
  partidas_jugadas: number;
};

export type Perfil = {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  chesscom: {
    username: string;
    username_visible: string;
    vinculada_en: string;
  } | null;
  ratings: Rating[];
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  usuario: Perfil;
};

export type RankingFila = {
  posicion: number;
  usuario_id: number;
  nombre: string;
  chesscom_username: string | null;
  ritmo: Ritmo;
  elo: number;
  partidas_jugadas: number;
};

export type Partida = {
  id: number;
  plataforma: string;
  plataforma_partida_id: string;
  blanca_id: number;
  negra_id: number;
  ritmo: Ritmo;
  rated_en_plataforma: boolean;
  resultado: ResultadoPartida;
  elo_blanca_antes: number;
  elo_negra_antes: number;
  delta_blanca: number;
  delta_negra: number;
  terminada_en: string;
  url: string | null;
};

export type ApiError = {
  detail: string;
  codigo?: string;
};
