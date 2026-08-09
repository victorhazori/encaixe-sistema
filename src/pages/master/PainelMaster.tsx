import { useEffect, useState, type FormEvent } from "react";
import {
  Building2,
  ExternalLink,
  KeyRound,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Power,
  Settings2,
  Shield,
  Store,
  X,
} from "lucide-react";
import { TemaToggle } from "../../components/TemaToggle";
import { Aviso, Marca } from "../../components/ui";
import { api, moeda, type Tenant } from "../../lib/api";
import "../../styles/admin.css";
import "../../styles/master.css";

type Plano = {
  id: number;
  name: string;
  slug: string;
  priceCents: number;
  active: boolean;
  limits: Record<string, unknown>;
  features: Record<string, boolean>;
};

type TenantMaster = Tenant & {
  active: boolean;
  customersCount: number;
  appointmentsCount: number;
  admin?: { id: number; name: string; email: string } | null;
  plan?: { id: number; name: string; slug: string; features: Record<string, boolean> } | null;
  planId?: number | null;
  whatsapp?: {
    authorized?: boolean;
    enabled: boolean;
    phone?: string | null;
    mode: string;
  } | null;
};

type WaAuthItem = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  plan: { id: number; name: string; slug: string; features: Record<string, boolean> } | null;
  authorized: boolean;
  enabled: boolean;
  canUse: boolean;
  phone?: string | null;
};

type Secao = "negocios" | "planos" | "whatsapp" | "configuracoes";

const MENU: Array<[Secao, string, typeof Building2]> = [
  ["negocios", "Negócios", Building2],
  ["planos", "Planos", Shield],
  ["whatsapp", "WhatsApp", MessageCircle],
  ["configuracoes", "Configurações", Settings2],
];

export function PainelMaster() {
  const [token, setToken] = useState(() => localStorage.getItem("encaixe_master") ?? "");
  const [email, setEmail] = useState("master@encaixe.local");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [lista, setLista] = useState<TenantMaster[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [secao, setSecao] = useState<Secao>("negocios");
  const [menu, setMenu] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [waAuth, setWaAuth] = useState<WaAuthItem[]>([]);
  const [config, setConfig] = useState<{ masterEmail: string; whatsappProvider: string; evolutionConfigured: boolean; evolutionUrl: string } | null>(null);

  const titulo = MENU.find(([id]) => id === secao)?.[1] ?? "Master";

  async function carregar(masterToken = token) {
    const [tenants, plans] = await Promise.all([
      api<TenantMaster[]>("/master/tenants", {}, masterToken),
      api<Plano[]>("/master/plans", {}, masterToken),
    ]);
    setLista(tenants);
    setPlanos(plans);
  }

  async function carregarWaAuth(masterToken = token) {
    const itens = await api<WaAuthItem[]>("/master/whatsapp", {}, masterToken);
    setWaAuth(itens);
  }

  useEffect(() => {
    if (!token) return;
    carregar().catch((e: Error) => {
      setErro(e.message);
      if (e.message.includes("Autenticação") || e.message.includes("Token")) {
        localStorage.removeItem("encaixe_master");
        setToken("");
      }
    });
    api<typeof config>("/master/config", {}, token).then(setConfig).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token || secao !== "whatsapp") return;
    carregarWaAuth().catch((e: Error) => setErro(e.message));
  }, [token, secao]);

  async function entrar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    try {
      const resultado = await api<{ token: string }>("/master/login", {
        method: "POST",
        body: JSON.stringify({ email, password: senha }),
      });
      localStorage.setItem("encaixe_master", resultado.token);
      setToken(resultado.token);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no login.");
    }
  }

  function sair() {
    localStorage.removeItem("encaixe_master");
    setToken("");
    setLista([]);
  }

  async function criarNegocio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setOk("");
    const f = new FormData(evento.currentTarget);
    try {
      const novo = await api<TenantMaster & { loginHint: { slug: string; email: string } }>("/master/tenants", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          slug: String(f.get("slug")).trim().toLowerCase(),
          phone: f.get("phone") || null,
          address: f.get("address") || null,
          primaryColor: f.get("primaryColor") || "#2f6fed",
          planId: Number(f.get("planId")) || undefined,
          adminName: f.get("adminName"),
          adminEmail: f.get("adminEmail"),
          adminPassword: f.get("adminPassword"),
          seedDefaults: true,
        }),
      }, token);
      setOk(`Conta criada: /${novo.loginHint.slug} · painel /${novo.loginHint.slug}/admin · ${novo.loginHint.email}`);
      evento.currentTarget.reset();
      setMostrarForm(false);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar a conta.");
    }
  }

  async function mudarPlano(item: TenantMaster, planId: number) {
    await api(`/master/tenants/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ planId }),
    }, token);
    setOk(`Plano de ${item.name} atualizado.`);
    await carregar();
  }

  async function alternarAtivo(item: TenantMaster) {
    await api(`/master/tenants/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !item.active }),
    }, token);
    await carregar();
  }

  async function resetSenha(item: TenantMaster) {
    const password = window.prompt(`Nova senha para o admin de ${item.name} (mín. 8 caracteres):`);
    if (!password || password.length < 8) return;
    await api(`/master/tenants/${item.id}/reset-admin`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }, token);
    setOk(`Senha do admin de ${item.name} atualizada.`);
  }

  async function entrarNoNegocio(item: TenantMaster) {
    const okConfirm = window.confirm(`Abrir “${item.name}” em modo suporte?`);
    if (!okConfirm) return;
    const sessao = await api<{ token: string; tenant: Tenant }>(`/master/tenants/${item.id}/impersonate`, {
      method: "POST",
    }, token);
    localStorage.setItem("encaixe_admin", sessao.token);
    localStorage.setItem("encaixe_tenant", JSON.stringify(sessao.tenant));
    localStorage.setItem("encaixe_master_view", "1");
    window.location.href = `/${sessao.tenant.slug}/admin`;
  }

  async function salvarPlano(plano: Plano, evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    await api(`/master/plans/${plano.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: f.get("name"),
        priceCents: Math.round(Number(f.get("price")) * 100),
        features: {
          whatsapp_bot: f.get("whatsapp_bot") === "on",
          whatsapp_ai: f.get("whatsapp_ai") === "on",
          reminders: f.get("reminders") === "on",
          multi_professional: f.get("multi_professional") === "on",
          custom_branding: f.get("custom_branding") === "on",
        },
        limits: {
          professionals: Number(f.get("professionals")) || 3,
          appointmentsMonth: f.get("appointmentsMonth") ? Number(f.get("appointmentsMonth")) : null,
        },
      }),
    }, token);
    setOk(`Plano ${plano.name} salvo.`);
    await carregar();
  }

  async function autorizarWhatsapp(item: WaAuthItem, authorized: boolean) {
    setErro("");
    setOk("");
    try {
      await api(`/master/whatsapp/${item.id}/authorize`, {
        method: "PATCH",
        body: JSON.stringify({ authorized }),
      }, token);
      setOk(authorized
        ? `WhatsApp autorizado para ${item.name}. A loja configura no painel admin.`
        : `Autorização removida de ${item.name}.`);
      await carregarWaAuth();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar a autorização.");
    }
  }

  if (!token) {
    return (
      <main className="master-login-shell">
        <div className="master-login-card">
          <div className="master-login-card__top">
            <Marca />
            <TemaToggle />
          </div>
          <h1>Painel mestre</h1>
          <p>Gerencie negócios, planos e WhatsApp da plataforma Encaixe.</p>
          <form className="formulario" onSubmit={entrar}>
            <label>E-mail master<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} autoComplete="current-password" /></label>
            {erro && <Aviso erro>{erro}</Aviso>}
            <button className="botao-principal">Entrar</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="admin master-shell">
      {menu && <button type="button" className="admin__backdrop" aria-label="Fechar menu" onClick={() => setMenu(false)} />}

      <aside className={`admin__sidebar${menu ? " aberto" : ""}`}>
        <div className="admin__sidebar-top">
          <Marca />
          <button type="button" className="admin__close-drawer" aria-label="Fechar menu" onClick={() => setMenu(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="admin__tenant master-badge">
          <span className="admin__tenant-swatch" aria-hidden />
          <div style={{ minWidth: 0 }}>
            <strong>Encaixe Master</strong>
            <small>Plataforma · {lista.length} negócios</small>
          </div>
        </div>

        <nav className="admin__nav" aria-label="Menu master">
          {MENU.map(([id, nome, Icone]) => (
            <button
              type="button"
              key={id}
              className={`admin__nav-btn${secao === id ? " ativo" : ""}`}
              onClick={() => { setSecao(id); setMenu(false); }}
            >
              <Icone size={18} />
              {nome}
            </button>
          ))}
        </nav>

        <TemaToggle />
        <button type="button" className="admin__logout" onClick={sair}>
          <LogOut size={18} /> Sair
        </button>
      </aside>

      <main className="admin__main">
        <header className="admin__header">
          <button type="button" className="admin__menu-btn" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            <Menu size={20} />
          </button>
          <div>
            <small>Encaixe · plataforma</small>
            <h1>{titulo}</h1>
          </div>
          {secao === "negocios" && (
            <button className="botao-principal" type="button" onClick={() => setMostrarForm((v) => !v)}>
              <Plus size={18} /> Nova conta
            </button>
          )}
        </header>

        {erro && <Aviso erro>{erro}</Aviso>}
        {ok && <Aviso>{ok}</Aviso>}

        {secao === "negocios" && (
          <section className="master-section">
            {mostrarForm && (
              <form className="admin-panel master-form" onSubmit={criarNegocio}>
                <h2>Novo negócio</h2>
                <div className="master-form-grid">
                  <label className="admin-field"><span>Nome</span><input name="name" required placeholder="Barbearia Centro" /></label>
                  <label className="admin-field"><span>Slug (URL)</span><input name="slug" required placeholder="barbearia-centro" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
                  <label className="admin-field"><span>Telefone</span><input name="phone" /></label>
                  <label className="admin-field"><span>Endereço</span><input name="address" /></label>
                  <label className="admin-field"><span>Cor base</span><input name="primaryColor" type="color" defaultValue="#2f6fed" /></label>
                  <label className="admin-field">
                    <span>Plano</span>
                    <select name="planId" defaultValue={planos.find((p) => p.slug === "basic")?.id}>
                      {planos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="admin-field"><span>Nome do admin</span><input name="adminName" required defaultValue="Administrador" /></label>
                  <label className="admin-field"><span>E-mail do admin</span><input name="adminEmail" type="email" required /></label>
                  <label className="admin-field"><span>Senha inicial</span><input name="adminPassword" type="password" required minLength={8} /></label>
                </div>
                <button className="botao-principal" type="submit">Criar conta</button>
              </form>
            )}

            <div className="master-tenant-grid">
              {lista.map((item) => (
                <article key={item.id} className="master-tenant-card">
                  <div className="master-tenant-card__head">
                    <span className="master-tenant-dot" style={{ background: item.primaryColor }} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>/{item.slug} · {item.plan?.name ?? "Sem plano"}{!item.active ? " · inativo" : ""}</small>
                    </div>
                  </div>
                  <p className="master-tenant-meta">
                    {item.customersCount} clientes · {item.appointmentsCount} agendamentos
                    {item.admin ? ` · ${item.admin.email}` : ""}
                    {item.whatsapp?.authorized ? (item.whatsapp.enabled ? " · WhatsApp ativo" : " · WhatsApp autorizado") : ""}
                  </p>
                  <label className="admin-field">
                    <span>Plano</span>
                    <select
                      value={item.planId ?? ""}
                      onChange={(e) => mudarPlano(item, Number(e.target.value))}
                    >
                      {planos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <div className="master-tenant-actions">
                    <a href={`/${item.slug}`} target="_blank" rel="noreferrer" className="admin-btn admin-btn--ghost"><ExternalLink size={14} /> Público</a>
                    <a href={`/${item.slug}/admin`} target="_blank" rel="noreferrer" className="admin-btn admin-btn--ghost"><ExternalLink size={14} /> Admin</a>
                    <button type="button" className="admin-btn admin-btn--primary" onClick={() => entrarNoNegocio(item)}><Store size={14} /> Suporte</button>
                    <button type="button" className="admin-btn admin-btn--ghost" onClick={() => resetSenha(item)}><KeyRound size={14} /></button>
                    <button type="button" className="admin-btn admin-btn--ghost" onClick={() => alternarAtivo(item)}><Power size={14} /></button>
                  </div>
                </article>
              ))}
              {!lista.length && <p className="admin-empty">Nenhuma conta ainda. Crie a primeira.</p>}
            </div>
          </section>
        )}

        {secao === "planos" && (
          <section className="master-plans">
            {planos.map((plano) => (
              <form key={plano.id} className="admin-panel master-plan-card" onSubmit={(e) => salvarPlano(plano, e)}>
                <div className="master-plan-card__title">
                  <h2>{plano.name}</h2>
                  <span className="master-plan-slug">{plano.slug}</span>
                </div>
                <div className="master-form-grid">
                  <label className="admin-field"><span>Nome</span><input name="name" defaultValue={plano.name} /></label>
                  <label className="admin-field"><span>Preço mensal (R$)</span><input name="price" type="number" step="0.01" defaultValue={(plano.priceCents / 100).toFixed(2)} /></label>
                  <label className="admin-field"><span>Profissionais</span><input name="professionals" type="number" defaultValue={Number(plano.limits?.professionals ?? 3)} /></label>
                  <label className="admin-field"><span>Agendamentos/mês</span><input name="appointmentsMonth" type="number" defaultValue={plano.limits?.appointmentsMonth == null ? "" : Number(plano.limits.appointmentsMonth)} placeholder="Ilimitado" /></label>
                </div>
                <div className="master-feature-grid">
                  {(["whatsapp_bot", "whatsapp_ai", "reminders", "multi_professional", "custom_branding"] as const).map((feat) => (
                    <label key={feat} className="master-check">
                      <input type="checkbox" name={feat} defaultChecked={Boolean(plano.features?.[feat])} />
                      <span>{feat}</span>
                    </label>
                  ))}
                </div>
                <p className="hint">Preço atual: {moeda(plano.priceCents)}</p>
                <button className="botao-principal" type="submit">Salvar plano</button>
              </form>
            ))}
          </section>
        )}

        {secao === "whatsapp" && (
          <section className="master-wa">
            <div className="admin-panel">
              <div className="admin-panel__title">
                <h2>Autorização WhatsApp</h2>
                <p>
                  O master só libera o módulo. Número, mensagens, QR e simulador ficam no painel da loja
                  (WhatsApp / Simulador), igual ao Brasa.
                </p>
              </div>
              <p className="hint">
                Para autorizar, o plano do negócio precisa ter a feature <code>whatsapp_bot</code> (Pro/Enterprise).
              </p>
            </div>

            <div className="master-wa-auth-list">
              {waAuth.map((item) => {
                const planoOk = Boolean(item.plan?.features?.whatsapp_bot);
                return (
                  <article key={item.id} className="admin-panel master-wa-auth-card">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="hint">
                        /{item.slug} · {item.plan?.name ?? "sem plano"}
                        {item.enabled ? " · bot ativo na loja" : ""}
                        {item.phone ? ` · ${item.phone}` : ""}
                      </p>
                      {!planoOk && (
                        <p className="hint">Plano sem WhatsApp Bot — ajuste em Planos ou mude o plano do negócio.</p>
                      )}
                    </div>
                    <label className="master-check">
                      <input
                        type="checkbox"
                        checked={item.authorized}
                        disabled={!planoOk && !item.authorized}
                        onChange={(e) => autorizarWhatsapp(item, e.target.checked)}
                      />
                      <span>{item.authorized ? "Autorizado" : "Não autorizado"}</span>
                    </label>
                  </article>
                );
              })}
              {!waAuth.length && <p className="hint">Nenhum negócio cadastrado.</p>}
            </div>
          </section>
        )}

        {secao === "configuracoes" && (
          <section className="admin-panel master-config">
            <h2>Configurações da plataforma</h2>
            <div className="master-config-grid">
              <article>
                <strong>Acesso master</strong>
                <p>E-mail atual: {config?.masterEmail ?? "—"}</p>
                <p className="hint">Defina MASTER_EMAIL e MASTER_PASSWORD no .env (obrigatório em produção).</p>
              </article>
              <article>
                <strong>WhatsApp</strong>
                <p>Provider: {config?.whatsappProvider ?? "console"}</p>
                <p className="hint">
                  Local: use <code>console</code> + simulador (sem Docker), igual ao Brasa.
                  QR real só com Evolution já disponível (opcional).
                </p>
              </article>
              <article>
                <strong>Aparência</strong>
                <p>Use o botão Claro/Escuro no menu. A cor base de cada negócio é definida no painel do cliente.</p>
                <TemaToggle />
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
