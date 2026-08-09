import { Brush, Clock3, Scissors, Sparkles, Users } from "lucide-react";

export function iconeServico(chave?: string) {
  const mapa: Record<string, typeof Scissors> = {
    scissors: Scissors,
    sparkles: Sparkles,
    razor: Brush,
    brush: Brush,
    clock: Clock3,
    users: Users,
  };
  return mapa[chave ?? "scissors"] ?? Scissors;
}
