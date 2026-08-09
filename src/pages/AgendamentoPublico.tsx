import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight, Check, CheckCircle2, Clock3, LogOut, MapPin } from "lucide-react";
import { Link, useParams } from "react-router";
import { TemaToggle } from "../components/TemaToggle";
import { Aviso, CalendarioMes, Marca, Progresso } from "../components/ui";
import { api, dataHora, moeda, type PerfilCliente, type Professional, type Service, type Tenant } from "../lib/api";
import { iconeServico } from "../lib/icons";
import { useTenantTheme } from "../lib/theme";
import "../styles/public.css";

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
  const [enviando, setEnviando] = useState(false);

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
    setErro("");
  }

  function sairCliente() {
    localStorage.removeItem(chaveToken);
    setTokenCliente("");
    setPerfil(undefined);
  }

  function reiniciar() {
    setMensagem("");
    setErro("");
    setSelecionados([]);
    setProfissional(undefined);
    setData("");
    setSlot("");
    setSlots([]);
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
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
      setData("");
      setSlots([]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao agendar.");
    } finally {
      setEnviando(false);
    }
  }

  if (erro && !tenant) {
    return (
      <main className="centro">
        <Marca />
        <Aviso erro>{erro}</Aviso>
      </main>
    );
  }

  if (!tenant) {
    return <main className="centro">Carregando agenda…</main>;
  }

  const dataLabel = data
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${data}T12:00:00`))
    : "";

  return (
    <div className="publico publico-booking" style={{ "--cor-marca": tenant.primaryColor } as CSSProperties}>
      <header className="cabecalho-publico cabecalho-auth">
        <div className="cabecalho-marca">
          {tenant.logoUrl
            ? <img src={tenant.logoUrl} alt={tenant.name} className="logo-tenant" />
            : <Marca compacta />}
          <div className="cabecalho-loja">
            <strong>{tenant.name}</strong>
            {tenant.address && <small>{tenant.address}</small>}
          </div>
        </div>
        <div className="auth-area">
          <TemaToggle />
          {tokenCliente && perfil ? (
            <>
              <span className="ola">Olá, {perfil.name.split(" ")[0]}</span>
              <button type="button" className="link-sutil" onClick={sairCliente}>
                <LogOut size={16} /> Sair
              </button>
            </>
          ) : (
            <Link to={`/cliente/${slug}`} className="link-sutil">Entrar</Link>
          )}
          <a href="#agendar" className="botao-cabecalho">Agendar</a>
        </div>
      </header>

      <section className="hero-publico" aria-label="Apresentação">
        <div className="hero-publico-media">
          <img src={tenant.heroImageUrl || "/images/hero-barbearia.jpg"} alt="" />
          <div className="hero-publico-veil" aria-hidden="true" />
        </div>
        <div className="hero-publico-conteudo">
          <p className="hero-marca">{tenant.name}</p>
          <h1>Reserve com calma. Chegue no horário certo.</h1>
          <p>
            Escolha serviços, quem te atende e o melhor horário — tudo online, sem troca de mensagens.
          </p>
          <div className="hero-acoes">
            <a href="#agendar" className="botao-principal">
              Agendar horário <ArrowRight size={18} />
            </a>
            {(tenant.address || tenant.phone) && (
              <span className="hero-meta">
                {tenant.address ? (
                  <><MapPin size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />{tenant.address}</>
                ) : tenant.phone}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="galeria-publico" aria-label="Ambiente e atendimento">
        {(tenant.galleryUrls?.length
          ? tenant.galleryUrls
          : ["/images/servicos.jpg", "/images/ambiente.jpg", "/images/atendimento.jpg"]
        ).slice(0, 3).map((src, indice) => (
          <figure key={`${src}-${indice}`}>
            <img src={src} alt={`Ambiente e atendimento — foto ${indice + 1}`} />
          </figure>
        ))}
      </div>

      <main className="reserva" id="agendar">
        <section className="painel-reserva" aria-labelledby="titulo-reserva">
          <div className="secao-titulo">
            <div className="passo"><b>AGENDA</b><span id="titulo-reserva">Monte seu horário</span></div>
            <p>Quatro passos simples. Você pode combinar mais de um serviço na mesma visita.</p>
          </div>

          <Progresso passo={passo} />

          {mensagem ? (
            <div className="sucesso-agendamento passo-bloco">
              <div className="icone-sucesso" aria-hidden="true"><CheckCircle2 size={28} /></div>
              <h2>Horário confirmado</h2>
              <p>{mensagem}</p>
              <button type="button" className="botao-principal" onClick={reiniciar}>
                Fazer outro agendamento
              </button>
            </div>
          ) : (
            <>
              <div className="passo-bloco" key="passo-servicos">
                <div className="secao-titulo">
                  <div className="passo"><b>01</b><span>Escolha os serviços</span></div>
                  <p>Toque para selecionar. Dá para combinar corte, barba e mais.</p>
                </div>
                <div className="grade-opcoes" role="group" aria-label="Serviços">
                  {servicos.map((item) => {
                    const Icone = iconeServico(item.icon);
                    const ativo = selecionados.some((s) => s.id === item.id);
                    return (
                      <button
                        type="button"
                        className={`servico-card ${ativo ? "ativo" : ""}`}
                        onClick={() => alternarServico(item)}
                        key={item.id}
                        aria-pressed={ativo}
                      >
                        <span className="servico-icone"><Icone size={20} /></span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.durationMinutes} min · {moeda(item.priceCents)}</small>
                        </span>
                        {ativo && <Check className="check-servico" size={16} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selecionados.length > 0 && (
                <div className="passo-bloco" key="passo-profissionais">
                  <div className="secao-titulo">
                    <div className="passo"><b>02</b><span>Escolha o profissional</span></div>
                    <p>Quem combina com o seu estilo — e com os serviços escolhidos.</p>
                  </div>
                  <div className="grade-profissionais" role="group" aria-label="Profissionais">
                    {profissionais.map((item) => {
                      const ativo = profissional?.id === item.id;
                      return (
                        <button
                          type="button"
                          className={`profissional-card ${ativo ? "ativo" : ""}`}
                          onClick={() => { setProfissional(item); setData(""); setSlot(""); setMensagem(""); }}
                          key={item.id}
                          aria-pressed={ativo}
                        >
                          {item.avatarUrl ? (
                            <img src={item.avatarUrl} alt="" className="profissional-avatar" />
                          ) : (
                            <span className="profissional-avatar" aria-hidden="true">{item.name.charAt(0)}</span>
                          )}
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.bio || "Pronto para te atender"}</small>
                          </span>
                          {ativo && <Check className="profissional-check" size={16} aria-hidden="true" />}
                        </button>
                      );
                    })}
                    {!profissionais.length && (
                      <small className="hint">Nenhum profissional atende todos os serviços selecionados. Remova um serviço e tente de novo.</small>
                    )}
                  </div>
                </div>
              )}

              {profissional && (
                <div className="passo-bloco" key="passo-data">
                  <div className="secao-titulo">
                    <div className="passo"><b>03</b><span>Escolha data e horário</span></div>
                    <p>Dias destacados têm vagas. Depois, escolha o horário que funciona para você.</p>
                  </div>
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
                      <div className="horarios" role="group" aria-label={`Horários em ${dataLabel}`}>
                        <p className="horarios-titulo">
                          <Clock3 size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                          {dataLabel}
                        </p>
                        {slots.map((hora) => (
                          <button
                            type="button"
                            className={slot === hora ? "ativo" : ""}
                            onClick={() => setSlot(hora)}
                            key={hora}
                            aria-pressed={slot === hora}
                          >
                            {new Date(hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </button>
                        ))}
                        {!slots.length && <small>Nenhum horário disponível nesta data.</small>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {slot && (
                <form className="formulario passo-bloco confirmacao-elegante" onSubmit={confirmar} key="passo-confirmar">
                  <div className="secao-titulo">
                    <div className="passo"><b>04</b><span>Confirmar agendamento</span></div>
                    <p>Revise os detalhes e confirme — a gente cuida do resto.</p>
                  </div>

                  <div className="resumo-confirmacao">
                    <div className="resumo-linha">
                      <span>Serviços</span>
                      <strong>{selecionados.map((s) => s.name).join(" + ")}</strong>
                    </div>
                    <div className="resumo-linha">
                      <span>Profissional</span>
                      <strong>{profissional!.name}</strong>
                    </div>
                    <div className="resumo-linha">
                      <span>Quando</span>
                      <strong>{dataHora(slot)}</strong>
                    </div>
                    <div className="resumo-linha resumo-total">
                      <span>{totalDuracao} min</span>
                      <strong>{moeda(totalPreco)}</strong>
                    </div>
                  </div>

                  {perfil ? (
                    <div className="hint-logado">
                      <span className="avatar" aria-hidden="true">{perfil.name.charAt(0)}</span>
                      <div>
                        <strong>Agendando como {perfil.name}</strong>
                        <small>{perfil.phone}{perfil.email ? ` · ${perfil.email}` : ""}</small>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label>
                        Nome
                        <input name="name" required minLength={2} autoComplete="name" placeholder="Como podemos te chamar?" />
                      </label>
                      <label>
                        Telefone
                        <input name="phone" required minLength={8} autoComplete="tel" placeholder="(00) 00000-0000" />
                      </label>
                      <label>
                        E-mail <small style={{ display: "inline", color: "var(--suave)" }}>(opcional)</small>
                        <input name="email" type="email" autoComplete="email" placeholder="para receber o lembrete" />
                      </label>
                    </>
                  )}

                  <button type="submit" className="botao-principal" disabled={enviando}>
                    {enviando ? "Confirmando…" : "Confirmar agendamento"}
                    {!enviando && <ArrowRight size={18} />}
                  </button>
                </form>
              )}

              {erro && <Aviso erro>{erro}</Aviso>}
            </>
          )}
        </section>
      </main>

      {selecionados.length > 0 && !mensagem && (
        <aside className="resumo-flutuante" aria-live="polite">
          <div className="resumo-flutuante-info">
            <strong>{selecionados.length} serviço{selecionados.length > 1 ? "s" : ""}</strong>
            <small>{totalDuracao} min · {moeda(totalPreco)}</small>
          </div>
          {passo < 4 ? (
            <a href="#agendar" className="resumo-flutuante-cta">
              Continuar <ArrowRight size={16} />
            </a>
          ) : (
            <span className="resumo-flutuante-cta" style={{ opacity: 0.7, pointerEvents: "none" }}>
              Quase lá
            </span>
          )}
          <span className="resumo-flutuante-nomes">{selecionados.map((s) => s.name).join(" · ")}</span>
        </aside>
      )}
    </div>
  );
}
