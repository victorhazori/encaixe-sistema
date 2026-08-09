import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Sparkles, TrendingUp } from "lucide-react";
import { api, moeda } from "../../lib/api";

export function VisaoGeral({ token }: { token: string }) {
  const [dados, setDados] = useState({ total: 0, confirmados: 0, receitaCents: 0 });
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const data = new Date().toISOString().slice(0, 10);
    api<typeof dados>(`/admin/dashboard/day?date=${data}`, {}, token)
      .then(setDados)
      .finally(() => setPronto(true));
  }, [token]);

  const vazio = pronto && dados.total === 0;
  const hoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <section className="admin-section">
      <div className="admin-metrics">
        <article className="admin-metric">
          <small>Agendamentos hoje</small>
          <strong>{dados.total}</strong>
          <span className="admin-metric__icon" aria-hidden>
            <CalendarDays size={18} />
          </span>
        </article>
        <article className="admin-metric">
          <small>Confirmados</small>
          <strong>{dados.confirmados}</strong>
          <span className="admin-metric__icon" aria-hidden>
            <Clock3 size={18} />
          </span>
        </article>
        <article className="admin-metric">
          <small>Receita prevista</small>
          <strong>{moeda(dados.receitaCents)}</strong>
          <span className="admin-metric__icon" aria-hidden>
            <Sparkles size={18} />
          </span>
        </article>
      </div>

      {vazio ? (
        <div className="admin-empty">
          <span className="admin-icon admin-icon--lg">
            <CalendarDays size={26} />
          </span>
          <h2>Dia livre por enquanto</h2>
          <p>
            Nenhum horário marcado para {hoje}. Quando entrarem reservas, o resumo do dia aparece aqui.
          </p>
        </div>
      ) : (
        <div className="admin-insight">
          <span className="admin-icon admin-icon--lg">
            <TrendingUp size={26} />
          </span>
          <div>
            <h2>Seu dia em um só lugar</h2>
            <p>
              {pronto
                ? `Hoje, ${hoje}: ${dados.confirmados} de ${dados.total} confirmações e ${moeda(dados.receitaCents)} previstos. Use a Agenda para acompanhar a fila.`
                : "Carregando o panorama do dia…"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
