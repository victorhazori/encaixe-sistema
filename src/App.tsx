import { useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Brush,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Contact,
  LogOut,
  Menu,
  Plus,
  Scissors,
  Settings2,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Link, Navigate, Route, Routes, useParams } from "react-router";

type Tenant = { id: number; name: string; slug: string; phone?: string; address?: string; primaryColor: string; logoUrl?: string };
type Service = { id: number; name: string; description?: string; durationMinutes: number; priceCents: number; icon?: string; active: boolean };
type Professional = { id: number; name: string; bio?: string; avatarUrl?: string; active: boolean };
type Customer = { id: number; name: string; phone: string; email?: string | null; active: boolean };
type Appointment = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: string;
  customerName?: string;
  professionalName?: string;
  serviceName?: string;
  notes?: string | null;
};
type PerfilCliente = { name: string; email?: string | null; phone: string };

async function api<T>(caminho: string, opcoes: RequestInit = {}, token?: string): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
  });
  const dados = resposta.status === 204 ? undefined : await resposta.json();
  if (!resposta.ok) throw new Error(dados?.erro ?? "Não foi possível concluir a operação.");
  return dados as T;
}

function moeda(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

function dataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}

function iconeServico(chave?: string) {
  const mapa: Record<string, typeof Scissors> = {
    scissors: Scissors,
    sparkles: Sparkles,
    razor: Brush,
    brush: Brush,
    clock: Clock3,
    users: Users,
  };
  return mapa[chave ?? "scissors"] ?? Scissors;
}

function Marca({ compacta = false }: { compacta?: boolean }) {
  return <div className="marca"><span className="marca-simbolo">E</span>{!compacta && <strong>Encaixe</strong>}</div>;
}

function useTenantTheme(slug?: string, fallbackColor?: string) {
  const [tenant, setTenant] = useState<Tenant>();

  useEffect(() => {
    const cor = fallbackColor || tenant?.primaryColor;
    if (cor) document.documentElement.style.setProperty("--cor-marca", cor);
  }, [fallbackColor, tenant?.primaryColor]);

  useEffect(() => {
    if (!slug) return;
    let ativo = true;
    api<Tenant>(`/public/${slug}`)
      .then((t) => {
        if (!ativo) return;
        setTenant(t);
        document.documentElement.style.setProperty("--cor-marca", t.primaryColor);
      })
      .catch(() => { /* slug inválido — mantém fallback */ });
    return () => { ativo = false; };
  }, [slug]);

  return tenant;
}

function Aviso({ children, erro = false }: { children: ReactNode; erro?: boolean }) {
  return <p className={erro ? "aviso erro" : "aviso"}>{children}</p>;
}

function Progresso({ passo }: { passo: number }) {
  const etapas = ["Serviços", "Profissional", "Data", "Confirmar"];
  return (
    <ol className="progresso-passos">
      {etapas.map((nome, i) => {
        const n = i + 1;
        return (
          <li key={nome} className={passo === n ? "atual" : passo > n ? "feito" : ""}>
            <span>{passo > n ? <Check size={14} /> : n}</span>
            <small>{nome}</small>
          </li>
        );
      })}
    </ol>
  );
}

function CalendarioMes({
  ano,
  mes,
  selecionado,
  disponibilidade,
  onMudarMes,
  onSelecionar,
}: {
  ano: number;
  mes: number;
  selecionado?: string;
  disponibilidade: Record<string, number>;
  onMudarMes: (ano: number, mes: number) => void;
  onSelecionar: (data: string) => void;
}) {
  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const primeiro = new Date(ano, mes - 1, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const offset = primeiro.getDay();
  const titulo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(primeiro);
  const celulas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];

  function navegar(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    onMudarMes(d.getFullYear(), d.getMonth() + 1);
  }

  return (
    <div className="calendario">
      <div className="calendario-cabecalho">
        <button type="button" aria-label="Mês anterior" onClick={() => navegar(-1)}><ChevronLeft size={18} /></button>
        <strong>{titulo}</strong>
        <button type="button" aria-label="Próximo mês" onClick={() => navegar(1)}><ChevronRight size={18} /></button>
      </div>
      <div className="calendario-semana">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={`${d}${i}`}>{d}</span>)}
      </div>
      <div className="calendario-grade">
        {celulas.map((dia, i) => {
          if (!dia) return <span key={`vazio-${i}`} className="dia vazio" />;
          const data = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const slots = disponibilidade[data] ?? 0;
          const passado = data < hojeStr;
          const desabilitado = passado || slots === 0;
          return (
            <button
              type="button"
              key={data}
              className={`dia ${selecionado === data ? "selecionado" : ""} ${slots > 0 && !passado ? "disponivel" : ""} ${desabilitado ? "desabilitado" : ""}`}
              disabled={desabilitado}
              onClick={() => onSelecionar(data)}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AgendamentoPublico() {
  const { slug = "" } = useParams();
  const chaveToken = `encaixe_cliente_${slug}`;
  const [tokenCliente, setTokenCliente] = useState(() => localStorage.getItem(chaveToken) ?? "");
  const [perfil, setPerfil] = useState<PerfilCliente>();
  const [tenant, setTenant] = useState<Tenant>();
  const [servicos, setServicos] = useState<Service[]>([]);
  const [selecionados, setSelecionados] = useState<Service[]>([]);
  const [profissionais, setProfissionais] = useState<Professional[]>([]);
  const [profissional, setProfissional] = useState<Professional>();
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState(() => new Date().getMonth() + 1);
  const [disponibilidadeMes, setDisponibilidadeMes] = useState<Record<string, number>>({});
  const [data, setData] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregandoMes, setCarregandoMes] = useState(false);

  useTenantTheme(slug, tenant?.primaryColor);

  const idsServicos = useMemo(() => selecionados.map((s) => s.id), [selecionados]);
  const totalDuracao = selecionados.reduce((s, i) => s + i.durationMinutes, 0);
  const totalPreco = selecionados.reduce((s, i) => s + i.priceCents, 0);

  const passo = !selecionados.length ? 1 : !profissional ? 2 : !slot ? 3 : 4;

  useEffect(() => {
    Promise.all([
      api<Tenant>(`/public/${slug}`),
      api<Service[]>(`/public/${slug}/services`),
    ]).then(([t, s]) => {
      setTenant(t);
      setServicos(s);
      document.documentElement.style.setProperty("--cor-marca", t.primaryColor);
    }).catch((e: Error) => setErro(e.message));
  }, [slug]);

  useEffect(() => {
    if (!tokenCliente) { setPerfil(undefined); return; }
    api<PerfilCliente>("/customer/me", {}, tokenCliente)
      .then(setPerfil)
      .catch(() => {
        localStorage.removeItem(chaveToken);
        setTokenCliente("");
      });
  }, [tokenCliente, chaveToken]);

  useEffect(() => {
    if (!idsServicos.length) {
      setProfissionais([]);
      setProfissional(undefined);
      return;
    }
    api<Professional[]>(`/public/${slug}/professionals?serviceIds=${idsServicos.join(",")}`)
      .then((lista) => {
        setProfissionais(lista);
        setProfissional((atual) => (atual && lista.some((p) => p.id === atual.id) ? atual : undefined));
        setSlots([]);
        setSlot("");
        setData("");
      })
      .catch((e: Error) => setErro(e.message));
  }, [idsServicos, slug]);

  useEffect(() => {
    if (!profissional || !idsServicos.length) {
      setDisponibilidadeMes({});
      return;
    }
    setCarregandoMes(true);
    api<Record<string, number>>(
      `/public/${slug}/availability-month?professionalId=${profissional.id}&serviceIds=${idsServicos.join(",")}&year=${ano}&month=${mes}`,
    )
      .then(setDisponibilidadeMes)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregandoMes(false));
  }, [ano, mes, profissional, idsServicos, slug]);

  useEffect(() => {
    if (!profissional || !idsServicos.length || !data) return;
    api<string[]>(`/public/${slug}/availability?serviceIds=${idsServicos.join(",")}&professionalId=${profissional.id}&date=${data}`)
      .then((lista) => { setSlots(lista); setSlot(""); })
      .catch((e: Error) => setErro(e.message));
  }, [data, profissional, idsServicos, slug]);

  function alternarServico(item: Service) {
    setSelecionados((atuais) => {
      const existe = atuais.some((s) => s.id === item.id);
      return existe ? atuais.filter((s) => s.id !== item.id) : [...atuais, item];
    });
    setMensagem("");
  }

  function sairCliente() {
    localStorage.removeItem(chaveToken);
    setTokenCliente("");
    setPerfil(undefined);
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    const form = new FormData(evento.currentTarget);
    try {
      const corpo: Record<string, unknown> = {
        serviceIds: idsServicos,
        professionalId: profissional!.id,
        startsAt: slot,
      };
      if (!perfil) {
        corpo.customer = {
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
        };
      }
      await api(`/public/${slug}/appointments`, {
        method: "POST",
        body: JSON.stringify(corpo),
      }, tokenCliente || undefined);
      setMensagem("Seu horário está confirmado. Até breve!");
      setSlot("");
      setSelecionados([]);
      setProfissional(undefined);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao agendar.");
    }
  }

  if (erro && !tenant) return <main className="centro"><Marca /><Aviso erro>{erro}</Aviso></main>;
  if (!tenant) return <main className="centro">Carregando agenda…</main>;

  return (
    <div className="publico" style={{ "--cor-marca": tenant.primaryColor } as CSSProperties}>
      <header className="cabecalho-publico cabecalho-auth">
        <div className="cabecalho-marca">
          {tenant.logoUrl
            ? <img src={tenant.logoUrl} alt={tenant.name} className="logo-tenant" />
            : <Marca />}
          <div className="cabecalho-loja">
            <strong>{tenant.name}</strong>
            {tenant.address && <small>{tenant.address}</small>}
          </div>
        </div>
        <div className="auth-area">
          {tokenCliente && perfil ? (
            <>
              <span className="ola">Olá, {perfil.name.split(" ")[0]}</span>
              <button type="button" className="link-sutil" onClick={sairCliente}><LogOut size={16} /> Sair</button>
            </>
          ) : (
            <Link to={`/cliente/${slug}`} className="link-sutil">Entrar</Link>
          )}
          <a href="#agendar" className="botao-cabecalho">Agendar</a>
        </div>
      </header>

      <main className="reserva" id="agendar">
        <section className="apresentacao">
          <span className="sobretitulo"><Sparkles size={14} /> Agenda aberta</span>
          <h1>Seu tempo, bem <em>encaixado.</em></h1>
          <p>Combine serviços, escolha quem atende e reserve no calendário — sem volta e meia no telefone.</p>
          <div className="hero-foto">
            <img src="/images/hero-barbearia.jpg" alt="Interior da barbearia com cadeiras e iluminação acolhedora" />
            <div className="hero-foto-overlay">{tenant.name}</div>
          </div>
          <div className="galeria-fotos">
            <figure>
              <img src="/images/servicos.jpg" alt="Detalhe de serviços de corte e barba" />
            </figure>
            <figure>
              <img src="/images/ambiente.jpg" alt="Ambiente da barbearia" />
            </figure>
            <figure>
              <img src="/images/atendimento.jpg" alt="Atendimento personalizado ao cliente" />
            </figure>
          </div>
          <div className="estabelecimento">
            <div className="avatar-loja">{tenant.name.charAt(0)}</div>
            <div>
              <strong>{tenant.name}</strong>
              <small>{tenant.phone || "Agendamento online"}</small>
            </div>
          </div>
        </section>

        <section className="painel-reserva">
          <Progresso passo={passo} />

          <div className={`passo-bloco ${passo === 1 ? "visivel" : ""}`}>
            <div className="passo"><b>01</b><span>Escolha os serviços</span></div>
            <div className="grade-opcoes">
              {servicos.map((item) => {
                const Icone = iconeServico(item.icon);
                const ativo = selecionados.some((s) => s.id === item.id);
                return (
                  <button
                    type="button"
                    className={`servico-card ${ativo ? "ativo" : ""}`}
                    onClick={() => alternarServico(item)}
                    key={item.id}
                  >
                    <span className="servico-icone"><Icone size={20} /></span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.durationMinutes} min · {moeda(item.priceCents)}</small>
                    </span>
                    {ativo && <Check className="check-servico" size={16} />}
                  </button>
                );
              })}
            </div>
          </div>

          {selecionados.length > 0 && (
            <div className="passo-bloco visivel">
              <div className="passo"><b>02</b><span>Escolha o profissional</span></div>
              <div className="grade-opcoes">
                {profissionais.map((item) => (
                  <button
                    type="button"
                    className={`cartao-opcao ${profissional?.id === item.id ? "ativo" : ""}`}
                    onClick={() => { setProfissional(item); setData(""); setSlot(""); }}
                    key={item.id}
                  >
                    <div className="avatar">{item.name.charAt(0)}</div>
                    <span><strong>{item.name}</strong><small>{item.bio}</small></span>
                  </button>
                ))}
                {!profissionais.length && <small className="hint">Nenhum profissional atende todos os serviços selecionados.</small>}
              </div>
            </div>
          )}

          {profissional && (
            <div className="passo-bloco visivel">
              <div className="passo"><b>03</b><span>Escolha data e horário</span></div>
              {carregandoMes && <small className="hint">Carregando disponibilidade…</small>}
              <div className="agenda-quando">
                <CalendarioMes
                  ano={ano}
                  mes={mes}
                  selecionado={data}
                  disponibilidade={disponibilidadeMes}
                  onMudarMes={(a, m) => { setAno(a); setMes(m); setData(""); }}
                  onSelecionar={setData}
                />
                {data && (
                  <div className="horarios">
                    {slots.map((hora) => (
                      <button type="button" className={slot === hora ? "ativo" : ""} onClick={() => setSlot(hora)} key={hora}>
                        {new Date(hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    ))}
                    {!slots.length && <small>Nenhum horário disponível nesta data.</small>}
                  </div>
                )}
              </div>
            </div>
          )}

          {slot && !mensagem && (
            <form className="formulario passo-bloco visivel" onSubmit={confirmar}>
              <div className="passo"><b>04</b><span>Confirmar</span></div>
              <div className="resumo-confirmacao">
                <p><strong>{selecionados.map((s) => s.name).join(" + ")}</strong></p>
                <small>{profissional!.name} · {dataHora(slot)} · {totalDuracao} min · {moeda(totalPreco)}</small>
              </div>
              {perfil ? (
                <p className="hint-logado">Agendando como <strong>{perfil.name}</strong> ({perfil.phone})</p>
              ) : (
                <>
                  <label>Nome<input name="name" required minLength={2} /></label>
                  <label>Telefone<input name="phone" required minLength={8} placeholder="(00) 00000-0000" /></label>
                  <label>E-mail<input name="email" type="email" /></label>
                </>
              )}
              <button type="submit" className="botao-principal">Confirmar agendamento <ArrowRight size={18} /></button>
            </form>
          )}
          {mensagem && <Aviso>{mensagem}</Aviso>}
          {erro && <Aviso erro>{erro}</Aviso>}
        </section>
      </main>

      {selecionados.length > 0 && (
        <aside className="resumo-flutuante">
          <div>
            <strong>{selecionados.length} serviço{selecionados.length > 1 ? "s" : ""}</strong>
            <small>{totalDuracao} min · {moeda(totalPreco)}</small>
          </div>
          <span>{selecionados.map((s) => s.name).join(" · ")}</span>
        </aside>
      )}
    </div>
  );
}

function LoginAdmin({ aoEntrar }: { aoEntrar: (token: string, tenant: Tenant) => void }) {
  const [erro, setErro] = useState("");
  const [slug, setSlug] = useState("barbearia-demo");
  const tenantTema = useTenantTheme(slug);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    try {
      const resultado = await api<{ token: string; tenant: Tenant }>("/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({ slug: form.get("slug"), email: form.get("email"), password: form.get("password") }),
      });
      document.documentElement.style.setProperty("--cor-marca", resultado.tenant.primaryColor);
      aoEntrar(resultado.token, resultado.tenant);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha no acesso."); }
  }
  return (
    <main className="login" style={{ "--cor-marca": tenantTema?.primaryColor ?? "var(--cor-marca)" } as CSSProperties}>
      <section className="login-marca">
        <img className="login-marca-foto" src="/images/ambiente.jpg" alt="Ambiente acolhedor da barbearia" />
        <Marca />
        <h1>A agenda do seu negócio, sem ruído.</h1>
        <p>Menos tempo organizando. Mais tempo atendendo.</p>
      </section>
      <form className="cartao-login" onSubmit={entrar}>
        <span className="sobretitulo">Painel administrativo</span>
        <h2>Boas-vindas</h2>
        <label>
          Identificador do negócio
          <input
            name="slug"
            value={slug}
            required
            onChange={(e) => setSlug(e.target.value.trim())}
            onBlur={(e) => setSlug(e.target.value.trim() || "barbearia-demo")}
          />
        </label>
        <label>E-mail<input name="email" type="email" defaultValue="admin@demo.encaixe" required /></label>
        <label>Senha<input name="password" type="password" defaultValue="Demo@1234" required /></label>
        <button className="botao-principal">Entrar <ArrowRight size={18} /></button>
        {erro && <Aviso erro>{erro}</Aviso>}
      </form>
    </main>
  );
}

function PainelAdmin() {
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
    setToken(novoToken); setTenant(novoTenant);
  }
  function sair() {
    localStorage.removeItem("encaixe_admin"); localStorage.removeItem("encaixe_tenant");
    setToken(""); setTenant(undefined);
  }
  useTenantTheme(tenant?.slug, tenant?.primaryColor);

  if (!token || !tenant) return <LoginAdmin aoEntrar={entrar} />;

  const itens = [
    ["inicio", "Visão geral", CalendarDays],
    ["agenda", "Agenda", Clock3],
    ["clientes", "Clientes", UserRound],
    ["servicos", "Serviços", Scissors],
    ["profissionais", "Profissionais", Users],
    ["configuracoes", "Configurações", Settings2],
  ] as const;

  return (
    <div className="admin" style={{ "--cor-marca": tenant.primaryColor } as CSSProperties}>
      <aside className={menu ? "aberto" : ""}>
        <Marca />
        <nav>
          {itens.map(([id, nome, Icone]) => (
            <button className={secao === id ? "ativo" : ""} onClick={() => { setSecao(id); setMenu(false); }} key={id}>
              <Icone size={18} />{nome}
            </button>
          ))}
        </nav>
        <button className="sair" onClick={sair}><LogOut size={18} /> Sair</button>
      </aside>
      <main className="conteudo-admin">
        <header>
          <button className="menu-mobile" onClick={() => setMenu(!menu)}><Menu /></button>
          <div><small>{tenant.name}</small><h1>{itens.find(([id]) => id === secao)?.[1]}</h1></div>
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

function VisaoGeral({ token }: { token: string }) {
  const [dados, setDados] = useState({ total: 0, confirmados: 0, receitaCents: 0 });
  useEffect(() => { api<typeof dados>(`/admin/dashboard/day?date=${new Date().toISOString().slice(0, 10)}`, {}, token).then(setDados); }, [token]);
  return (
    <section>
      <div className="metricas">
        <article><small>Agendamentos hoje</small><strong>{dados.total}</strong><CalendarDays /></article>
        <article><small>Confirmados</small><strong>{dados.confirmados}</strong><Clock3 /></article>
        <article><small>Receita prevista</small><strong>{moeda(dados.receitaCents)}</strong><Sparkles /></article>
      </div>
      <div className="vazio"><CalendarDays /><h2>Seu dia em um só lugar</h2><p>Acompanhe a agenda e mantenha sua equipe sincronizada.</p></div>
    </section>
  );
}

function Agenda({ token }: { token: string }) {
  const [itens, setItens] = useState<Appointment[]>([]);
  const hoje = new Date().toISOString().slice(0, 10);
  useEffect(() => { api<Appointment[]>(`/admin/appointments?from=${hoje}T00:00:00-03:00&to=2999-01-01`, {}, token).then(setItens); }, [hoje, token]);
  return (
    <section className="lista">
      <div className="barra"><h2>Próximos horários</h2></div>
      {itens.map((item) => (
        <article key={item.id}>
          <time>{dataHora(item.startsAt)}</time>
          <div><strong>{item.customerName}</strong><small>{item.serviceName} · {item.professionalName}</small></div>
          <span className="status">{item.status}</span>
        </article>
      ))}
      {!itens.length && <div className="vazio"><Clock3 /><p>Nenhum agendamento encontrado.</p></div>}
    </section>
  );
}

function CadastroClientes({ token }: { token: string }) {
  const [itens, setItens] = useState<Customer[]>([]);
  const [editando, setEditando] = useState<Customer>();
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const carregar = () => api<Customer[]>("/admin/customers", {}, token).then(setItens);
  useEffect(() => { carregar(); }, [token]);

  const filtrados = itens.filter((c) => {
    if (filtro === "ativos") return c.active;
    if (filtro === "inativos") return !c.active;
    return true;
  });

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    const f = new FormData(evento.currentTarget);
    const corpo = { name: String(f.get("name")), phone: String(f.get("phone")), email: String(f.get("email") || "") };
    try {
      if (editando) {
        await api(`/admin/customers/${editando.id}`, { method: "PUT", body: JSON.stringify(corpo) }, token);
        setEditando(undefined);
      } else {
        await api("/admin/customers", { method: "POST", body: JSON.stringify(corpo) }, token);
      }
      evento.currentTarget.reset();
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  async function remover(cliente: Customer) {
    try {
      const r = await api<{ inactivated?: boolean; deleted?: boolean }>(`/admin/customers/${cliente.id}`, { method: "DELETE" }, token);
      if (r.inactivated) setErro("");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover.");
    }
  }

  return (
    <Gerenciador
      titulo="Clientes"
      formulario={(
        <form className="form-inline form-clientes" onSubmit={salvar}>
          <input name="name" placeholder="Nome" required defaultValue={editando?.name} key={editando ? `e-${editando.id}` : "novo"} />
          <input name="phone" placeholder="Telefone" required defaultValue={editando?.phone} />
          <input name="email" type="email" placeholder="E-mail" defaultValue={editando?.email ?? ""} />
          <button>{editando ? "Salvar" : "Adicionar"}</button>
          {editando && <button type="button" onClick={() => setEditando(undefined)}>Cancelar</button>}
        </form>
      )}
    >
      <div className="filtros-clientes">
        {(["todos", "ativos", "inativos"] as const).map((f) => (
          <button type="button" key={f} className={filtro === f ? "ativo" : ""} onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : f === "ativos" ? "Ativos" : "Inativos"}
          </button>
        ))}
      </div>
      {erro && <Aviso erro>{erro}</Aviso>}
      {filtrados.map((item) => (
        <article key={item.id} className={item.active ? "" : "inativo"}>
          <Contact size={18} />
          <div>
            <strong>{item.name}</strong>
            <small>{item.phone}{item.email ? ` · ${item.email}` : ""}</small>
          </div>
          <span className={`badge ${item.active ? "ativo" : "inativo"}`}>{item.active ? "Ativo" : "Inativo"}</span>
          <button type="button" onClick={() => setEditando(item)}>Editar</button>
          <button type="button" onClick={() => remover(item)}>{item.active ? "Excluir" : "Remover"}</button>
        </article>
      ))}
      {!filtrados.length && <div className="vazio"><UserRound /><p>Nenhum cliente neste filtro.</p></div>}
    </Gerenciador>
  );
}

function CadastroServicos({ token }: { token: string }) {
  const [itens, setItens] = useState<Service[]>([]);
  const [erro, setErro] = useState("");
  const carregar = () => api<Service[]>("/admin/services", {}, token).then(setItens);
  useEffect(() => { carregar(); }, [token]);
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    try {
      await api("/admin/services", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          description: f.get("description"),
          durationMinutes: Number(f.get("duration")),
          priceCents: Math.round(Number(f.get("price")) * 100),
          icon: f.get("icon") || "scissors",
        }),
      }, token);
      evento.currentTarget.reset(); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar."); }
  }
  return (
    <Gerenciador
      titulo="Serviços"
      formulario={(
        <form className="form-inline" onSubmit={salvar}>
          <input name="name" placeholder="Nome" required />
          <input name="description" placeholder="Descrição" />
          <input name="duration" type="number" min="10" placeholder="Minutos" required />
          <input name="price" type="number" min="0" step=".01" placeholder="Preço" required />
          <select name="icon" defaultValue="scissors">
            <option value="scissors">Tesoura</option>
            <option value="sparkles">Brilho</option>
            <option value="razor">Navalha</option>
            <option value="clock">Relógio</option>
          </select>
          <button>Adicionar</button>
        </form>
      )}
    >
      {erro && <Aviso erro>{erro}</Aviso>}
      {itens.map((item) => {
        const Icone = iconeServico(item.icon);
        return (
          <article key={item.id}>
            <Icone size={18} />
            <div><strong>{item.name}</strong><small>{item.durationMinutes} min · {moeda(item.priceCents)}</small></div>
            <button type="button" onClick={() => api(`/admin/services/${item.id}`, { method: "DELETE" }, token).then(carregar)}>Desativar</button>
          </article>
        );
      })}
    </Gerenciador>
  );
}

function CadastroProfissionais({ token }: { token: string }) {
  const [itens, setItens] = useState<Professional[]>([]);
  const carregar = () => api<Professional[]>("/admin/professionals", {}, token).then(setItens);
  useEffect(() => { carregar(); }, [token]);
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/professionals", { method: "POST", body: JSON.stringify({ name: f.get("name"), bio: f.get("bio") }) }, token);
    evento.currentTarget.reset(); carregar();
  }
  return (
    <Gerenciador
      titulo="Profissionais"
      formulario={(
        <form className="form-inline" onSubmit={salvar}>
          <input name="name" placeholder="Nome" required />
          <input name="bio" placeholder="Especialidade ou bio" />
          <button>Adicionar</button>
        </form>
      )}
    >
      {itens.map((item) => (
        <article key={item.id}>
          <div className="avatar">{item.name.charAt(0)}</div>
          <div><strong>{item.name}</strong><small>{item.bio}</small></div>
          <button type="button" onClick={() => api(`/admin/professionals/${item.id}`, { method: "DELETE" }, token).then(carregar)}>Desativar</button>
        </article>
      ))}
    </Gerenciador>
  );
}

function Gerenciador({ titulo, formulario, children }: { titulo: string; formulario: ReactNode; children: ReactNode }) {
  return <section className="gerenciador"><div className="barra"><h2>{titulo}</h2></div>{formulario}<div className="lista">{children}</div></section>;
}

function Configuracoes({ token, tenant, atualizar }: { token: string; tenant: Tenant; atualizar: (t: Tenant) => void }) {
  type Horario = { id: number; professionalId: number; weekday: number; startTime: string; endTime: string };
  type Bloqueio = { id: number; professionalId?: number; startsAt: string; endsAt: string; reason?: string };
  const [profissionais, setProfissionais] = useState<Professional[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const carregarAgenda = () => Promise.all([
    api<Professional[]>("/admin/professionals", {}, token),
    api<Horario[]>("/admin/hours", {}, token),
    api<Bloqueio[]>("/admin/blocks", {}, token),
  ]).then(([p, h, b]) => { setProfissionais(p); setHorarios(h); setBloqueios(b); });
  useEffect(() => { carregarAgenda(); }, [token]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    const novo = await api<Tenant>("/admin/branding", {
      method: "PUT",
      body: JSON.stringify({
        name: f.get("name"),
        phone: f.get("phone"),
        address: f.get("address"),
        primaryColor: f.get("primaryColor"),
      }),
    }, token);
    localStorage.setItem("encaixe_tenant", JSON.stringify(novo));
    document.documentElement.style.setProperty("--cor-marca", novo.primaryColor);
    atualizar(novo);
  }
  async function salvarHorario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/hours", {
      method: "POST",
      body: JSON.stringify({
        professionalId: Number(f.get("professionalId")),
        weekday: Number(f.get("weekday")),
        startTime: f.get("startTime"),
        endTime: f.get("endTime"),
      }),
    }, token);
    carregarAgenda();
  }
  async function salvarBloqueio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/blocks", {
      method: "POST",
      body: JSON.stringify({
        professionalId: f.get("professionalId") ? Number(f.get("professionalId")) : null,
        startsAt: new Date(String(f.get("startsAt"))),
        endsAt: new Date(String(f.get("endsAt"))),
        reason: f.get("reason"),
      }),
    }, token);
    evento.currentTarget.reset(); carregarAgenda();
  }
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <section className="gerenciador">
      <h2>Identidade do negócio</h2>
      <form className="formulario largura-media" onSubmit={salvar}>
        <label>Nome<input name="name" defaultValue={tenant.name} /></label>
        <label>Telefone<input name="phone" defaultValue={tenant.phone} /></label>
        <label>Endereço<input name="address" defaultValue={tenant.address} /></label>
        <label>Cor da marca<input name="primaryColor" type="color" defaultValue={tenant.primaryColor} /></label>
        <button className="botao-principal">Salvar alterações</button>
      </form>
      <h2 className="subsecao">Jornada de trabalho</h2>
      <form className="form-inline form-agenda" onSubmit={salvarHorario}>
        <select name="professionalId" required>{profissionais.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select>
        <select name="weekday">{dias.map((dia, indice) => <option value={indice} key={dia}>{dia}</option>)}</select>
        <input name="startTime" type="time" defaultValue="09:00" required />
        <input name="endTime" type="time" defaultValue="18:00" required />
        <button>Salvar jornada</button>
      </form>
      <div className="lista">
        {horarios.map((h) => (
          <article key={h.id}>
            <Clock3 />
            <div>
              <strong>{profissionais.find((p) => p.id === h.professionalId)?.name}</strong>
              <small>{dias[h.weekday]} · {h.startTime.slice(0, 5)} às {h.endTime.slice(0, 5)}</small>
            </div>
            <button type="button" onClick={() => api(`/admin/hours/${h.id}`, { method: "DELETE" }, token).then(carregarAgenda)}>Excluir</button>
          </article>
        ))}
      </div>
      <h2 className="subsecao">Bloqueios de agenda</h2>
      <form className="form-inline form-agenda" onSubmit={salvarBloqueio}>
        <select name="professionalId"><option value="">Toda a equipe</option>{profissionais.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select>
        <input name="startsAt" type="datetime-local" required />
        <input name="endsAt" type="datetime-local" required />
        <input name="reason" placeholder="Motivo" />
        <button>Bloquear</button>
      </form>
      <div className="lista">
        {bloqueios.map((b) => (
          <article key={b.id}>
            <CalendarDays />
            <div>
              <strong>{b.reason || "Horário bloqueado"}</strong>
              <small>{dataHora(b.startsAt)} até {dataHora(b.endsAt)}</small>
            </div>
            <button type="button" onClick={() => api(`/admin/blocks/${b.id}`, { method: "DELETE" }, token).then(carregarAgenda)}>Excluir</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AreaCliente() {
  const { slug = "" } = useParams();
  const chave = `encaixe_cliente_${slug}`;
  const [token, setToken] = useState(() => localStorage.getItem(chave) ?? "");
  const [itens, setItens] = useState<Appointment[]>([]);
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [erro, setErro] = useState("");
  const tenant = useTenantTheme(slug);
  const corMarca = tenant?.primaryColor;

  useEffect(() => {
    if (token) {
      api<Appointment[]>("/customer/appointments", {}, token).then(setItens).catch(() => setToken(""));
    }
  }, [token]);

  async function autenticarCliente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    try {
      const resultado = await api<{ token: string }>(`/auth/customer/${modo === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify({
          slug,
          name: f.get("name"),
          phone: f.get("phone"),
          email: f.get("email"),
          password: f.get("password"),
        }),
      });
      localStorage.setItem(chave, resultado.token); setToken(resultado.token);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha no acesso."); }
  }

  function sair() {
    localStorage.removeItem(chave);
    setToken("");
  }

  if (!token) {
    return (
      <main className="centro area-auth" style={corMarca ? { "--cor-marca": corMarca } as CSSProperties : undefined}>
        <div className="area-auth-com-foto">
          <img className="area-auth-foto" src="/images/atendimento.jpg" alt="Profissional atendendo cliente na barbearia" />
          <div>
            <Marca />
            <form className="cartao-login" onSubmit={autenticarCliente}>
              <h1>{modo === "login" ? "Seus agendamentos" : "Criar conta"}</h1>
              {modo === "cadastro" && (
                <>
                  <label>Nome<input name="name" required /></label>
                  <label>Telefone<input name="phone" required /></label>
                </>
              )}
              <label>E-mail<input name="email" type="email" required /></label>
              <label>Senha<input name="password" type="password" minLength={8} required /></label>
              <button className="botao-principal">{modo === "login" ? "Entrar" : "Cadastrar"}</button>
              <button type="button" className="link-sutil" onClick={() => setModo(modo === "login" ? "cadastro" : "login")}>
                {modo === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
              </button>
              {erro && <Aviso erro>{erro}</Aviso>}
              <Link to={`/${slug}`}>Voltar para agendamento</Link>
            </form>
          </div>
        </div>
      </main>
    );
  }

  async function cancelar(id: number) {
    await api(`/customer/appointments/${id}/cancel`, { method: "PATCH" }, token);
    setItens((atuais) => atuais.map((item) => (item.id === id ? { ...item, status: "cancelled" } : item)));
  }

  return (
    <main className="area-cliente" style={corMarca ? { "--cor-marca": corMarca } as CSSProperties : undefined}>
      <header className="cabecalho-cliente">
        <Marca />
        <div className="auth-area">
          <Link to={`/${slug}`} className="botao-principal cta-novo"><Plus size={18} /> Novo agendamento</Link>
          <button type="button" className="link-sutil" onClick={sair}><LogOut size={16} /> Sair</button>
        </div>
      </header>
      <h1>Próximos agendamentos</h1>
      <section className="lista lista-cliente">
        {itens.map((item) => (
          <article key={item.id} className="cartao-agendamento">
            <div className="cartao-agendamento-icone"><CalendarDays size={22} /></div>
            <div>
              <strong>{dataHora(item.startsAt)}</strong>
              <small>
                {item.serviceName || "Serviço"}
                {item.professionalName ? ` · ${item.professionalName}` : ""}
              </small>
              <span className={`status ${item.status}`}>{item.status}</span>
            </div>
            {item.status === "confirmed" && (
              <button type="button" onClick={() => cancelar(item.id)}>Cancelar</button>
            )}
          </article>
        ))}
        {!itens.length && (
          <div className="vazio">
            <CalendarDays />
            <p>Você ainda não tem horários futuros.</p>
            <Link to={`/${slug}`} className="botao-principal">Agendar agora</Link>
          </div>
        )}
      </section>
    </main>
  );
}

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
