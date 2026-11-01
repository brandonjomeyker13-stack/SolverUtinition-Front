import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const escritorio =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm text-mute hover:text-ink";
const escritorioActivo = "bg-raised font-medium text-ink";

function Icono({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  ranking: "M4 19V10M10 19V5M16 19v-7M21 19H3",
  partidas: "M5 6h14M5 12h14M5 18h9",
  cuenta: "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 19.5a7 7 0 0 1 14 0",
  entrar: "M10 7H6.5A1.5 1.5 0 0 0 5 8.5v7A1.5 1.5 0 0 0 6.5 17H10M10 12h9M16 8l4 4-4 4",
  crear: "M12 6v12M6 12h12",
};

export function Layout() {
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();

  async function onSalir() {
    try {
      await salir();
    } finally {
      navigate("/", { replace: true });
    }
  }

  const movil = usuario
    ? [
        { to: "/", label: "Ranking", icon: ICONS.ranking, end: true },
        { to: "/partidas", label: "Partidas", icon: ICONS.partidas, end: false },
        { to: "/cuenta", label: "Cuenta", icon: ICONS.cuenta, end: false },
      ]
    : [
        { to: "/", label: "Ranking", icon: ICONS.ranking, end: true },
        { to: "/entrar", label: "Entrar", icon: ICONS.entrar, end: false },
        { to: "/registro", label: "Registro", icon: ICONS.crear, end: false },
      ];

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-panel focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-20 border-b border-line/80 bg-panel/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:h-16 md:px-6">
          <NavLink to="/" className="font-display text-xl tracking-tight text-ink">
            Solver<span className="text-accent">Unition</span>
          </NavLink>
          <nav aria-label="Secciones" className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={({ isActive }) => `${escritorio} ${isActive ? escritorioActivo : ""}`}>
              Ranking
            </NavLink>
            {usuario ? (
              <>
                <NavLink to="/partidas" className={({ isActive }) => `${escritorio} ${isActive ? escritorioActivo : ""}`}>
                  Partidas
                </NavLink>
                <NavLink to="/cuenta" className={({ isActive }) => `${escritorio} ${isActive ? escritorioActivo : ""}`}>
                  Cuenta
                </NavLink>
                <button type="button" onClick={() => void onSalir()} className={`${escritorio} cursor-pointer border-0 bg-transparent`}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/entrar" className={({ isActive }) => `${escritorio} ${isActive ? escritorioActivo : ""}`}>
                  Entrar
                </NavLink>
                <NavLink to="/registro" className="btn px-4">
                  Crear cuenta
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-5xl px-4 pt-5 pb-28 md:px-6 md:py-10">
        <Outlet />
      </main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {movil.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 text-[11px] ${
                    isActive
                      ? "border-accent font-semibold text-accent"
                      : "border-transparent font-medium text-mute"
                  }`
                }
              >
                <Icono d={item.icon} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
