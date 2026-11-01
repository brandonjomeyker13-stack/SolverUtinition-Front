import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleButton } from "../components/GoogleButton";
import { HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";

export function Entrar() {
  const { entrar, entrarConGoogle } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from || "/cuenta";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onGoogle = useCallback(
    async (idToken: string) => {
      setError(null);
      setAviso(null);
      try {
        await entrarConGoogle(idToken);
        navigate(from, { replace: true });
      } catch (e: unknown) {
        if (e instanceof HttpError && e.codigo === "cuenta_no_registrada") {
          setAviso(e.message);
          return;
        }
        setError(e instanceof HttpError ? e.message : "No se pudo entrar con Google");
      }
    },
    [entrarConGoogle, from, navigate],
  );

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setAviso(null);
    setEnviando(true);
    try {
      await entrar(email, password);
      navigate(from, { replace: true });
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-3xl">Entrar</h1>
        <p className="mt-2 text-sm text-mute">Usa tu cuenta de la comunidad o Google.</p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 p-4 sm:p-6">
        <label className="block text-sm font-medium">
          Correo
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>
        <label className="block text-sm font-medium">
          Contraseña
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        {aviso ? (
          <p className="rounded-2xl border border-line bg-raised px-3 py-3 text-sm text-ink">
            {aviso}{" "}
            <Link to="/registro" className="font-medium text-accent underline">
              Crear cuenta
            </Link>
          </p>
        ) : null}
        <button type="submit" disabled={enviando} className="btn w-full">
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-mute">
        <span className="h-px flex-1 bg-line" />
        o
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton onCredential={(t) => void onGoogle(t)} />

      <p className="text-center text-sm text-mute">
        ¿Aún no tienes cuenta?{" "}
        <Link to="/registro" className="font-medium text-accent">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
