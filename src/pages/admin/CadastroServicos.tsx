import { useEffect, useState, type FormEvent } from "react";
import { Plus, Power } from "lucide-react";
import { api, moeda, type Service } from "../../lib/api";
import { iconeServico } from "../../lib/icons";

export function CadastroServicos({ token }: { token: string }) {
  const [itens, setItens] = useState<Service[]>([]);
  const [erro, setErro] = useState("");
  const carregar = () => api<Service[]>("/admin/services", {}, token).then(setItens);
  useEffect(() => {
    carregar();
  }, [token]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    const f = new FormData(evento.currentTarget);
    try {
      await api(
        "/admin/services",
        {
          method: "POST",
          body: JSON.stringify({
            name: f.get("name"),
            description: f.get("description"),
            durationMinutes: Number(f.get("duration")),
            priceCents: Math.round(Number(f.get("price")) * 100),
            icon: f.get("icon") || "scissors",
          }),
        },
        token,
      );
      evento.currentTarget.reset();
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>Novo serviço</h2>
            <p className="admin-panel__lead">Defina duração, preço e ícone para a página pública.</p>
          </div>
        </div>

        <form className="admin-form admin-form--inline" onSubmit={salvar}>
          <label className="admin-field">
            <span>Nome</span>
            <input name="name" placeholder="Ex.: Corte masculino" required />
          </label>
          <label className="admin-field">
            <span>Descrição</span>
            <input name="description" placeholder="Opcional" />
          </label>
          <label className="admin-field">
            <span>Duração (min)</span>
            <input name="duration" type="number" min="10" placeholder="30" required />
          </label>
          <label className="admin-field">
            <span>Preço (R$)</span>
            <input name="price" type="number" min="0" step=".01" placeholder="45,00" required />
          </label>
          <label className="admin-field">
            <span>Ícone</span>
            <select name="icon" defaultValue="scissors">
              <option value="scissors">Tesoura</option>
              <option value="sparkles">Brilho</option>
              <option value="razor">Navalha</option>
              <option value="clock">Relógio</option>
            </select>
          </label>
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </form>

        {erro && <div className="admin-notice admin-notice--erro">{erro}</div>}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>Serviços cadastrados</h2>
            <p className="admin-panel__lead">{itens.length} itens na vitrine</p>
          </div>
        </div>

        <div className="admin-list">
          {itens.map((item) => {
            const Icone = iconeServico(item.icon);
            return (
              <article key={item.id} className={`admin-row${!item.active ? " admin-row--inactive" : ""}`}>
                <span className="admin-icon">
                  <Icone size={18} />
                </span>
                <div className="admin-row__body">
                  <strong>{item.name}</strong>
                  <small>
                    {item.durationMinutes} min · {moeda(item.priceCents)}
                    {item.description ? ` · ${item.description}` : ""}
                  </small>
                </div>
                {!item.active && <span className="admin-badge admin-badge--inativo">Inativo</span>}
                {item.active && (
                  <div className="admin-row__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--sm"
                      onClick={() => api(`/admin/services/${item.id}`, { method: "DELETE" }, token).then(carregar)}
                    >
                      <Power size={14} /> Desativar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!itens.length && (
          <div className="admin-empty">
            <h3>Nenhum serviço ainda</h3>
            <p>Cadastre o primeiro serviço para começar a receber reservas.</p>
          </div>
        )}
      </div>
    </section>
  );
}
