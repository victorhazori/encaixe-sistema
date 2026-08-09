import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { api, dataHora, type Professional, type Tenant } from "../../lib/api";

export function Configuracoes({ token, tenant, atualizar }: { token: string; tenant: Tenant; atualizar: (t: Tenant) => void }) {
  type Horario = { id: number; professionalId: number; weekday: number; startTime: string; endTime: string };
  type Bloqueio = { id: number; professionalId?: number; startsAt: string; endsAt: string; reason?: string };
  const [profissionais, setProfissionais] = useState<Professional[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const carregarAgenda = () => Promise.all([
    api<Professional[]>("/admin/professionals", {}, token),
    api<Horario[]>("/admin/hours", {}, token),
    api<Bloqueio[]>("/admin/blocks", {}, token),
  ]).then(([p, h, b]) => { setProfissionais(p); setHorarios(h); setBloqueios(b); });
  useEffect(() => { carregarAgenda(); }, [token]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    const novo = await api<Tenant>("/admin/branding", {
      method: "PUT",
      body: JSON.stringify({
        name: f.get("name"),
        phone: f.get("phone"),
        address: f.get("address"),
        primaryColor: f.get("primaryColor"),
      }),
    }, token);
    localStorage.setItem("encaixe_tenant", JSON.stringify(novo));
    document.documentElement.style.setProperty("--cor-marca", novo.primaryColor);
    atualizar(novo);
  }
  async function salvarHorario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/hours", {
      method: "POST",
      body: JSON.stringify({
        professionalId: Number(f.get("professionalId")),
        weekday: Number(f.get("weekday")),
        startTime: f.get("startTime"),
        endTime: f.get("endTime"),
      }),
    }, token);
    carregarAgenda();
  }
  async function salvarBloqueio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); const f = new FormData(evento.currentTarget);
    await api("/admin/blocks", {
      method: "POST",
      body: JSON.stringify({
        professionalId: f.get("professionalId") ? Number(f.get("professionalId")) : null,
        startsAt: new Date(String(f.get("startsAt"))),
        endsAt: new Date(String(f.get("endsAt"))),
        reason: f.get("reason"),
      }),
    }, token);
    evento.currentTarget.reset(); carregarAgenda();
  }
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <section className="gerenciador">
      <h2>Identidade do negócio</h2>
      <form className="formulario largura-media" onSubmit={salvar}>
        <label>Nome<input name="name" defaultValue={tenant.name} /></label>
        <label>Telefone<input name="phone" defaultValue={tenant.phone} /></label>
        <label>Endereço<input name="address" defaultValue={tenant.address} /></label>
        <label>Cor da marca<input name="primaryColor" type="color" defaultValue={tenant.primaryColor} /></label>
        <button className="botao-principal">Salvar alterações</button>
      </form>
      <h2 className="subsecao">Jornada de trabalho</h2>
      <form className="form-inline form-agenda" onSubmit={salvarHorario}>
        <select name="professionalId" required>{profissionais.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select>
        <select name="weekday">{dias.map((dia, indice) => <option value={indice} key={dia}>{dia}</option>)}</select>
        <input name="startTime" type="time" defaultValue="09:00" required />
        <input name="endTime" type="time" defaultValue="18:00" required />
        <button>Salvar jornada</button>
      </form>
      <div className="lista">
        {horarios.map((h) => (
          <article key={h.id}>
            <Clock3 />
            <div>
              <strong>{profissionais.find((p) => p.id === h.professionalId)?.name}</strong>
              <small>{dias[h.weekday]} · {h.startTime.slice(0, 5)} às {h.endTime.slice(0, 5)}</small>
            </div>
            <button type="button" onClick={() => api(`/admin/hours/${h.id}`, { method: "DELETE" }, token).then(carregarAgenda)}>Excluir</button>
          </article>
        ))}
      </div>
      <h2 className="subsecao">Bloqueios de agenda</h2>
      <form className="form-inline form-agenda" onSubmit={salvarBloqueio}>
        <select name="professionalId"><option value="">Toda a equipe</option>{profissionais.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select>
        <input name="startsAt" type="datetime-local" required />
        <input name="endsAt" type="datetime-local" required />
        <input name="reason" placeholder="Motivo" />
        <button>Bloquear</button>
      </form>
      <div className="lista">
        {bloqueios.map((b) => (
          <article key={b.id}>
            <CalendarDays />
            <div>
              <strong>{b.reason || "Horário bloqueado"}</strong>
              <small>{dataHora(b.startsAt)} até {dataHora(b.endsAt)}</small>
            </div>
            <button type="button" onClick={() => api(`/admin/blocks/${b.id}`, { method: "DELETE" }, token).then(carregarAgenda)}>Excluir</button>
          </article>
        ))}
      </div>
    </section>
  );
}
