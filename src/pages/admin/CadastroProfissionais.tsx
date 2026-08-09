import { useEffect, useState, type FormEvent } from "react";
import { Gerenciador } from "../../components/ui";
import { api, type Professional } from "../../lib/api";

export function CadastroProfissionais({ token }: { token: string }) {
  const [itens, setItens] = useState<Professional[]>([]);
  const carregar = () => api<Professional[]>("/admin/professionals", {}, token).then(setItens);
  useEffect(() => { carregar(); }, [token]);
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/professionals", { method: "POST", body: JSON.stringify({ name: f.get("name"), bio: f.get("bio") }) }, token);
    evento.currentTarget.reset(); carregar();
  }
  return (
    <Gerenciador
      titulo="Profissionais"
      formulario={(
        <form className="form-inline" onSubmit={salvar}>
          <input name="name" placeholder="Nome" required />
          <input name="bio" placeholder="Especialidade ou bio" />
          <button>Adicionar</button>
        </form>
      )}
    >
      {itens.map((item) => (
        <article key={item.id}>
          <div className="avatar">{item.name.charAt(0)}</div>
          <div><strong>{item.name}</strong><small>{item.bio}</small></div>
          <button type="button" onClick={() => api(`/admin/professionals/${item.id}`, { method: "DELETE" }, token).then(carregar)}>Desativar</button>
        </article>
      ))}
    </Gerenciador>
  );
}
