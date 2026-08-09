import { useEffect, useMemo, useState, type CSSProperties, type ComponentType } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CalendarOff,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  Palette,
  Scissors,
  ShieldAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Navigate, useParams } from "react-router";
import { TemaToggle } from "../../components/TemaToggle";
import { Marca } from "../../components/ui";
import { type Tenant } from "../../lib/api";
import { aplicarCorMarca, useTenantTheme } from "../../lib/theme";
import "../../styles/admin.css";
import { Agenda } from "./Agenda";
import { CadastroClientes } from "./CadastroClientes";
import { CadastroProfissionais } from "./CadastroProfissionais";
import { CadastroServicos } from "./CadastroServicos";
import { Configuracoes, type AbaConfig } from "./Configuracoes";
import { LoginAdmin } from "./LoginAdmin";
import { VisaoGeral } from "./VisaoGeral";
import { WhatsAppBot } from "./WhatsAppBot";
import { WhatsAppSandbox } from "./WhatsAppSandbox";

type Secao =
  | "inicio"
  | "agenda"
  | "clientes"
  | "servicos"
  | "profissionais"
  | "whatsapp"
  | "whatsapp-teste"
  | "config-identidade"
  | "config-horarios"
  | "config-bloqueios";

type NavItem = {
  id: Secao;
  label: string;
  icon: ComponentType<{ size?: number }>;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { id: "inicio", label: "Visão geral", icon: LayoutDashboard },
      { id: "agenda", label: "Agenda", icon: CalendarDays },
      { id: "clientes", label: "Clientes", icon: UserRound },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    items: [
      { id: "servicos", label: "Serviços", icon: Scissors },
      { id: "profissionais", label: "Profissionais", icon: Users },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    items: [
      { id: "whatsapp", label: "Integração e bot", icon: MessageCircle },
      { id: "whatsapp-teste", label: "Simulador de chat", icon: MessagesSquare },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    items: [
      { id: "config-identidade", label: "Identidade e dados", icon: Palette },
      { id: "config-horarios", label: "Horários", icon: Clock3 },
      { id: "config-bloqueios", label: "Bloqueios", icon: CalendarOff },
    ],
  },
];

const titulos: Record<Secao, string> = {
  inicio: "Visão geral",
  agenda: "Agenda",
  clientes: "Clientes",
  servicos: "Serviços",
  profissionais: "Profissionais",
  whatsapp: "WhatsApp",
  "whatsapp-teste": "Simulador WhatsApp",
  "config-identidade": "Identidade e dados",
  "config-horarios": "Horários",
  "config-bloqueios": "Bloqueios",
};

const CHAVE_MASTER_VIEW = "encaixe_master_view";

function grupoDaSecao(secao: Secao) {
  return navGroups.find((g) => g.items.some((i) => i.id === secao))?.id ?? null;
}

export function PainelAdmin() {
  const { slug: slugUrl = "" } = useParams();
  const [token, setToken] = useState(() => localStorage.getItem("encaixe_admin") ?? "");
  const [tenant, setTenant] = useState<Tenant | undefined>(() => {
    const salvo = localStorage.getItem("encaixe_tenant");
    return salvo ? JSON.parse(salvo) : undefined;
  });
  const [modoSuporte] = useState(() => localStorage.getItem(CHAVE_MASTER_VIEW) === "1");
  const [secao, setSecao] = useState<Secao>("inicio");
  const [menu, setMenu] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const activeGroupId = useMemo(() => grupoDaSecao(secao), [secao]);

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroups((prev) => (prev[activeGroupId] === undefined ? { ...prev, [activeGroupId]: true } : prev));
  }, [activeGroupId]);

  useEffect(() => {
    document.body.classList.toggle("admin-drawer-open", menu);
    if (menu) {
      setOpenGroups(Object.fromEntries(navGroups.map((g) => [g.id, true])));
    }
    return () => document.body.classList.remove("admin-drawer-open");
  }, [menu]);

  // Sessão de outra loja → manda para o /{slug}/admin correto
  useEffect(() => {
    if (!token || !tenant?.slug || !slugUrl) return;
    if (tenant.slug !== slugUrl) {
      window.location.replace(`/${tenant.slug}/admin`);
    }
  }, [token, tenant?.slug, slugUrl]);

  function entrar(novoToken: string, novoTenant: Tenant) {
    localStorage.setItem("encaixe_admin", novoToken);
    localStorage.setItem("encaixe_tenant", JSON.stringify(novoTenant));
    localStorage.removeItem(CHAVE_MASTER_VIEW);
    aplicarCorMarca(novoTenant.primaryColor);
    setToken(novoToken);
    setTenant(novoTenant);
  }

  function limparSessaoAdmin() {
    localStorage.removeItem("encaixe_admin");
    localStorage.removeItem("encaixe_tenant");
    localStorage.removeItem(CHAVE_MASTER_VIEW);
  }

  function voltarAoMaster() {
    limparSessaoAdmin();
    window.location.href = "/master";
  }

  function sair() {
    if (modoSuporte) {
      voltarAoMaster();
      return;
    }
    limparSessaoAdmin();
    setToken("");
    setTenant(undefined);
  }

  function isGroupOpen(groupId: string) {
    if (openGroups[groupId] !== undefined) return openGroups[groupId];
    return activeGroupId === groupId;
  }

  function toggleGroup(groupId: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !isGroupOpen(groupId),
    }));
  }

  function irPara(id: Secao) {
    setSecao(id);
    setMenu(false);
  }

  useTenantTheme(tenant?.slug ?? slugUrl, tenant?.primaryColor);

  if (!slugUrl) return <Navigate to="/master" replace />;

  if (!token || !tenant) return <LoginAdmin slugFixo={slugUrl} aoEntrar={entrar} />;

  if (tenant.slug !== slugUrl) {
    return <main className="centro">Redirecionando para /{tenant.slug}/admin…</main>;
  }

  const abaConfig: AbaConfig =
    secao === "config-horarios" ? "horarios" : secao === "config-bloqueios" ? "bloqueios" : "identidade";

  return (
    <div
      className={`admin${modoSuporte ? " admin--suporte" : ""}`}
      style={{ "--cor-marca": tenant.primaryColor } as CSSProperties}
    >
      {modoSuporte && (
        <div className="admin-suporte-banner" role="status">
          <div className="admin-suporte-banner__texto">
            <ShieldAlert size={18} aria-hidden />
            <span>
              <strong>Modo suporte (Master)</strong>
              {" · "}você está no painel de <em>{tenant.name}</em>. Alterações afetam este negócio.
            </span>
          </div>
          <button type="button" className="admin-suporte-banner__voltar" onClick={voltarAoMaster}>
            <ArrowLeft size={16} />
            Voltar ao Master
          </button>
        </div>
      )}

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
            <small>{modoSuporte ? "Suporte Master · " : "Painel · "}{tenant.slug}</small>
          </div>
        </div>

        <nav className="admin__nav" aria-label="Navegação do painel">
          {navGroups.map((group) => {
            const open = isGroupOpen(group.id);
            const groupActive = activeGroupId === group.id;
            return (
              <div
                key={group.id}
                className={`admin__nav-group${open ? " is-open" : ""}${groupActive ? " is-active" : ""}`}
              >
                <button
                  type="button"
                  className="admin__nav-group-toggle"
                  aria-expanded={open}
                  onClick={() => toggleGroup(group.id)}
                >
                  <span>{group.label}</span>
                  <ChevronDown size={16} className="admin__nav-chevron" />
                </button>
                {open && (
                  <div className="admin__nav-sub">
                    {group.items.map((item) => {
                      const Icone = item.icon;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          className={`admin__nav-btn${secao === item.id ? " ativo" : ""}`}
                          onClick={() => irPara(item.id)}
                        >
                          <Icone size={18} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="admin__side-foot">
          <TemaToggle />
          {modoSuporte ? (
            <button type="button" className="admin__logout admin__logout--master" onClick={voltarAoMaster}>
              <ArrowLeft size={18} />
              Voltar ao Master
            </button>
          ) : (
            <button type="button" className="admin__logout" onClick={sair}>
              <LogOut size={18} />
              Sair
            </button>
          )}
        </div>
      </aside>

      <main className="admin__main">
        <header className="admin__header">
          <button type="button" className="admin__menu-btn" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            <Menu size={20} />
          </button>
          <div>
            <small>{modoSuporte ? `Suporte · ${tenant.name}` : tenant.name}</small>
            <h1>{titulos[secao]}</h1>
          </div>
        </header>

        {secao === "inicio" && <VisaoGeral token={token} />}
        {secao === "agenda" && <Agenda token={token} />}
        {secao === "clientes" && <CadastroClientes token={token} />}
        {secao === "servicos" && <CadastroServicos token={token} />}
        {secao === "profissionais" && <CadastroProfissionais token={token} />}
        {secao === "whatsapp" && <WhatsAppBot token={token} onOpenSandbox={() => irPara("whatsapp-teste")} />}
        {secao === "whatsapp-teste" && <WhatsAppSandbox token={token} />}
        {(secao === "config-identidade" || secao === "config-horarios" || secao === "config-bloqueios") && (
          <Configuracoes token={token} tenant={tenant} atualizar={setTenant} aba={abaConfig} />
        )}
      </main>
    </div>
  );
}
