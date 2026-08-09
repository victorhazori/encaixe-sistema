import { useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Aviso, Marca } from "../../components/ui";
import { api, type Tenant } from "../../lib/api";
import { useTenantTheme } from "../../lib/theme";

export function LoginAdmin({ aoEntrar }: { aoEntrar: (token: string, tenant: Tenant) => void }) {
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
