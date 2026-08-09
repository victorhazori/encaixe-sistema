import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Sparkles } from "lucide-react";
import { api, moeda } from "../../lib/api";

export function VisaoGeral({ token }: { token: string }) {
  const [dados, setDados] = useState({ total: 0, confirmados: 0, receitaCents: 0 });
  useEffect(() => { api<typeof dados>(`/admin/dashboard/day?date=${new Date().toISOString().slice(0, 10)}`, {}, token).then(setDados); }, [token]);
  return (
    <section>
      <div className="metricas">
        <article><small>Agendamentos hoje</small><strong>{dados.total}</strong><CalendarDays /></article>
        <article><small>Confirmados</small><strong>{dados.confirmados}</strong><Clock3 /></article>
        <article><small>Receita prevista</small><strong>{moeda(dados.receitaCents)}</strong><Sparkles /></article>
      </div>
      <div className="vazio"><CalendarDays /><h2>Seu dia em um só lugar</h2><p>Acompanhe a agenda e mantenha sua equipe sincronizada.</p></div>
    </section>
  );
}
