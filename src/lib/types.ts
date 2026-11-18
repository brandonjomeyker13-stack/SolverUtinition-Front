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
  lichess: {
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
  lichess_username: string | null;
  ritmo: Ritmo;
  elo: number;
  partidas_jugadas: number;
};

export type RankingMesFila = {
  posicion: number;
  usuario_id: number;
  nombre: string;
  chesscom_username: string | null;
  lichess_username: string | null;
  elo_inicio: number;
  elo: number;
  subida: number;
  partidas: number;
  ganadas: number;
  tablas: number;
  perdidas: number;
};

export type RankingMes = {
  mes: string;
  ritmo: Ritmo;
  plataforma: "lichess" | "chesscom" | null;
  desde: string;
  hasta: string;
  filas: RankingMesFila[];
};

export type Plataforma = "lichess" | "chesscom";

export type RankingRealFila = {
  posicion: number;
  usuario_id: number;
  nombre: string;
  username: string;
  elo_inicio: number;
  elo: number;
  subida: number;
  partidas: number | null;
};

export type RankingReal = {
  mes: string;
  ritmo: Ritmo;
  plataforma: Plataforma;
  filas: RankingRealFila[];
};

export type Partida = {
  id: number;
  plataforma: string;
  plataforma_partida_id: string;
  blanca_id: number;
  negra_id: number;
  blanca_nombre: string;
  negra_nombre: string;
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

export type PartidaGeneral = {
  plataforma: Plataforma;
  id: string;
  url: string;
  pgn: string;
  blancas: { nombre: string; elo: number | null };
  negras: { nombre: string; elo: number | null };
  color: "white" | "black";
  resultado: "gano" | "perdio" | "tablas";
  ritmo: string;
  control: string;
  terminada_en: string;
  apertura: string | null;
  analizada: boolean;
  precision: number | null;
};

export type EvaluacionGuardada = { cp?: number | null; mate?: number | null };

export type AnalisisGuardado = {
  plataforma: Plataforma;
  partida_id: string;
  color: "white" | "black";
  eval_inicial: EvaluacionGuardada;
  evals: EvaluacionGuardada[];
  mejores: (string | null)[];
  precision: number | null;
  imprecisiones: number;
  errores: number;
  errores_graves: number;
  fuente: string;
};

export type Puzzle = {
  fen: string;
  solucion: string;
  jugada: string;
  caida: number;
  plataforma: Plataforma;
  partida_id: string;
  url: string | null;
};

export type ResumenSemanal = {
  semana: string;
  titulo: string;
  puntos: string[];
  datos: {
    partidas: number;
    ganadas: number;
    perdidas: number;
    tablas: number;
    precision: number | null;
    errores_graves: number;
    apresuradas: number;
    perdidas_por_prisa: number;
    aperturas: { color: "white" | "black"; apertura: string; puntos: number; partidas: number }[];
    puzzles: Puzzle[];
  };
  created_at: string;
};

export type ApiError = {
  detail: string;
  codigo?: string;
};
