import { Navigate, Route, Routes } from "react-router";
import { AgendamentoPublico } from "./pages/AgendamentoPublico";
import { AreaCliente } from "./pages/AreaCliente";
import { PainelAdmin } from "./pages/admin/PainelAdmin";
import { PainelMaster } from "./pages/master/PainelMaster";

export default function App() {
  return (
    <Routes>
      <Route path="/master/*" element={<PainelMaster />} />
      <Route path="/admin/*" element={<PainelAdmin />} />
      <Route path="/cliente/:slug" element={<AreaCliente />} />
      <Route path="/:slug" element={<AgendamentoPublico />} />
      <Route path="/" element={<Navigate to="/master" replace />} />
    </Routes>
  );
}
