import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function RequireAuth() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return <p className="text-mute">Cargando…</p>;
  }
  if (!usuario) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
