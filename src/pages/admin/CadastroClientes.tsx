import { useEffect, useState, type FormEvent } from "react";
import { Contact, Pencil, Trash2, UserRound, UserPlus, X } from "lucide-react";
import { api, type Customer } from "../../lib/api";

export function CadastroClientes({ token }: { token: string }) {
  const [itens, setItens] = useState<Customer[]>([]);
  const [editando, setEditando] = useState<Customer>();
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "inativos">("todos");
  const carregar = () => api<Customer[]>("/admin/customers", {}, token).then(setItens);
  useEffect(() => {
    carregar();
  }, [token]);

  const filtrados = itens.filter((c) => {
    if (filtro === "ativos") return c.active;
    if (filtro === "inativos") return !c.active;
    return true;
  });

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setAviso("");
    const f = new FormData(evento.currentTarget);
    const corpo = { name: String(f.get("name")), phone: String(f.get("phone")), email: String(f.get("email") || "") };
    try {
      if (editando) {
        await api(`/admin/customers/${editando.id}`, { method: "PUT", body: JSON.stringify(corpo) }, token);
        setEditando(undefined);
        setAviso("Cliente atualizado.");
      } else {
        await api("/admin/customers", { method: "POST", body: JSON.stringify(corpo) }, token);
        setAviso("Cliente adicionado.");
      }
      evento.currentTarget.reset();
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  async function remover(cliente: Customer) {
    const mensagem = cliente.active
      ? `Remover ${cliente.name}? Se houver histórico de agenda, o cliente será apenas inativado.`
      : `Excluir permanentemente ${cliente.name}?`;
    if (!window.confirm(mensagem)) return;

    setErro("");
    setAviso("");
    try {
      const r = await api<{ inactivated?: boolean; deleted?: boolean }>(
        `/admin/customers/${cliente.id}`,
        { method: "DELETE" },
        token,
      );
      if (r.inactivated) {
        setAviso(`${cliente.name} foi inativado — há agendamentos vinculados ao histórico.`);
      } else if (r.deleted) {
        setAviso(`${cliente.name} foi excluído.`);
      }
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover.");
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>{editando ? "Editar cliente" : "Novo cliente"}</h2>
            <p className="admin-panel__lead">
              {editando
                ? "Atualize os dados e salve. Cancelar descarta a edição."
                : "Cadastre contatos para agendar com mais agilidade."}
            </p>
          </div>
        </div>

        <form className="admin-form admin-form--inline" onSubmit={salvar}>
          <label className="admin-field">
            <span>Nome</span>
            <input
              name="name"
              placeholder="Nome completo"
              required
              defaultValue={editando?.name}
              key={editando ? `e-${editando.id}` : "novo"}
            />
          </label>
          <label className="admin-field">
            <span>Telefone</span>
            <input name="phone" placeholder="(00) 00000-0000" required defaultValue={editando?.phone} />
          </label>
          <label className="admin-field">
            <span>E-mail</span>
            <input name="email" type="email" placeholder="opcional" defaultValue={editando?.email ?? ""} />
          </label>
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              {editando ? (
                <>
                  <Pencil size={16} /> Salvar
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Adicionar
                </>
              )}
            </button>
            {editando && (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setEditando(undefined)}>
                <X size={16} /> Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>Lista de clientes</h2>
            <p className="admin-panel__lead">{filtrados.length} no filtro atual · {itens.length} no total</p>
          </div>
        </div>

        <div className="admin-filters" role="tablist" aria-label="Filtro de clientes">
          {(["todos", "ativos", "inativos"] as const).map((f) => (
            <button type="button" key={f} className={filtro === f ? "ativo" : ""} onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : f === "ativos" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>

        {erro && <div className="admin-notice admin-notice--erro">{erro}</div>}
        {aviso && <div className="admin-notice admin-notice--ok">{aviso}</div>}

        <div className="admin-list">
          {filtrados.map((item) => (
            <article key={item.id} className={`admin-row${item.active ? "" : " admin-row--inactive"}`}>
              <span className="admin-icon">
                <Contact size={18} />
              </span>
              <div className="admin-row__body">
                <strong>{item.name}</strong>
                <small>
                  {item.phone}
                  {item.email ? ` · ${item.email}` : ""}
                </small>
              </div>
              <span className={`admin-badge admin-badge--${item.active ? "ativo" : "inativo"}`}>
                {item.active ? "Ativo" : "Inativo"}
              </span>
              <div className="admin-row__actions">
                <button type="button" className="admin-btn admin-btn--sm" onClick={() => setEditando(item)}>
                  <Pencil size={14} /> Editar
                </button>
                <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => remover(item)}>
                  <Trash2 size={14} /> {item.active ? "Excluir" : "Remover"}
                </button>
              </div>
            </article>
          ))}
        </div>

        {!filtrados.length && (
          <div className="admin-empty">
            <span className="admin-icon admin-icon--lg">
              <UserRound size={26} />
            </span>
            <h3>Nenhum cliente neste filtro</h3>
            <p>Ajuste o filtro ou cadastre um novo contato acima.</p>
          </div>
        )}
      </div>
    </section>
  );
}
