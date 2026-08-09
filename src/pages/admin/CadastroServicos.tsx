import { useEffect, useState, type FormEvent } from "react";
import { Aviso, Gerenciador } from "../../components/ui";
import { api, moeda, type Service } from "../../lib/api";
import { iconeServico } from "../../lib/icons";

export function CadastroServicos({ token }: { token: string }) {
  const [itens, setItens] = useState<Service[]>([]);
  const [erro, setErro] = useState("");
  const carregar = () => api<Service[]>("/admin/services", {}, token).then(setItens);
  useEffect(() => { carregar(); }, [token]);
  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    try {
      await api("/admin/services", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          description: f.get("description"),
          durationMinutes: Number(f.get("duration")),
          priceCents: Math.round(Number(f.get("price")) * 100),
          icon: f.get("icon") || "scissors",
        }),
      }, token);
      evento.currentTarget.reset(); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar."); }
  }
  return (
    <Gerenciador
      titulo="Serviços"
      formulario={(
        <form className="form-inline" onSubmit={salvar}>
          <input name="name" placeholder="Nome" required />
          <input name="description" placeholder="Descrição" />
          <input name="duration" type="number" min="10" placeholder="Minutos" required />
          <input name="price" type="number" min="0" step=".01" placeholder="Preço" required />
          <select name="icon" defaultValue="scissors">
            <option value="scissors">Tesoura</option>
            <option value="sparkles">Brilho</option>
            <option value="razor">Navalha</option>
            <option value="clock">Relógio</option>
          </select>
          <button>Adicionar</button>
        </form>
      )}
    >
      {erro && <Aviso erro>{erro}</Aviso>}
      {itens.map((item) => {
        const Icone = iconeServico(item.icon);
        return (
          <article key={item.id}>
            <Icone size={18} />
            <div><strong>{item.name}</strong><small>{item.durationMinutes} min · {moeda(item.priceCents)}</small></div>
            <button type="button" onClick={() => api(`/admin/services/${item.id}`, { method: "DELETE" }, token).then(carregar)}>Desativar</button>
          </article>
        );
      })}
    </Gerenciador>
  );
}
