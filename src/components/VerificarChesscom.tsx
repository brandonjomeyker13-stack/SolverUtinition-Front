import { useEffect, useState, type FormEvent } from "react";
import { api, HttpError } from "../lib/api";

type Pendiente = {
  username_visible: string;
  codigo: string;
  token: string;
  expira_en: string;
};

const AJUSTES_PERFIL = "https://www.chess.com/settings/profile";

function clave(usuarioId: number) {
  return `verificacion_chesscom_${usuarioId}`;
}

function leerPendiente(usuarioId: number): Pendiente | null {
  try {
    const crudo = localStorage.getItem(clave(usuarioId));
    if (!crudo) return null;
    const p = JSON.parse(crudo) as Pendiente;
    if (new Date(p.expira_en).getTime() <= Date.now()) {
      localStorage.removeItem(clave(usuarioId));
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function VerificarChesscom({
  usuarioId,
  onVinculado,
}: {
  usuarioId: number;
  onVinculado: (usernameVisible: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [pendiente, setPendiente] = useState<Pendiente | null>(() => leerPendiente(usuarioId));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (pendiente) localStorage.setItem(clave(usuarioId), JSON.stringify(pendiente));
    else localStorage.removeItem(clave(usuarioId));
  }, [pendiente, usuarioId]);

  async function pedirCodigo(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setOcupado(true);
    try {
      const p = await api<Pendiente>("/chesscom/verificacion", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setPendiente(p);
      setCopiado(false);
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo pedir el código");
    } finally {
      setOcupado(false);
    }
  }

  async function copiar() {
    if (!pendiente) return;
    try {
      await navigator.clipboard.writeText(pendiente.codigo);
      setCopiado(true);
    } catch {
      setError("No se pudo copiar. Mantén pulsado el código y cópialo a mano.");
    }
  }

  async function verificar() {
    if (!pendiente) return;
    setError(null);
    setOcupado(true);
    try {
      await api("/chesscom/verificacion/confirmar", {
        method: "POST",
        body: JSON.stringify({ token: pendiente.token }),
      });
      const nombre = pendiente.username_visible;
      setPendiente(null);
      await onVinculado(nombre);
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo verificar");
    } finally {
      setOcupado(false);
    }
  }

  if (!pendiente) {
    return (
      <form onSubmit={(ev) => void pedirCodigo(ev)} className="mt-3 space-y-3">
        <p className="text-sm text-mute">
          Escribe tu usuario exactamente como aparece en Chess.com. Te damos un código para
          comprobar que la cuenta es tuya.
        </p>
        <label className="block text-sm font-medium">
          Usuario de Chess.com
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tuusuario"
            className="field"
          />
        </label>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <button
          type="submit"
          disabled={ocupado || username.trim().length < 3}
          className="btn w-full sm:w-auto"
        >
          {ocupado ? "Buscando…" : "Pedir código"}
        </button>
      </form>
    );
  }

  const vence = new Date(pendiente.expira_en).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-mute">
        Verificando <span className="font-medium text-ink">{pendiente.username_visible}</span>
      </p>

      <div className="flex items-center gap-3 rounded-2xl border border-line bg-raised p-3">
        <code className="min-w-0 flex-1 select-all break-all font-mono text-xl font-semibold tracking-wider text-ink">
          {pendiente.codigo}
        </code>
        <button type="button" onClick={() => void copiar()} className="btn-ghost shrink-0">
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
        <li>Copia el código.</li>
        <li>
          Abre{" "}
          <a
            href={AJUSTES_PERFIL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent underline"
          >
            tu perfil en Chess.com
          </a>{" "}
          y pégalo en el campo <span className="font-medium">Location</span> (Ubicación). Guarda
          los cambios.
        </li>
        <li>Vuelve aquí y pulsa “Ya lo puse, verificar”.</li>
      </ol>
      <p className="text-xs text-mute">
        El código vale hasta las {vence}. Cuando quede vinculado, puedes quitarlo de tu ubicación.
      </p>

      {error ? <p className="text-sm text-bad">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void verificar()}
          className="btn w-full sm:w-auto"
        >
          {ocupado ? "Verificando…" : "Ya lo puse, verificar"}
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            setPendiente(null);
            setError(null);
          }}
          className="btn-ghost w-full sm:w-auto"
        >
          Usar otro usuario
        </button>
      </div>
    </div>
  );
}
