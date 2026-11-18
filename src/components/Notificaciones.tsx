import { useEffect, useState } from "react";
import { HttpError } from "../lib/api";
import { activarPush, desactivarPush, estadoPush, probarPush, type EstadoPush } from "../lib/push";

const TEXTO: Record<EstadoPush, string> = {
  "no-soportado": "Este navegador no admite notificaciones. Prueba con Chrome, Edge o Firefox.",
  "falta-instalar":
    "En iPhone primero agrega la app a la pantalla de inicio: botón Compartir → “Agregar a inicio”. Luego ábrela desde ahí y vuelve aquí.",
  bloqueado: "Bloqueaste las notificaciones de este sitio. Actívalas en los ajustes del navegador.",
  activo: "Cada lunes te llega el resumen de tus partidas en este dispositivo, sin abrir la app.",
  inactivo: "Recibe cada lunes un resumen corto de tus partidas y puzzles con tus propios errores.",
};

export function Notificaciones() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    void estadoPush().then(setEstado);
  }, []);

  async function correr(accion: () => Promise<void>, exito: string) {
    setOcupado(true);
    setMensaje(null);
    try {
      await accion();
      setMensaje({ texto: exito, error: false });
    } catch (e) {
      setMensaje({ texto: e instanceof HttpError || e instanceof Error ? e.message : "Algo falló", error: true });
    } finally {
      setEstado(await estadoPush());
      setOcupado(false);
    }
  }

  if (estado === null) return null;

  return (
    <section className="card p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Notificaciones</h2>
      <p className="mt-2 text-sm text-mute">{TEXTO[estado]}</p>
      {estado === "inactivo" ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={() =>
            void correr(async () => {
              await activarPush();
              await probarPush();
            }, "Listo. Te mandamos una de prueba para confirmar.")
          }
          className="btn mt-4 w-full sm:w-auto"
        >
          Activar notificaciones
        </button>
      ) : estado === "activo" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void correr(probarPush, "Enviada. Debería llegarte en unos segundos.")}
            className="btn w-full sm:w-auto"
          >
            Enviar una de prueba
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void correr(desactivarPush, "Notificaciones desactivadas en este dispositivo.")}
            className="btn-ghost w-full sm:w-auto"
          >
            Desactivar
          </button>
        </div>
      ) : null}
      {mensaje ? <p className={`mt-3 text-sm ${mensaje.error ? "text-bad" : "text-good"}`}>{mensaje.texto}</p> : null}
    </section>
  );
}
