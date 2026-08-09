import { useEffect, useState, type FormEvent } from "react";
import { Plus, Power, Users } from "lucide-react";
import { api, type Professional } from "../../lib/api";

export function CadastroProfissionais({ token }: { token: string }) {
  const [itens, setItens] = useState<Professional[]>([]);
  const [erro, setErro] = useState("");
  const carregar = () => api<Professional[]>("/admin/professionals", {}, token).then(setItens);
  useEffect(() => {
    carregar();
  }, [token]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    const f = new FormData(evento.currentTarget);
    try {
      await api(
        "/admin/professionals",
        { method: "POST", body: JSON.stringify({ name: f.get("name"), bio: f.get("bio") }) },
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
            <h2>Novo profissional</h2>
            <p className="admin-panel__lead">Quem atende na agenda e aparece na reserva pública.</p>
          </div>
        </div>

        <form className="admin-form admin-form--inline" onSubmit={salvar}>
          <label className="admin-field">
            <span>Nome</span>
            <input name="name" placeholder="Nome" required />
          </label>
          <label className="admin-field">
            <span>Especialidade ou bio</span>
            <input name="bio" placeholder="Ex.: Barba e acabamento" />
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
            <h2>Equipe</h2>
            <p className="admin-panel__lead">{itens.length} profissionais</p>
          </div>
        </div>

        <div className="admin-list">
          {itens.map((item) => (
            <article key={item.id} className={`admin-row${!item.active ? " admin-row--inactive" : ""}`}>
              <div className="admin-avatar" aria-hidden>
                {item.name.charAt(0).toUpperCase()}
              </div>
              <div className="admin-row__body">
                <strong>{item.name}</strong>
                <small>{item.bio || "Sem bio cadastrada"}</small>
              </div>
              {!item.active && <span className="admin-badge admin-badge--inativo">Inativo</span>}
              {item.active && (
                <div className="admin-row__actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    onClick={() => api(`/admin/professionals/${item.id}`, { method: "DELETE" }, token).then(carregar)}
                  >
                    <Power size={14} /> Desativar
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>

        {!itens.length && (
          <div className="admin-empty">
            <span className="admin-icon admin-icon--lg">
              <Users size={26} />
            </span>
            <h3>Nenhum profissional</h3>
            <p>Adicione a equipe para montar jornadas e receber agendamentos.</p>
          </div>
        )}
      </div>
    </section>
  );
}
