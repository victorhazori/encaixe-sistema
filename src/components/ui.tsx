import { type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export function Marca({ compacta = false }: { compacta?: boolean }) {
  return <div className="marca"><span className="marca-simbolo">E</span>{!compacta && <strong>Encaixe</strong>}</div>;
}

export function Aviso({ children, erro = false }: { children: ReactNode; erro?: boolean }) {
  return <p className={erro ? "aviso erro" : "aviso"}>{children}</p>;
}

export function Progresso({ passo }: { passo: number }) {
  const etapas = ["Serviços", "Profissional", "Data", "Confirmar"];
  return (
    <ol className="progresso-passos">
      {etapas.map((nome, i) => {
        const n = i + 1;
        return (
          <li key={nome} className={passo === n ? "atual" : passo > n ? "feito" : ""}>
            <span>{passo > n ? <Check size={14} /> : n}</span>
            <small>{nome}</small>
          </li>
        );
      })}
    </ol>
  );
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
  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const primeiro = new Date(ano, mes - 1, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const offset = primeiro.getDay();
  const titulo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(primeiro);
  const celulas: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];

  function navegar(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1);
    onMudarMes(d.getFullYear(), d.getMonth() + 1);
  }

  return (
    <div className="calendario">
      <div className="calendario-cabecalho">
        <button type="button" aria-label="Mês anterior" onClick={() => navegar(-1)}><ChevronLeft size={18} /></button>
        <strong>{titulo}</strong>
        <button type="button" aria-label="Próximo mês" onClick={() => navegar(1)}><ChevronRight size={18} /></button>
      </div>
      <div className="calendario-semana">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={`${d}${i}`}>{d}</span>)}
      </div>
      <div className="calendario-grade">
        {celulas.map((dia, i) => {
          if (!dia) return <span key={`vazio-${i}`} className="dia vazio" />;
          const data = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          const slots = disponibilidade[data] ?? 0;
          const passado = data < hojeStr;
          const desabilitado = passado || slots === 0;
          return (
            <button
              type="button"
              key={data}
              className={`dia ${selecionado === data ? "selecionado" : ""} ${slots > 0 && !passado ? "disponivel" : ""} ${desabilitado ? "desabilitado" : ""}`}
              disabled={desabilitado}
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
  return <section className="gerenciador"><div className="barra"><h2>{titulo}</h2></div>{formulario}<div className="lista">{children}</div></section>;
}
