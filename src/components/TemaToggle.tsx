import { Moon, Sun } from "lucide-react";
import { useModoTema } from "../lib/theme";

export function TemaToggle({ className = "" }: { className?: string }) {
  const { escuro, alternar } = useModoTema();

  return (
    <button
      type="button"
      className={`tema-toggle ${className}`.trim()}
      onClick={alternar}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
    >
      {escuro ? <Sun size={18} /> : <Moon size={18} />}
      <span className="tema-toggle__label">{escuro ? "Claro" : "Escuro"}</span>
    </button>
  );
}
