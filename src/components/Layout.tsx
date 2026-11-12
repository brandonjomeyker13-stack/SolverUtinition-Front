import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

function Icono({ d, className = "h-6 w-6" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
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
  salir: "M14 7h3.5A1.5 1.5 0 0 1 19 8.5v7a1.5 1.5 0 0 1-1.5 1.5H14M14 12H5M8 8l-4 4 4 4",
};

function Marca({ className }: { className: string }) {
  return (
    <NavLink to="/" aria-label="SolverUnition, ir al ranking" className="inline-flex shrink-0">
      <img src="/logo-horizontal.png" alt="SolverUnition" width="661" height="160" className={`w-auto ${className}`} />
    </NavLink>
  );
}

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

  const items = usuario
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
    <div className="min-h-dvh md:flex">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-panel focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-panel px-5 py-7 md:flex">
        <Marca className="h-11" />
        <nav aria-label="Secciones" className="mt-10 flex flex-col gap-1.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition ${
                  isActive
                    ? "bg-accent text-white shadow-[0_8px_20px_rgb(93_95_239/0.3)]"
                    : "text-mute hover:bg-canvas hover:text-ink"
                }`
              }
            >
              <Icono d={item.icon} className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {usuario ? (
          <div className="mt-auto space-y-3">
            <div className="rounded-2xl bg-accent p-4 text-white">
              <p className="text-xs text-white/75">Conectado como</p>
              <p className="mt-0.5 truncate font-semibold">{usuario.nombre}</p>
            </div>
            <button
              type="button"
              onClick={() => void onSalir()}
              className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-4 text-sm font-medium text-mute hover:bg-canvas hover:text-ink"
            >
              <Icono d={ICONS.salir} className="h-5 w-5" />
              Salir
            </button>
          </div>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-line bg-panel/90 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Marca className="h-9" />
            {usuario ? (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {usuario.nombre.charAt(0).toUpperCase()}
              </span>
            ) : null}
          </div>
        </header>

        <main id="contenido" className="mx-auto max-w-6xl px-4 pt-5 pb-28 md:px-8 md:py-9">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-lg gap-1 px-2 py-1.5">
          {items.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] transition ${
                    isActive ? "bg-accent-soft font-semibold text-accent" : "font-medium text-mute"
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
