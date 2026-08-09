export type Tenant = {
  id: number;
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  primaryColor: string;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  galleryUrls?: string[];
};
export type Service = { id: number; name: string; description?: string; durationMinutes: number; priceCents: number; icon?: string; active: boolean };
export type Professional = { id: number; name: string; bio?: string; avatarUrl?: string; active: boolean };
export type Customer = { id: number; name: string; phone: string; email?: string | null; active: boolean };
export type Appointment = {
  id: number;
  startsAt: string;
  endsAt: string;
  status: string;
  customerName?: string;
  professionalName?: string;
  serviceName?: string;
  notes?: string | null;
};
export type PerfilCliente = { name: string; email?: string | null; phone: string };

export async function api<T>(caminho: string, opcoes: RequestInit = {}, token?: string): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
  });
  const dados = resposta.status === 204 ? undefined : await resposta.json();
  if (!resposta.ok) throw new Error(dados?.erro ?? "Não foi possível concluir a operação.");
  return dados as T;
}

export function moeda(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

export function dataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}
