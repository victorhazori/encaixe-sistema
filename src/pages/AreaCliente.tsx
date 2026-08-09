import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, LogOut, Plus, Scissors, UserRound } from "lucide-react";
import { Link, useParams } from "react-router";
import { TemaToggle } from "../components/TemaToggle";
import { Aviso, Marca } from "../components/ui";
import { api, type Appointment } from "../lib/api";
import { useTenantTheme } from "../lib/theme";
import "../styles/cliente.css";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

function partesData(iso: string) {
  const d = new Date(iso);
  return {
    dia: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(d),
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d).replace(".", ""),
    hora: new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(d),
    semana: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d),
  };
}

export function AreaCliente() {
  const { slug = "" } = useParams();
  const chave = `encaixe_cliente_${slug}`;
  const [token, setToken] = useState(() => localStorage.getItem(chave) ?? "");
  const [itens, setItens] = useState<Appointment[]>([]);
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [erro, setErro] = useState("");
  const tenant = useTenantTheme(slug);
  const corMarca = tenant?.primaryColor;
  const nomeLoja = tenant?.name ?? "seu horário";

  useEffect(() => {
    if (token) {
      api<Appointment[]>("/customer/appointments", {}, token).then(setItens).catch(() => setToken(""));
    }
  }, [token]);

  async function autenticarCliente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    setErro("");
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
      localStorage.setItem(chave, resultado.token);
      setToken(resultado.token);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no acesso.");
    }
  }

  function sair() {
    localStorage.removeItem(chave);
    setToken("");
    setItens([]);
  }

  async function cancelar(id: number) {
    await api(`/customer/appointments/${id}/cancel`, { method: "PATCH" }, token);
    setItens((atuais) => atuais.map((item) => (item.id === id ? { ...item, status: "cancelled" } : item)));
  }

  const temaStyle = corMarca ? ({ "--cor-marca": corMarca } as CSSProperties) : undefined;

  if (!token) {
    return (
      <main className="cli-auth" style={temaStyle}>
        <div className="cli-auth-split">
          <section className="cli-auth-hero">
            <img className="cli-auth-hero-foto" src="/images/ambiente.jpg" alt="" />
            <Marca />
            <div className="cli-auth-hero-copy">
              <span className="sobretitulo">Área do cliente</span>
              <h1>Seus horários, sempre à mão.</h1>
              <p>
                Acompanhe e cancele agendamentos em {nomeLoja} com a mesma facilidade de marcar.
              </p>
            </div>
            <p className="cli-auth-hero-foot">Encaixe · agendamento sem atrito</p>
          </section>

          <section className="cli-auth-panel">
            <div className="cli-auth-tema">
              <TemaToggle />
            </div>
            <form className="cli-auth-card" onSubmit={autenticarCliente}>
              <div className="cli-toggle" role="tablist" aria-label="Modo de acesso">
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === "login"}
                  className={modo === "login" ? "ativo" : ""}
                  onClick={() => { setModo("login"); setErro(""); }}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === "cadastro"}
                  className={modo === "cadastro" ? "ativo" : ""}
                  onClick={() => { setModo("cadastro"); setErro(""); }}
                >
                  Criar conta
                </button>
              </div>

              <h1>{modo === "login" ? "Boas-vindas" : "Criar conta"}</h1>
              <p className="cli-auth-lead">
                {modo === "login"
                  ? "Acesse para ver seus próximos horários."
                  : "Leva menos de um minuto para começar."}
              </p>

              {modo === "cadastro" && (
                <>
                  <label>
                    Nome
                    <input name="name" autoComplete="name" required />
                  </label>
                  <label>
                    Telefone
                    <input name="phone" autoComplete="tel" required />
                  </label>
                </>
              )}
              <label>
                E-mail
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                Senha
                <input
                  name="password"
                  type="password"
                  autoComplete={modo === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                />
              </label>

              <button className="botao-principal">
                {modo === "login" ? "Entrar" : "Cadastrar"}
              </button>

              <p className="cli-auth-switch">
                {modo === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
                <button
                  type="button"
                  onClick={() => { setModo(modo === "login" ? "cadastro" : "login"); setErro(""); }}
                >
                  {modo === "login" ? "Criar agora" : "Fazer login"}
                </button>
              </p>

              {erro && <Aviso erro>{erro}</Aviso>}

              <Link to={`/${slug}`} className="cli-voltar-agendar">
                <ArrowLeft size={18} /> Voltar para agendamento
              </Link>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="cli-area" style={temaStyle}>
      <header className="cli-cabecalho">
        <div className="cli-cabecalho-marca">
          <Marca />
          {tenant?.name && <small>{tenant.name}</small>}
        </div>
        <div className="cli-acoes">
          <TemaToggle />
          <Link to={`/${slug}`} className="botao-principal">
            <Plus size={18} /> Novo agendamento
          </Link>
          <button type="button" className="cli-sair" onClick={sair}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </header>

      <div className="cli-titulo">
        <h1>Próximos agendamentos</h1>
        <p>Confira data, serviço e profissional — ou cancele se precisar remarcar.</p>
      </div>

      <section className="cli-lista" aria-live="polite">
        {itens.map((item, i) => {
          const data = partesData(item.startsAt);
          return (
            <article
              key={item.id}
              className="cli-cartao"
              style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}
            >
              <div className="cli-cartao-data" aria-hidden>
                <strong>{data.dia}</strong>
                <span>{data.mes}</span>
                <em>{data.hora}</em>
              </div>
              <div className="cli-cartao-corpo">
                <strong>{item.serviceName || "Serviço"}</strong>
                <small>
                  <span className="cli-meta">
                    <CalendarDays size={14} /> {data.semana}
                  </span>
                  {item.professionalName && (
                    <span className="cli-meta">
                      <UserRound size={14} /> {item.professionalName}
                    </span>
                  )}
                </small>
              </div>
              <div className="cli-cartao-acoes">
                <span className={`cli-status ${item.status}`}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
                {item.status === "confirmed" && (
                  <button type="button" className="cli-cancelar" onClick={() => cancelar(item.id)}>
                    Cancelar
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {!itens.length && (
          <div className="cli-vazio">
            <div className="cli-vazio-icone">
              <Scissors size={28} />
            </div>
            <h2>Nenhum horário por aqui</h2>
            <p>Você ainda não tem agendamentos futuros. Reserve um encaixe e ele aparece nesta lista.</p>
            <Link to={`/${slug}`} className="botao-principal">
              <Plus size={18} /> Agendar agora
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
