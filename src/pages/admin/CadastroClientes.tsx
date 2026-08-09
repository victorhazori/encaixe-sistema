import { useEffect, useState, type FormEvent } from "react";
import { Contact, UserRound } from "lucide-react";
import { Aviso, Gerenciador } from "../../components/ui";
import { api, type Customer } from "../../lib/api";

export function CadastroClientes({ token }: { token: string }) {
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
