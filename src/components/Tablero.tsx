import { Chess } from "chess.js";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { DrawShape } from "chessground/draw";
import type { Key } from "chessground/types";
import { useEffect, useRef, type ReactNode } from "react";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";
import { jugadasLegales } from "../lib/analisis";

export type Flecha = { desde: string; hasta: string; color?: "green" | "red" | "blue" | "yellow" };

type Props = {
  fen: string;
  orientacion: "white" | "black";
  ultima?: [string, string];
  flechas?: Flecha[];
  /** Sin esto el tablero es solo para mirar. */
  alMover?: (desde: string, hasta: string) => void;
  /** Se pinta en la esquina de la casilla, como el ícono de Chess.com. */
  insignia?: { casilla: string; contenido: ReactNode };
};

function esquina(casilla: string, orientacion: "white" | "black") {
  const columna = casilla.charCodeAt(0) - 97;
  const fila = Number(casilla[1]);
  const x = orientacion === "white" ? columna : 7 - columna;
  const y = orientacion === "white" ? 8 - fila : fila - 1;
  return { left: `${(x + 1) * 12.5}%`, top: `${y * 12.5}%` };
}

function turno(fen: string) {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

function enJaque(fen: string) {
  return new Chess(fen).inCheck() ? turno(fen) : false;
}

export function Tablero({ fen, orientacion, ultima, flechas = [], alMover, insignia }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const alMoverRef = useRef(alMover);
  alMoverRef.current = alMover;

  useEffect(() => {
    if (!contenedor.current) return;
    api.current = Chessground(contenedor.current, {
      coordinates: true,
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      draggable: { showGhost: true },
      drawable: { enabled: true, visible: true },
      movable: {
        free: false,
        showDests: true,
        events: { after: (desde, hasta) => alMoverRef.current?.(desde, hasta) },
      },
    });
    return () => {
      api.current?.destroy();
      api.current = null;
    };
  }, []);

  const movible = Boolean(alMover);
  const ultimaClave = ultima ? `${ultima[0]}${ultima[1]}` : "";

  useEffect(() => {
    const color = turno(fen);
    api.current?.set({
      fen,
      orientation: orientacion,
      turnColor: color,
      check: enJaque(fen),
      lastMove: ultimaClave ? ([ultimaClave.slice(0, 2), ultimaClave.slice(2, 4)] as Key[]) : undefined,
      movable: {
        color: movible ? color : undefined,
        dests: movible ? (jugadasLegales(fen) as Map<Key, Key[]>) : new Map(),
      },
    });
  }, [fen, orientacion, ultimaClave, movible]);

  const flechasClave = flechas.map((f) => `${f.desde}${f.hasta}:${f.color ?? "green"}`).join(",");

  useEffect(() => {
    const shapes: DrawShape[] = flechasClave
      ? flechasClave.split(",").map((f) => ({
          orig: f.slice(0, 2) as Key,
          dest: f.slice(2, 4) as Key,
          brush: f.slice(5),
        }))
      : [];
    api.current?.setAutoShapes(shapes);
  }, [flechasClave]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl">
      {/* El CSS de chessground no va en capa y le gana a Tailwind: el tamaño va en línea. */}
      <div ref={contenedor} style={{ width: "100%", height: "100%" }} />
      {insignia ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-full p-0.5 drop-shadow"
          style={esquina(insignia.casilla, orientacion)}
        >
          {insignia.contenido}
        </div>
      ) : null}
    </div>
  );
}
