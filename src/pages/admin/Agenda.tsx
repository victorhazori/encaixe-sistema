import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { api, dataHora, type Appointment } from "../../lib/api";

export function Agenda({ token }: { token: string }) {
  const [itens, setItens] = useState<Appointment[]>([]);
  const hoje = new Date().toISOString().slice(0, 10);
  useEffect(() => { api<Appointment[]>(`/admin/appointments?from=${hoje}T00:00:00-03:00&to=2999-01-01`, {}, token).then(setItens); }, [hoje, token]);
  return (
    <section className="lista">
      <div className="barra"><h2>Próximos horários</h2></div>
      {itens.map((item) => (
        <article key={item.id}>
          <time>{dataHora(item.startsAt)}</time>
          <div><strong>{item.customerName}</strong><small>{item.serviceName} · {item.professionalName}</small></div>
          <span className="status">{item.status}</span>
        </article>
      ))}
      {!itens.length && <div className="vazio"><Clock3 /><p>Nenhum agendamento encontrado.</p></div>}
    </section>
  );
}
