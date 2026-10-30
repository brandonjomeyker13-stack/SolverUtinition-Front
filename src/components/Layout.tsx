import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const link =
  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-mute transition hover:text-cream";
const activo = "bg-raised text-cream";

export function Layout() {
  const { usuario, salir } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-10%,#243026_0%,transparent_55%),linear-gradient(#0b0f0c,#0b0f0c)]">
      <header className="sticky top-0 z-10 border-b border-line/70 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
          <NavLink to="/" className="font-display text-xl tracking-tight text-cream">
            Solver<span className="text-gold">Unition</span>
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={({ isActive }) => `${link} ${isActive ? activo : ""}`}>
              Ranking
            </NavLink>
            {usuario ? (
              <>
                <NavLink
                  to="/partidas"
                  className={({ isActive }) => `${link} ${isActive ? activo : ""}`}
                >
                  Partidas
                </NavLink>
                <NavLink
                  to="/cuenta"
                  className={({ isActive }) => `${link} ${isActive ? activo : ""}`}
                >
                  Cuenta
                </NavLink>
                <button
                  type="button"
                  onClick={() => void salir()}
                  className={`${link} cursor-pointer border-0 bg-transparent`}
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/entrar"
                  className={({ isActive }) => `${link} ${isActive ? activo : ""}`}
                >
                  Entrar
                </NavLink>
                <NavLink
                  to="/registro"
                  className="whitespace-nowrap rounded-full bg-gold px-3 py-1.5 text-sm font-medium text-ink"
                >
                  Crear cuenta
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-5 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
