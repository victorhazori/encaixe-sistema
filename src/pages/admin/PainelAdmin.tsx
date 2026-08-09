import { useState, type CSSProperties } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Marca } from "../../components/ui";
import { type Tenant } from "../../lib/api";
import { useTenantTheme } from "../../lib/theme";
import "../../styles/admin.css";
import { Agenda } from "./Agenda";
import { CadastroClientes } from "./CadastroClientes";
import { CadastroProfissionais } from "./CadastroProfissionais";
import { CadastroServicos } from "./CadastroServicos";
import { Configuracoes } from "./Configuracoes";
import { LoginAdmin } from "./LoginAdmin";
import { VisaoGeral } from "./VisaoGeral";

const itens = [
  ["inicio", "Visão geral", LayoutDashboard],
  ["agenda", "Agenda", CalendarDays],
  ["clientes", "Clientes", UserRound],
  ["servicos", "Serviços", Scissors],
  ["profissionais", "Profissionais", Users],
  ["configuracoes", "Configurações", Settings2],
] as const;

export function PainelAdmin() {
  const [token, setToken] = useState(() => localStorage.getItem("encaixe_admin") ?? "");
  const [tenant, setTenant] = useState<Tenant | undefined>(() => {
    const salvo = localStorage.getItem("encaixe_tenant");
    return salvo ? JSON.parse(salvo) : undefined;
  });
  const [secao, setSecao] = useState("inicio");
  const [menu, setMenu] = useState(false);

  function entrar(novoToken: string, novoTenant: Tenant) {
    localStorage.setItem("encaixe_admin", novoToken);
    localStorage.setItem("encaixe_tenant", JSON.stringify(novoTenant));
    document.documentElement.style.setProperty("--cor-marca", novoTenant.primaryColor);
    setToken(novoToken);
    setTenant(novoTenant);
  }

  function sair() {
    localStorage.removeItem("encaixe_admin");
    localStorage.removeItem("encaixe_tenant");
    setToken("");
    setTenant(undefined);
  }

  useTenantTheme(tenant?.slug, tenant?.primaryColor);

  if (!token || !tenant) return <LoginAdmin aoEntrar={entrar} />;

  const atual = itens.find(([id]) => id === secao);

  return (
    <div className="admin" style={{ "--cor-marca": tenant.primaryColor } as CSSProperties}>
      {menu && <button type="button" className="admin__backdrop" aria-label="Fechar menu" onClick={() => setMenu(false)} />}

      <aside className={`admin__sidebar${menu ? " aberto" : ""}`}>
        <div className="admin__sidebar-top">
          <Marca />
          <button type="button" className="admin__close-drawer" aria-label="Fechar menu" onClick={() => setMenu(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="admin__tenant">
          <span className="admin__tenant-swatch" aria-hidden />
          <div style={{ minWidth: 0 }}>
            <strong>{tenant.name}</strong>
            <small>Painel · {tenant.slug}</small>
          </div>
        </div>

        <nav className="admin__nav" aria-label="Navegação do painel">
          {itens.map(([id, nome, Icone]) => (
            <button
              type="button"
              key={id}
              className={`admin__nav-btn${secao === id ? " ativo" : ""}`}
              onClick={() => {
                setSecao(id);
                setMenu(false);
              }}
            >
              <Icone size={18} />
              {nome}
            </button>
          ))}
        </nav>

        <button type="button" className="admin__logout" onClick={sair}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <main className="admin__main">
        <header className="admin__header">
          <button type="button" className="admin__menu-btn" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            <Menu size={20} />
          </button>
          <div>
            <small>{tenant.name}</small>
            <h1>{atual?.[1]}</h1>
          </div>
        </header>

        {secao === "inicio" && <VisaoGeral token={token} />}
        {secao === "agenda" && <Agenda token={token} />}
        {secao === "clientes" && <CadastroClientes token={token} />}
        {secao === "servicos" && <CadastroServicos token={token} />}
        {secao === "profissionais" && <CadastroProfissionais token={token} />}
        {secao === "configuracoes" && <Configuracoes token={token} tenant={tenant} atualizar={setTenant} />}
      </main>
    </div>
  );
}
