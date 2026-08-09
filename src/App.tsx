import { Navigate, Route, Routes, useParams } from "react-router";
import { AgendamentoPublico } from "./pages/AgendamentoPublico";
import { AreaCliente } from "./pages/AreaCliente";
import { PainelAdmin } from "./pages/admin/PainelAdmin";
import { PainelMaster } from "./pages/master/PainelMaster";

/** /admin antigo → /{slug}/admin se houver sessão; senão master. */
function RedirectAdminLegado() {
  try {
    const salvo = localStorage.getItem("encaixe_tenant");
    if (salvo) {
      const tenant = JSON.parse(salvo) as { slug?: string };
      if (tenant.slug) return <Navigate to={`/${tenant.slug}/admin`} replace />;
    }
  } catch {
    /* ignore */
  }
  return <Navigate to="/master" replace />;
}

function RedirectClienteLegado() {
  const { slug = "" } = useParams();
  return <Navigate to={`/${slug}/cliente`} replace />;
}

/** Slugs de sistema não são loja pública. */
function RotaPublica() {
  const { slug = "" } = useParams();
  if (slug === "master") return <Navigate to="/master" replace />;
  if (slug === "admin") return <RedirectAdminLegado />;
  return <AgendamentoPublico />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/master" element={<PainelMaster />} />
      <Route path="/master/*" element={<PainelMaster />} />

      <Route path="/:slug/admin" element={<PainelAdmin />} />
      <Route path="/:slug/admin/*" element={<PainelAdmin />} />
      <Route path="/:slug/cliente" element={<AreaCliente />} />

      {/* Compatibilidade com URLs antigas */}
      <Route path="/admin" element={<RedirectAdminLegado />} />
      <Route path="/admin/*" element={<RedirectAdminLegado />} />
      <Route path="/cliente/:slug" element={<RedirectClienteLegado />} />

      <Route path="/:slug" element={<RotaPublica />} />
      <Route path="/" element={<Navigate to="/master" replace />} />
    </Routes>
  );
}
