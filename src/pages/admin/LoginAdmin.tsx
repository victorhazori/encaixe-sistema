import { useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { TemaToggle } from "../../components/TemaToggle";
import { Aviso, Marca } from "../../components/ui";
import { api, type Tenant } from "../../lib/api";
import { aplicarCorMarca, useTenantTheme } from "../../lib/theme";
import "../../styles/admin.css";

export function LoginAdmin({
  slugFixo,
  aoEntrar,
}: {
  slugFixo: string;
  aoEntrar: (token: string, tenant: Tenant) => void;
}) {
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const tenantTema = useTenantTheme(slugFixo);
  const corMarca = tenantTema?.primaryColor ?? "var(--cor-marca)";

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    const form = new FormData(evento.currentTarget);
    try {
      const resultado = await api<{ token: string; tenant: Tenant }>("/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({
          slug: slugFixo,
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      if (resultado.tenant.slug !== slugFixo) {
        throw new Error("Este login não pertence a este estabelecimento.");
      }
      aplicarCorMarca(resultado.tenant.primaryColor);
      aoEntrar(resultado.token, resultado.tenant);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no acesso.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="admin-login" style={{ "--cor-marca": corMarca } as CSSProperties}>
      <section className="admin-login__brand">
        <img className="admin-login__photo" src="/images/ambiente.jpg" alt="Ambiente do negócio" />
        <Marca />
        <h1>
          A agenda do seu negócio, <em>sem ruído.</em>
        </h1>
        <p>Menos tempo organizando. Mais tempo atendendo.</p>
        {tenantTema && (
          <div className="admin-login__tenant-chip">
            <span className="admin-login__tenant-dot" aria-hidden />
            {tenantTema.name}
          </div>
        )}
      </section>

      <div className="admin-login__panel">
        <div className="admin-login__tema">
          <TemaToggle />
        </div>
        <form className="admin-login__card" onSubmit={entrar}>
          <span className="sobretitulo">Painel administrativo</span>
          <h2>Boas-vindas</h2>
          <p>
            Entre na conta de <strong>/{slugFixo}</strong>.
          </p>

          <label>
            Identificador do negócio
            <input name="slug" value={slugFixo} readOnly autoComplete="organization" />
          </label>
          <label>
            E-mail
            <input name="email" type="email" defaultValue="admin@demo.encaixe" required autoComplete="username" />
          </label>
          <label>
            Senha
            <input name="password" type="password" defaultValue="Demo@1234" required autoComplete="current-password" />
          </label>

          <button className="botao-principal" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
            {!carregando && <ArrowRight size={18} />}
          </button>

          {erro && <Aviso erro>{erro}</Aviso>}

          <p className="admin-login__hint">
            <Building2 size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            URL do painel: /{slugFixo}/admin
          </p>
        </form>
      </div>
    </main>
  );
}
