import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight, Check, LogOut, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router";
import { Aviso, CalendarioMes, Marca, Progresso } from "../components/ui";
import { api, dataHora, moeda, type PerfilCliente, type Professional, type Service, type Tenant } from "../lib/api";
import { iconeServico } from "../lib/icons";
import { useTenantTheme } from "../lib/theme";

export function AgendamentoPublico() {
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
