import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { CalendarDays, LogOut, Plus } from "lucide-react";
import { Link, useParams } from "react-router";
import { Aviso, Marca } from "../components/ui";
import { api, dataHora, type Appointment } from "../lib/api";
import { useTenantTheme } from "../lib/theme";

export function AreaCliente() {
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
