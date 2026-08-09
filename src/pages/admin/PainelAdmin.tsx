import { useState, type CSSProperties } from "react";
import { CalendarDays, Clock3, LogOut, Menu, Scissors, Settings2, UserRound, Users } from "lucide-react";
import { Marca } from "../../components/ui";
import { type Tenant } from "../../lib/api";
import { useTenantTheme } from "../../lib/theme";
import { Agenda } from "./Agenda";
import { CadastroClientes } from "./CadastroClientes";
import { CadastroProfissionais } from "./CadastroProfissionais";
import { CadastroServicos } from "./CadastroServicos";
import { Configuracoes } from "./Configuracoes";
import { LoginAdmin } from "./LoginAdmin";
import { VisaoGeral } from "./VisaoGeral";

export function PainelAdmin() {
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
