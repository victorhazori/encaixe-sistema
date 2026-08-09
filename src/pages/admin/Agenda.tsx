import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { api, type Appointment } from "../../lib/api";

function partesData(valor: string) {
  const d = new Date(valor);
  return {
    hora: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d),
    dia: new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(d),
  };
}

function classeStatus(status: string) {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return "admin-status admin-status--cancelled";
  if (s.includes("pend")) return "admin-status admin-status--pending";
  return "admin-status";
}

export function Agenda({ token }: { token: string }) {
  const [itens, setItens] = useState<Appointment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setCarregando(true);
    api<Appointment[]>(`/admin/appointments?from=${hoje}T00:00:00-03:00&to=2999-01-01`, {}, token)
      .then(setItens)
      .finally(() => setCarregando(false));
  }, [hoje, token]);

  return (
    <section className="admin-section">
      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>Próximos horários</h2>
            <p className="admin-panel__lead">Linha do tempo dos atendimentos a partir de hoje.</p>
          </div>
        </div>

        {carregando && <p className="admin-panel__lead">Carregando agenda…</p>}

        {!carregando && !itens.length && (
          <div className="admin-empty">
            <span className="admin-icon admin-icon--lg">
              <Clock3 size={26} />
            </span>
            <h3>Nenhum agendamento encontrado</h3>
            <p>Quando houver reservas futuras, elas aparecem nesta linha do tempo.</p>
          </div>
        )}

        {!carregando && itens.length > 0 && (
          <div className="admin-agenda__list">
            {itens.map((item) => {
              const { hora, dia } = partesData(item.startsAt);
              return (
                <article className="admin-agenda__item" key={item.id}>
                  <div className="admin-agenda__time">
                    <strong>{hora}</strong>
                    <small>{dia}</small>
                  </div>
                  <div className="admin-agenda__body">
                    <strong>{item.customerName}</strong>
                    <small>
                      {item.serviceName} · {item.professionalName}
                    </small>
                  </div>
                  <span className={classeStatus(item.status)}>{item.status}</span>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
