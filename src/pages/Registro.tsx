import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleButton } from "../components/GoogleButton";
import { HttpError } from "../lib/api";
import { useAuth } from "../lib/auth";

export function Registro() {
  const { registrar, registrarConGoogle } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onGoogle = useCallback(
    async (idToken: string) => {
      setError(null);
      try {
        await registrarConGoogle(idToken);
        navigate("/cuenta", { replace: true });
      } catch (e: unknown) {
        setError(e instanceof HttpError ? e.message : "No se pudo crear la cuenta con Google");
      }
    },
    [navigate, registrarConGoogle],
  );

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await registrar(nombre, email, password);
      navigate("/cuenta", { replace: true });
    } catch (e: unknown) {
      setError(e instanceof HttpError ? e.message : "No se pudo crear la cuenta");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-3xl">Crear cuenta</h1>
        <p className="mt-2 text-sm text-mute">
          Primero la cuenta de la comunidad. Después conectas Chess.com.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-panel p-6">
        <label className="block text-sm">
          Nombre
          <input
            required
            minLength={2}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-cream outline-none focus:border-gold"
          />
        </label>
        <label className="block text-sm">
          Correo
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-cream outline-none focus:border-gold"
          />
        </label>
        <label className="block text-sm">
          Contraseña
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-cream outline-none focus:border-gold"
          />
        </label>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-gold py-2.5 text-sm font-medium text-ink disabled:opacity-60"
        >
          {enviando ? "Creando…" : "Crear cuenta"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-mute">
        <span className="h-px flex-1 bg-line" />
        o
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton onCredential={(token) => void onGoogle(token)} />

      <p className="text-center text-sm text-mute">
        ¿Ya tienes cuenta?{" "}
        <Link to="/entrar" className="text-gold">
          Entrar
        </Link>
      </p>
    </div>
  );
}
