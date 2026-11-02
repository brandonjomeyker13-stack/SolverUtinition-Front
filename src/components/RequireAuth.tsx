import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function RequireAuth() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  const [tarda, setTarda] = useState(false);

  useEffect(() => {
    if (!cargando) return;
    const id = window.setTimeout(() => setTarda(true), 4000);
    return () => window.clearTimeout(id);
  }, [cargando]);

  if (cargando) {
    return (
      <p className="text-mute">
        Cargando…
        {tarda
          ? " El servidor estaba dormido y está arrancando. La primera vez puede tardar cerca de un minuto."
          : null}
      </p>
    );
  }
  if (!usuario) {
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <Outlet />;
}
