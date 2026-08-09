import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { appointments, customers, professionals, services, tenantWhatsapp, waMessageLog, waSessions } from "../db/schema.js";

function menu(nome: string) {
  return [
    `Olá${nome ? `, ${nome}` : ""}! Sou o assistente do Encaixe.`,
    "",
    "Escolha uma opção:",
    "1 - Meus próximos agendamentos",
    "2 - Cancelar um agendamento",
    "3 - Falar com um atendente",
    "",
    "Digite o número da opção.",
  ].join("\n");
}

export async function registrarMensagem(tenantId: number, phone: string, direction: "in" | "out", body: string) {
  await db.insert(waMessageLog).values({ tenantId, phone, direction, body });
}

export async function obterSessao(tenantId: number, phone: string) {
  const [existente] = await db.select().from(waSessions).where(and(
    eq(waSessions.tenantId, tenantId),
    eq(waSessions.phone, phone),
  )).limit(1);
  if (existente) return existente;
  const [criada] = await db.insert(waSessions).values({
    tenantId,
    phone,
    state: "idle",
    draft: {},
    handoff: false,
  }).returning();
  return criada;
}

async function proximosAgendamentos(tenantId: number, phone: string) {
  const digits = phone.replace(/\D/g, "");
  const clientes = await db.select().from(customers).where(eq(customers.tenantId, tenantId));
  const cliente = clientes.find((c) => (c.phone || "").replace(/\D/g, "").endsWith(digits.slice(-8)));
  if (!cliente) return [];

  return db.select({
    id: appointments.id,
    startsAt: appointments.startsAt,
    status: appointments.status,
    serviceName: services.name,
    professionalName: professionals.name,
  }).from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
    .where(and(
      eq(appointments.tenantId, tenantId),
      eq(appointments.customerId, cliente.id),
      ne(appointments.status, "cancelled"),
      gte(appointments.startsAt, new Date()),
    ))
    .orderBy(asc(appointments.startsAt))
    .limit(5);
}

function formatarAgenda(lista: Awaited<ReturnType<typeof proximosAgendamentos>>) {
  if (!lista.length) return "Não encontrei agendamentos futuros neste número.";
  return [
    "Seus próximos horários:",
    ...lista.map((item, i) => {
      const quando = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(item.startsAt);
      return `${i + 1}) ${quando} · ${item.serviceName} com ${item.professionalName} (${item.status})`;
    }),
  ].join("\n");
}

export async function processarMensagemEntrada(tenantId: number, phone: string, texto: string) {
  const [cfg] = await db.select().from(tenantWhatsapp).where(eq(tenantWhatsapp.tenantId, tenantId)).limit(1);
  const welcome = cfg?.welcomeMessage?.trim() || null;
  const handoffMsg = cfg?.handoffMessage?.trim()
    || "Certo! Um atendente humano vai continuar por aqui. Digite *bot* para voltar ao menu automático.";

  await registrarMensagem(tenantId, phone, "in", texto);
  const sessao = await obterSessao(tenantId, phone);
  const msg = texto.trim().toLowerCase();

  if (msg === "bot" || msg === "menu" || msg === "oi" || msg === "olá" || msg === "ola") {
    await db.update(waSessions).set({ handoff: false, state: "idle", updatedAt: new Date() }).where(eq(waSessions.id, sessao.id));
    const resposta = welcome ? `${welcome}\n\n${menu("")}` : menu("");
    await registrarMensagem(tenantId, phone, "out", resposta);
    return { reply: resposta, handoff: false };
  }

  if (sessao.handoff) {
    const resposta = "Sua mensagem foi encaminhada ao atendimento. Digite *bot* para voltar ao menu.";
    await registrarMensagem(tenantId, phone, "out", resposta);
    return { reply: resposta, handoff: true };
  }

  if (msg === "3" || msg.includes("atendente") || msg.includes("humano")) {
    await db.update(waSessions).set({ handoff: true, state: "handoff", updatedAt: new Date() }).where(eq(waSessions.id, sessao.id));
    await registrarMensagem(tenantId, phone, "out", handoffMsg);
    return { reply: handoffMsg, handoff: true };
  }

  if (msg === "1" || msg.includes("agendamento")) {
    const lista = await proximosAgendamentos(tenantId, phone);
    const resposta = `${formatarAgenda(lista)}\n\nDigite *menu* para voltar.`;
    await registrarMensagem(tenantId, phone, "out", resposta);
    return { reply: resposta, handoff: false };
  }

  if (msg === "2" || msg.includes("cancel")) {
    const lista = await proximosAgendamentos(tenantId, phone);
    if (!lista.length) {
      const resposta = "Não há agendamentos futuros para cancelar.\n\nDigite *menu* para voltar.";
      await registrarMensagem(tenantId, phone, "out", resposta);
      return { reply: resposta, handoff: false };
    }
    await db.update(waSessions).set({
      state: "cancel_pick",
      draft: { ids: lista.map((i) => i.id) },
      updatedAt: new Date(),
    }).where(eq(waSessions.id, sessao.id));
    const resposta = [
      "Qual agendamento deseja cancelar?",
      ...lista.map((item, i) => {
        const quando = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.startsAt);
        return `${i + 1}) ${quando} · ${item.serviceName}`;
      }),
      "",
      "Responda com o número. Digite *menu* para voltar.",
    ].join("\n");
    await registrarMensagem(tenantId, phone, "out", resposta);
    return { reply: resposta, handoff: false };
  }

  if (sessao.state === "cancel_pick") {
    const ids = Array.isArray((sessao.draft as { ids?: number[] })?.ids)
      ? (sessao.draft as { ids: number[] }).ids
      : [];
    const indice = Number(msg) - 1;
    if (!Number.isInteger(indice) || indice < 0 || indice >= ids.length) {
      const resposta = "Opção inválida. Digite o número do agendamento ou *menu*.";
      await registrarMensagem(tenantId, phone, "out", resposta);
      return { reply: resposta, handoff: false };
    }
    const id = ids[indice]!;
    await db.update(appointments).set({ status: "cancelled" }).where(and(
      eq(appointments.id, id),
      eq(appointments.tenantId, tenantId),
    ));
    await db.update(waSessions).set({ state: "idle", draft: {}, updatedAt: new Date() }).where(eq(waSessions.id, sessao.id));
    const resposta = "Agendamento cancelado. Digite *menu* para outras opções.";
    await registrarMensagem(tenantId, phone, "out", resposta);
    return { reply: resposta, handoff: false };
  }

  const resposta = menu("");
  await registrarMensagem(tenantId, phone, "out", resposta);
  return { reply: resposta, handoff: false };
}

export async function listarConversas(tenantId: number) {
  const rows = await db.select({
    phone: waMessageLog.phone,
    body: waMessageLog.body,
    createdAt: waMessageLog.createdAt,
    direction: waMessageLog.direction,
  }).from(waMessageLog)
    .where(eq(waMessageLog.tenantId, tenantId))
    .orderBy(desc(waMessageLog.createdAt))
    .limit(400);

  const sessoes = await db.select({
    phone: waSessions.phone,
    handoff: waSessions.handoff,
    state: waSessions.state,
  }).from(waSessions).where(eq(waSessions.tenantId, tenantId));
  const sessaoPorPhone = new Map(sessoes.map((s) => [s.phone, s]));

  const map = new Map<string, {
    phone: string;
    lastBody: string;
    lastAt: Date;
    lastDirection: string;
    count: number;
    handoff: boolean;
    state: string | null;
  }>();
  for (const row of rows) {
    const atual = map.get(row.phone);
    if (!atual) {
      const sessao = sessaoPorPhone.get(row.phone);
      map.set(row.phone, {
        phone: row.phone,
        lastBody: row.body,
        lastAt: row.createdAt,
        lastDirection: row.direction,
        count: 1,
        handoff: Boolean(sessao?.handoff),
        state: sessao?.state ?? null,
      });
    } else {
      atual.count += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export async function mensagensTelefone(tenantId: number, phone: string, limit = 80) {
  return db.select().from(waMessageLog)
    .where(and(eq(waMessageLog.tenantId, tenantId), eq(waMessageLog.phone, phone)))
    .orderBy(desc(waMessageLog.createdAt))
    .limit(limit)
    .then((lista) => lista.reverse());
}

export async function apagarConversa(tenantId: number, phone: string) {
  const digits = phone.replace(/\D/g, "");
  await db.delete(waMessageLog).where(and(eq(waMessageLog.tenantId, tenantId), eq(waMessageLog.phone, digits)));
  await db.delete(waSessions).where(and(eq(waSessions.tenantId, tenantId), eq(waSessions.phone, digits)));
}

export async function limparConversas(tenantId: number) {
  await db.delete(waMessageLog).where(eq(waMessageLog.tenantId, tenantId));
  await db.delete(waSessions).where(eq(waSessions.tenantId, tenantId));
}

export async function resetarSessao(tenantId: number, phone: string) {
  const digits = phone.replace(/\D/g, "");
  await db.delete(waSessions).where(and(eq(waSessions.tenantId, tenantId), eq(waSessions.phone, digits)));
  return obterSessao(tenantId, digits);
}
