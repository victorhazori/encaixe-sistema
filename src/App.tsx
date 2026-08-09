import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  LogOut,
  Menu,
  Scissors,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { Link, Navigate, Route, Routes, useParams } from "react-router";

type Tenant = { id: number; name: string; slug: string; phone?: string; address?: string; primaryColor: string; logoUrl?: string };
type Service = { id: number; name: string; description?: string; durationMinutes: number; priceCents: number; active: boolean };
type Professional = { id: number; name: string; bio?: string; avatarUrl?: string; active: boolean };
type Appointment = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: string;
  customerName?: string;
  professionalName?: string;
  serviceName?: string;
};

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

function Marca({ compacta = false }: { compacta?: boolean }) {
  return <div className="marca"><span className="marca-simbolo">E</span>{!compacta && <strong>Encaixe</strong>}</div>;
}

function Aviso({ children, erro = false }: { children: ReactNode; erro?: boolean }) {
  return <p className={erro ? "aviso erro" : "aviso"}>{children}</p>;
}

function AgendamentoPublico() {
  const { slug = "" } = useParams();
  const [tenant, setTenant] = useState<Tenant>();
  const [servicos, setServicos] = useState<Service[]>([]);
  const [profissionais, setProfissionais] = useState<Professional[]>([]);
  const [servico, setServico] = useState<Service>();
  const [profissional, setProfissional] = useState<Professional>();
  const [data, setData] = useState(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([
      api<Tenant>(`/public/${slug}`),
      api<Service[]>(`/public/${slug}/services`),
    ]).then(([t, s]) => { setTenant(t); setServicos(s); }).catch((e: Error) => setErro(e.message));
  }, [slug]);

  useEffect(() => {
    if (!servico) return;
    api<Professional[]>(`/public/${slug}/professionals?serviceId=${servico.id}`)
      .then((lista) => { setProfissionais(lista); setProfissional(undefined); setSlots([]); });
  }, [servico, slug]);

  useEffect(() => {
    if (!servico || !profissional) return;
    api<string[]>(`/public/${slug}/availability?serviceId=${servico.id}&professionalId=${profissional.id}&date=${data}`)
      .then((lista) => { setSlots(lista); setSlot(""); }).catch((e: Error) => setErro(e.message));
  }, [data, profissional, servico, slug]);

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    const form = new FormData(evento.currentTarget);
    try {
      await api(`/public/${slug}/appointments`, {
        method: "POST",
        body: JSON.stringify({
          serviceId: servico!.id,
          professionalId: profissional!.id,
          startsAt: slot,
          customer: {
            name: form.get("name"),
            phone: form.get("phone"),
            email: form.get("email"),
          },
        }),
      });
      setMensagem("Seu horário está confirmado. Até breve!");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao agendar.");
    }
  }

  if (erro && !tenant) return <main className="centro"><Marca /><Aviso erro>{erro}</Aviso></main>;
  if (!tenant) return <main className="centro">Carregando agenda…</main>;

  return (
    <div className="publico" style={{ "--cor-marca": tenant.primaryColor } as React.CSSProperties}>
      <header className="cabecalho-publico">
        <Marca />
        <Link to={`/cliente/${slug}`} className="link-sutil">Área do cliente</Link>
      </header>
      <main className="reserva">
        <section className="apresentacao">
          <span className="sobretitulo"><Sparkles size={14} /> Agenda aberta</span>
          <h1>Seu tempo, bem <em>encaixado.</em></h1>
          <p>Escolha o serviço, quem vai atender e o melhor horário para você.</p>
          <div className="estabelecimento">
            <div className="avatar-loja">{tenant.name.charAt(0)}</div>
            <div><strong>{tenant.name}</strong><small>{tenant.address}</small></div>
          </div>
        </section>

        <section className="painel-reserva">
          <div className="passo"><b>01</b><span>Escolha um serviço</span></div>
          <div className="grade-opcoes">
            {servicos.map((item) => (
              <button className={`cartao-opcao ${servico?.id === item.id ? "ativo" : ""}`} onClick={() => setServico(item)} key={item.id}>
                <Scissors size={20} /><span><strong>{item.name}</strong><small>{item.durationMinutes} min · {moeda(item.priceCents)}</small></span>
              </button>
            ))}
          </div>

          {servico && <>
            <div className="passo"><b>02</b><span>Escolha o profissional</span></div>
            <div className="grade-opcoes">
              {profissionais.map((item) => (
                <button className={`cartao-opcao ${profissional?.id === item.id ? "ativo" : ""}`} onClick={() => setProfissional(item)} key={item.id}>
                  <div className="avatar">{item.name.charAt(0)}</div><span><strong>{item.name}</strong><small>{item.bio}</small></span>
                </button>
              ))}
            </div>
          </>}

          {profissional && <>
            <div className="passo"><b>03</b><span>Escolha data e horário</span></div>
            <input type="date" value={data} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setData(e.target.value)} />
            <div className="horarios">
              {slots.map((hora) => <button className={slot === hora ? "ativo" : ""} onClick={() => setSlot(hora)} key={hora}>{new Date(hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</button>)}
              {!slots.length && <small>Nenhum horário disponível nesta data.</small>}
            </div>
          </>}

          {slot && !mensagem && (
            <form className="formulario" onSubmit={confirmar}>
              <div className="passo"><b>04</b><span>Seus dados</span></div>
              <label>Nome<input name="name" required minLength={2} /></label>
              <label>Telefone<input name="phone" required minLength={8} placeholder="(00) 00000-0000" /></label>
              <label>E-mail<input name="email" type="email" /></label>
              <button className="botao-principal">Confirmar agendamento <ArrowRight size={18} /></button>
            </form>
          )}
          {mensagem && <Aviso>{mensagem}</Aviso>}
          {erro && <Aviso erro>{erro}</Aviso>}
        </section>
      </main>
    </div>
  );
}

function LoginAdmin({ aoEntrar }: { aoEntrar: (token: string, tenant: Tenant) => void }) {
  const [erro, setErro] = useState("");
  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    try {
      const resultado = await api<{ token: string; tenant: Tenant }>("/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({ slug: form.get("slug"), email: form.get("email"), password: form.get("password") }),
      });
      aoEntrar(resultado.token, resultado.tenant);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha no acesso."); }
  }
  return <main className="login">
    <section className="login-marca"><Marca /><h1>A agenda do seu negócio, sem ruído.</h1><p>Menos tempo organizando. Mais tempo atendendo.</p></section>
    <form className="cartao-login" onSubmit={entrar}>
      <span className="sobretitulo">Painel administrativo</span><h2>Boas-vindas</h2>
      <label>Identificador do negócio<input name="slug" defaultValue="barbearia-demo" required /></label>
      <label>E-mail<input name="email" type="email" defaultValue="admin@demo.encaixe" required /></label>
      <label>Senha<input name="password" type="password" defaultValue="Demo@1234" required /></label>
      <button className="botao-principal">Entrar <ArrowRight size={18} /></button>
      {erro && <Aviso erro>{erro}</Aviso>}
    </form>
  </main>;
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
    setToken(novoToken); setTenant(novoTenant);
  }
  function sair() {
    localStorage.removeItem("encaixe_admin"); localStorage.removeItem("encaixe_tenant");
    setToken(""); setTenant(undefined);
  }
  if (!token || !tenant) return <LoginAdmin aoEntrar={entrar} />;

  const itens = [
    ["inicio", "Visão geral", CalendarDays],
    ["agenda", "Agenda", Clock3],
    ["servicos", "Serviços", Scissors],
    ["profissionais", "Profissionais", Users],
    ["configuracoes", "Configurações", Settings2],
  ] as const;

  return <div className="admin">
    <aside className={menu ? "aberto" : ""}>
      <Marca />
      <nav>{itens.map(([id, nome, Icone]) => <button className={secao === id ? "ativo" : ""} onClick={() => { setSecao(id); setMenu(false); }} key={id}><Icone size={18} />{nome}</button>)}</nav>
      <button className="sair" onClick={sair}><LogOut size={18} /> Sair</button>
    </aside>
    <main className="conteudo-admin">
      <header><button className="menu-mobile" onClick={() => setMenu(!menu)}><Menu /></button><div><small>{tenant.name}</small><h1>{itens.find(([id]) => id === secao)?.[1]}</h1></div></header>
      {secao === "inicio" && <VisaoGeral token={token} />}
      {secao === "agenda" && <Agenda token={token} />}
      {secao === "servicos" && <CadastroServicos token={token} />}
      {secao === "profissionais" && <CadastroProfissionais token={token} />}
      {secao === "configuracoes" && <Configuracoes token={token} tenant={tenant} atualizar={setTenant} />}
    </main>
  </div>;
}

function VisaoGeral({ token }: { token: string }) {
  const [dados, setDados] = useState({ total: 0, confirmados: 0, receitaCents: 0 });
  useEffect(() => { api<typeof dados>(`/admin/dashboard/day?date=${new Date().toISOString().slice(0, 10)}`, {}, token).then(setDados); }, [token]);
  return <section><div className="metricas">
    <article><small>Agendamentos hoje</small><strong>{dados.total}</strong><CalendarDays /></article>
    <article><small>Confirmados</small><strong>{dados.confirmados}</strong><Clock3 /></article>
    <article><small>Receita prevista</small><strong>{moeda(dados.receitaCents)}</strong><Sparkles /></article>
  </div><div className="vazio"><CalendarDays /><h2>Seu dia em um só lugar</h2><p>Acompanhe a agenda e mantenha sua equipe sincronizada.</p></div></section>;
}

function Agenda({ token }: { token: string }) {
  const [itens, setItens] = useState<Appointment[]>([]);
  const hoje = new Date().toISOString().slice(0, 10);
  useEffect(() => { api<Appointment[]>(`/admin/appointments?from=${hoje}T00:00:00-03:00&to=2999-01-01`, {}, token).then(setItens); }, [hoje, token]);
  return <section className="lista"><div className="barra"><h2>Próximos horários</h2></div>
    {itens.map((item) => <article key={item.id}><time>{dataHora(item.startsAt)}</time><div><strong>{item.customerName}</strong><small>{item.serviceName} · {item.professionalName}</small></div><span className="status">{item.status}</span></article>)}
    {!itens.length && <div className="vazio"><Clock3 /><p>Nenhum agendamento encontrado.</p></div>}
  </section>;
}

function CadastroServicos({ token }: { token: string }) {
  const [itens, setItens] = useState<Service[]>([]);
  const [erro, setErro] = useState("");
  const carregar = () => api<Service[]>("/admin/services", {}, token).then(setItens);
  useEffect(() => { carregar(); }, [token]);
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    try {
      await api("/admin/services", { method: "POST", body: JSON.stringify({ name: f.get("name"), description: f.get("description"), durationMinutes: Number(f.get("duration")), priceCents: Math.round(Number(f.get("price")) * 100) }) }, token);
      evento.currentTarget.reset(); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar."); }
  }
  return <Gerenciador titulo="Serviços" formulario={<form className="form-inline" onSubmit={salvar}><input name="name" placeholder="Nome" required /><input name="description" placeholder="Descrição" /><input name="duration" type="number" min="10" placeholder="Minutos" required /><input name="price" type="number" min="0" step=".01" placeholder="Preço" required /><button>Adicionar</button></form>}>
    {erro && <Aviso erro>{erro}</Aviso>}{itens.map((item) => <article key={item.id}><Scissors /><div><strong>{item.name}</strong><small>{item.durationMinutes} min · {moeda(item.priceCents)}</small></div><button onClick={() => api(`/admin/services/${item.id}`, { method: "DELETE" }, token).then(carregar)}>Desativar</button></article>)}
  </Gerenciador>;
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
  return <Gerenciador titulo="Profissionais" formulario={<form className="form-inline" onSubmit={salvar}><input name="name" placeholder="Nome" required /><input name="bio" placeholder="Especialidade ou bio" /><button>Adicionar</button></form>}>
    {itens.map((item) => <article key={item.id}><div className="avatar">{item.name.charAt(0)}</div><div><strong>{item.name}</strong><small>{item.bio}</small></div><button onClick={() => api(`/admin/professionals/${item.id}`, { method: "DELETE" }, token).then(carregar)}>Desativar</button></article>)}
  </Gerenciador>;
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
    const novo = await api<Tenant>("/admin/branding", { method: "PUT", body: JSON.stringify({ name: f.get("name"), phone: f.get("phone"), address: f.get("address"), primaryColor: f.get("primaryColor") }) }, token);
    localStorage.setItem("encaixe_tenant", JSON.stringify(novo)); atualizar(novo);
  }
  async function salvarHorario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/hours", { method: "POST", body: JSON.stringify({
      professionalId: Number(f.get("professionalId")), weekday: Number(f.get("weekday")),
      startTime: f.get("startTime"), endTime: f.get("endTime"),
    }) }, token);
    carregarAgenda();
  }
  async function salvarBloqueio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/blocks", { method: "POST", body: JSON.stringify({
      professionalId: f.get("professionalId") ? Number(f.get("professionalId")) : null,
      startsAt: new Date(String(f.get("startsAt"))), endsAt: new Date(String(f.get("endsAt"))), reason: f.get("reason"),
    }) }, token);
    evento.currentTarget.reset(); carregarAgenda();
  }
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return <section className="gerenciador"><h2>Identidade do negócio</h2><form className="formulario largura-media" onSubmit={salvar}>
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
  <div className="lista">{horarios.map((h) => <article key={h.id}><Clock3 /><div><strong>{profissionais.find((p) => p.id === h.professionalId)?.name}</strong><small>{dias[h.weekday]} · {h.startTime.slice(0, 5)} às {h.endTime.slice(0, 5)}</small></div><button onClick={() => api(`/admin/hours/${h.id}`, { method: "DELETE" }, token).then(carregarAgenda)}>Excluir</button></article>)}</div>
  <h2 className="subsecao">Bloqueios de agenda</h2>
  <form className="form-inline form-agenda" onSubmit={salvarBloqueio}>
    <select name="professionalId"><option value="">Toda a equipe</option>{profissionais.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select>
    <input name="startsAt" type="datetime-local" required />
    <input name="endsAt" type="datetime-local" required />
    <input name="reason" placeholder="Motivo" />
    <button>Bloquear</button>
  </form>
  <div className="lista">{bloqueios.map((b) => <article key={b.id}><CalendarDays /><div><strong>{b.reason || "Horário bloqueado"}</strong><small>{dataHora(b.startsAt)} até {dataHora(b.endsAt)}</small></div><button onClick={() => api(`/admin/blocks/${b.id}`, { method: "DELETE" }, token).then(carregarAgenda)}>Excluir</button></article>)}</div>
  </section>;
}

function AreaCliente() {
  const { slug = "" } = useParams();
  const chave = `encaixe_cliente_${slug}`;
  const [token, setToken] = useState(() => localStorage.getItem(chave) ?? "");
  const [itens, setItens] = useState<Appointment[]>([]);
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [erro, setErro] = useState("");
  useEffect(() => { if (token) api<Appointment[]>("/customer/appointments", {}, token).then(setItens).catch(() => setToken("")); }, [token]);

  async function autenticarCliente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    try {
      const resultado = await api<{ token: string }>(`/auth/customer/${modo === "login" ? "login" : "register"}`, {
        method: "POST", body: JSON.stringify({ slug, name: f.get("name"), phone: f.get("phone"), email: f.get("email"), password: f.get("password") }),
      });
      localStorage.setItem(chave, resultado.token); setToken(resultado.token);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha no acesso."); }
  }

  if (!token) return <main className="centro"><Marca /><form className="cartao-login" onSubmit={autenticarCliente}><h1>{modo === "login" ? "Seus agendamentos" : "Criar conta"}</h1>
    {modo === "cadastro" && <><label>Nome<input name="name" required /></label><label>Telefone<input name="phone" required /></label></>}
    <label>E-mail<input name="email" type="email" required /></label><label>Senha<input name="password" type="password" minLength={8} required /></label>
    <button className="botao-principal">{modo === "login" ? "Entrar" : "Cadastrar"}</button>
    <button type="button" className="link-sutil" onClick={() => setModo(modo === "login" ? "cadastro" : "login")}>{modo === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</button>
    {erro && <Aviso erro>{erro}</Aviso>}<Link to={`/${slug}`}>Voltar para agendamento</Link>
  </form></main>;

  async function cancelar(id: number) {
    await api(`/customer/appointments/${id}/cancel`, { method: "PATCH" }, token);
    setItens((atuais) => atuais.map((item) => item.id === id ? { ...item, status: "cancelled" } : item));
  }
  return <main className="area-cliente"><header><Marca /><button onClick={() => { localStorage.removeItem(chave); setToken(""); }}>Sair</button></header><h1>Próximos agendamentos</h1>
    <section className="lista">{itens.map((item) => <article key={item.id}><CalendarDays /><div><strong>{dataHora(item.startsAt)}</strong><small>Status: {item.status}</small></div>{item.status === "confirmed" && <button onClick={() => cancelar(item.id)}>Cancelar</button>}</article>)}{!itens.length && <div className="vazio">Você ainda não tem horários futuros.</div>}</section>
  </main>;
}

export default function App() {
  return <Routes>
    <Route path="/admin/*" element={<PainelAdmin />} />
    <Route path="/cliente/:slug" element={<AreaCliente />} />
    <Route path="/:slug" element={<AgendamentoPublico />} />
    <Route path="/" element={<Navigate to="/barbearia-demo" replace />} />
  </Routes>;
}
