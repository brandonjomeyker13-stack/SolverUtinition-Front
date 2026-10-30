import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth } from "./components/RequireAuth";
import { AuthProvider } from "./lib/auth";
import { Cuenta } from "./pages/Cuenta";
import { Entrar } from "./pages/Entrar";
import { Partidas } from "./pages/Partidas";
import { Ranking } from "./pages/Ranking";
import { Registro } from "./pages/Registro";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Ranking />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/registro" element={<Registro />} />
            <Route element={<RequireAuth />}>
              <Route path="/cuenta" element={<Cuenta />} />
              <Route path="/partidas" element={<Partidas />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
