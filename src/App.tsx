import { Navigate, Route, Routes } from "react-router";
import { AgendamentoPublico } from "./pages/AgendamentoPublico";
import { AreaCliente } from "./pages/AreaCliente";
import { PainelAdmin } from "./pages/admin/PainelAdmin";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<PainelAdmin />} />
      <Route path="/cliente/:slug" element={<AreaCliente />} />
      <Route path="/:slug" element={<AgendamentoPublico />} />
      <Route path="/" element={<Navigate to="/barbearia-demo" replace />} />
    </Routes>
  );
}
