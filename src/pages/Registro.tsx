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
          Primero la cuenta de la comunidad. Después conectas Lichess.
        </p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-4 p-4 sm:p-6">
        <label className="block text-sm font-medium">
          Nombre
          <input
            required
            minLength={2}
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="field"
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        <button type="submit" disabled={enviando} className="btn w-full">
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
        <Link to="/entrar" className="font-medium text-accent">
          Entrar
        </Link>
      </p>
    </div>
  );
}
