import { type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { MarcaIcone } from "./MarcaIcone";

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="marca" aria-label="Encaixe">
      <span className="marca-simbolo">
        <MarcaIcone />
      </span>
      {!compacta && <strong>Encaixe</strong>}
    </div>
  );
}

export function Aviso({ children, erro = false }: { children: ReactNode; erro?: boolean }) {
  return (
    <p className={erro ? "aviso erro" : "aviso"} role={erro ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function Progresso({ passo }: { passo: number }) {
  const etapas = ["Serviços", "Profissional", "Data", "Confirmar"];
  return (
    <ol className="progresso-passos" aria-label="Etapas do agendamento">
      {etapas.map((nome, i) => {
        const n = i + 1;
        const estado = passo === n ? "atual" : passo > n ? "feito" : "";
        return (
          <li key={nome} className={estado} aria-current={passo === n ? "step" : undefined}>
            <span aria-hidden="true">{passo > n ? <Check size={14} strokeWidth={2.5} /> : n}</span>
            <small>{nome}</small>
          </li>
        );
      })}
    </ol>
  );
}

function dataLocalISO(valor = new Date()) {
  const y = valor.getFullYear();
  const m = String(valor.getMonth() + 1).padStart(2, "0");
  const d = String(valor.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CalendarioMes({
  ano,
  mes,
  selecionado,
  disponibilidade,
  onMudarMes,
  onSelecionar,
}: {
  ano: number;
  mes: number;
  selecionado?: string;
  disponibilidade: Record<string, number>;
  onMudarMes: (ano: number, mes: number) => void;
  onSelecionar: (data: string) => void;
}) {
  const hojeStr = dataLocalISO();
  const primeiro = new Date(ano, mes - 1, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  // 0 = domingo … 6 = sábado — alinha o dia 1 na coluna certa sem células fantasma
  const colunaInicial = primeiro.getDay() + 1;
  const titulo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(primeiro);

  function navegar(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    onMudarMes(d.getFullYear(), d.getMonth() + 1);
  }

  return (
    <div className="calendario" role="group" aria-label={`Calendário de ${titulo}`}>
      <div className="calendario-cabecalho">
        <button type="button" aria-label="Mês anterior" onClick={() => navegar(-1)}>
          <ChevronLeft size={18} />
        </button>
        <strong>{titulo}</strong>
        <button type="button" aria-label="Próximo mês" onClick={() => navegar(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendario-semana" aria-hidden="true">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={`${d}${i}`}>{d}</span>
        ))}
      </div>
      <div className="calendario-grade">
        {Array.from({ length: diasNoMes }, (_, i) => {
          const dia = i + 1;
          const data = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const slots = disponibilidade[data] ?? 0;
          const passado = data < hojeStr;
          const desabilitado = passado || slots === 0;
          const rotulo = desabilitado
            ? `${dia} de ${titulo}, indisponível`
            : `${dia} de ${titulo}, ${slots} horário${slots === 1 ? "" : "s"}`;
          return (
            <button
              type="button"
              key={data}
              style={dia === 1 ? { gridColumnStart: colunaInicial } : undefined}
              className={`dia ${selecionado === data ? "selecionado" : ""} ${slots > 0 && !passado ? "disponivel" : ""} ${desabilitado ? "desabilitado" : ""}`}
              disabled={desabilitado}
              aria-label={rotulo}
              aria-pressed={selecionado === data}
              onClick={() => onSelecionar(data)}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Gerenciador({ titulo, formulario, children }: { titulo: string; formulario: ReactNode; children: ReactNode }) {
  return (
    <section className="gerenciador">
      <div className="barra"><h2>{titulo}</h2></div>
      {formulario}
      <div className="lista">{children}</div>
    </section>
  );
}
