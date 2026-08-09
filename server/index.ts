import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { and, asc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { z, ZodError } from "zod";
import { autenticar, criarToken, type Sessao } from "./auth.js";
import { closeDb, db } from "./db/client.js";
import {
  appointments,
  blocks,
  customers,
  professionals,
  serviceProfessionals,
  services,
  tenants,
  users,
  workingHours,
} from "./db/schema.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const credenciais = z.object({
  slug: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});
const servicoSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(10).max(480),
  priceCents: z.number().int().min(0),
  icon: z.string().min(2).max(40).optional(),
  active: z.boolean().optional(),
});
const profissionalSchema = z.object({
  name: z.string().min(2),
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  active: z.boolean().optional(),
});
const horaSchema = z.object({
  professionalId: z.number().int().positive(),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
const bloqueioSchema = z.object({
  professionalId: z.number().int().positive().nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.string().max(200).optional(),
});
const clienteAdminSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().nullable().or(z.literal("")),
  active: z.boolean().optional(),
});

async function tenantPorSlug(slug: string) {
  const [tenant] = await db.select().from(tenants).where(and(eq(tenants.slug, slug), eq(tenants.active, true))).limit(1);
  return tenant;
}

function dataComHora(data: string, hora: string) {
  return new Date(`${data}T${hora.slice(0, 5)}:00-03:00`);
}

/** Normaliza serviceIds a partir de query string (serviceIds=1,2 ou serviceId legado). */
function parseServiceIds(query: Record<string, unknown>): number[] {
  if (typeof query.serviceIds === "string" && query.serviceIds.trim()) {
    return query.serviceIds.split(",").map((id) => Number(id.trim())).filter((id) => Number.isInteger(id) && id > 0);
  }
  if (query.serviceId != null && query.serviceId !== "") {
    const id = Number(query.serviceId);
    if (Number.isInteger(id) && id > 0) return [id];
  }
  return [];
}

async function carregarServicosValidos(tenantId: number, serviceIds: number[]) {
  const unicos = [...new Set(serviceIds)];
  if (!unicos.length) return [];
  const lista = await db.select().from(services).where(and(
    eq(services.tenantId, tenantId),
    eq(services.active, true),
    inArray(services.id, unicos),
  ));
  if (lista.length !== unicos.length) return [];
  // Mantém a ordem solicitada
  return unicos.map((id) => lista.find((s) => s.id === id)!);
}

async function profissionalAtendeTodos(tenantId: number, professionalId: number, serviceIds: number[]) {
  if (!serviceIds.length) return false;
  const vinculos = await db.select({ serviceId: serviceProfessionals.serviceId }).from(serviceProfessionals).where(and(
    eq(serviceProfessionals.tenantId, tenantId),
    eq(serviceProfessionals.professionalId, professionalId),
    inArray(serviceProfessionals.serviceId, serviceIds),
  ));
  const atendidos = new Set(vinculos.map((v) => v.serviceId));
  return serviceIds.every((id) => atendidos.has(id));
}

async function calcularDisponibilidade(tenantId: number, professionalId: number, serviceIds: number[], data: string) {
  const listaServicos = await carregarServicosValidos(tenantId, serviceIds);
  if (!listaServicos.length) return [];

  const atende = await profissionalAtendeTodos(tenantId, professionalId, listaServicos.map((s) => s.id));
  if (!atende) return [];

  const duracaoTotal = listaServicos.reduce((soma, s) => soma + s.durationMinutes, 0);

  const diaSemana = new Date(`${data}T12:00:00-03:00`).getDay();
  const [jornada] = await db.select().from(workingHours).where(and(
    eq(workingHours.tenantId, tenantId),
    eq(workingHours.professionalId, professionalId),
    eq(workingHours.weekday, diaSemana),
  )).limit(1);
  if (!jornada) return [];

  const inicioDia = dataComHora(data, "00:00");
  const fimDia = new Date(inicioDia);
  fimDia.setDate(fimDia.getDate() + 1);
  const ocupados = await db.select({
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
  }).from(appointments).where(and(
    eq(appointments.tenantId, tenantId),
    eq(appointments.professionalId, professionalId),
    ne(appointments.status, "cancelled"),
    gte(appointments.startsAt, inicioDia),
    lt(appointments.startsAt, fimDia),
  ));
  const indisponiveis = await db.select({
    startsAt: blocks.startsAt,
    endsAt: blocks.endsAt,
  }).from(blocks).where(and(
    eq(blocks.tenantId, tenantId),
    or(eq(blocks.professionalId, professionalId), sql`${blocks.professionalId} is null`),
    lt(blocks.startsAt, fimDia),
    gte(blocks.endsAt, inicioDia),
  ));

  const slots: string[] = [];
  const abertura = dataComHora(data, jornada.startTime);
  const fechamento = dataComHora(data, jornada.endTime);
  for (let inicio = abertura; inicio.getTime() + duracaoTotal * 60_000 <= fechamento.getTime(); inicio = new Date(inicio.getTime() + 15 * 60_000)) {
    const fim = new Date(inicio.getTime() + duracaoTotal * 60_000);
    const conflita = [...ocupados, ...indisponiveis].some((item) => inicio < item.endsAt && fim > item.startsAt);
    if (!conflita && inicio > new Date()) slots.push(inicio.toISOString());
  }
  return slots;
}

/** Lê JWT opcional do cliente (não falha se ausente/inválido). */
function tentarSessaoCliente(req: Request): Sessao | undefined {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const segredo = process.env.JWT_SECRET;
  if (!token || !segredo) return undefined;
  try {
    return z.object({
      userId: z.number(),
      tenantId: z.number(),
      role: z.enum(["admin", "staff", "customer"]),
    }).parse(jwt.verify(token, segredo));
  } catch {
    return undefined;
  }
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", produto: "Encaixe" }));

app.post("/api/auth/staff/login", async (req, res) => {
  const dados = credenciais.parse(req.body);
  const tenant = await tenantPorSlug(dados.slug);
  if (!tenant) return res.status(401).json({ erro: "Credenciais inválidas." });
  const [usuario] = await db.select().from(users).where(and(
    eq(users.tenantId, tenant.id),
    eq(users.email, dados.email.toLowerCase()),
    or(eq(users.role, "admin"), eq(users.role, "staff")),
    eq(users.active, true),
  )).limit(1);
  if (!usuario || !(await bcrypt.compare(dados.password, usuario.passwordHash))) {
    return res.status(401).json({ erro: "Credenciais inválidas." });
  }
  return res.json({
    token: criarToken({ userId: usuario.id, tenantId: tenant.id, role: usuario.role }),
    user: { id: usuario.id, name: usuario.name, role: usuario.role },
    tenant,
  });
});

app.post("/api/auth/customer/register", async (req, res) => {
  const dados = credenciais.extend({ name: z.string().min(2), phone: z.string().min(8) }).parse(req.body);
  const tenant = await tenantPorSlug(dados.slug);
  if (!tenant) return res.status(404).json({ erro: "Estabelecimento não encontrado." });
  const passwordHash = await bcrypt.hash(dados.password, 12);
  const resultado = await db.transaction(async (tx) => {
    const [usuario] = await tx.insert(users).values({
      tenantId: tenant.id,
      name: dados.name,
      email: dados.email.toLowerCase(),
      passwordHash,
      role: "customer",
    }).returning();
    const [cliente] = await tx.insert(customers).values({
      tenantId: tenant.id,
      userId: usuario.id,
      name: dados.name,
      email: dados.email.toLowerCase(),
      phone: dados.phone,
      active: true,
    }).returning();
    return { usuario, cliente };
  });
  res.status(201).json({
    token: criarToken({ userId: resultado.usuario.id, tenantId: tenant.id, role: "customer" }),
    customer: resultado.cliente,
  });
});

app.post("/api/auth/customer/login", async (req, res) => {
  const dados = credenciais.parse(req.body);
  const tenant = await tenantPorSlug(dados.slug);
  if (!tenant) return res.status(401).json({ erro: "Credenciais inválidas." });
  const [usuario] = await db.select().from(users).where(and(
    eq(users.tenantId, tenant.id),
    eq(users.email, dados.email.toLowerCase()),
    eq(users.role, "customer"),
    eq(users.active, true),
  )).limit(1);
  if (!usuario || !(await bcrypt.compare(dados.password, usuario.passwordHash))) {
    return res.status(401).json({ erro: "Credenciais inválidas." });
  }
  res.json({ token: criarToken({ userId: usuario.id, tenantId: tenant.id, role: "customer" }) });
});

app.get("/api/public/:slug", async (req, res) => {
  const tenant = await tenantPorSlug(req.params.slug);
  if (!tenant) return res.status(404).json({ erro: "Estabelecimento não encontrado." });
  res.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    phone: tenant.phone,
    address: tenant.address,
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor,
  });
});

app.get("/api/public/:slug/services", async (req, res) => {
  const tenant = await tenantPorSlug(req.params.slug);
  if (!tenant) return res.status(404).json({ erro: "Estabelecimento não encontrado." });
  res.json(await db.select().from(services).where(and(eq(services.tenantId, tenant.id), eq(services.active, true))).orderBy(asc(services.name)));
});

app.get("/api/public/:slug/professionals", async (req, res) => {
  const tenant = await tenantPorSlug(req.params.slug);
  if (!tenant) return res.status(404).json({ erro: "Estabelecimento não encontrado." });
  const ids = parseServiceIds(req.query as Record<string, unknown>);
  if (!ids.length) {
    return res.json(await db.select().from(professionals).where(and(eq(professionals.tenantId, tenant.id), eq(professionals.active, true))));
  }

  // Interseção: profissionais vinculados a TODOS os serviços selecionados
  const vinculos = await db.select({
    professionalId: serviceProfessionals.professionalId,
    serviceId: serviceProfessionals.serviceId,
  }).from(serviceProfessionals).where(and(
    eq(serviceProfessionals.tenantId, tenant.id),
    inArray(serviceProfessionals.serviceId, ids),
  ));

  const contagem = new Map<number, Set<number>>();
  for (const v of vinculos) {
    if (!contagem.has(v.professionalId)) contagem.set(v.professionalId, new Set());
    contagem.get(v.professionalId)!.add(v.serviceId);
  }
  const profissionaisIds = [...contagem.entries()]
    .filter(([, set]) => ids.every((id) => set.has(id)))
    .map(([id]) => id);

  if (!profissionaisIds.length) return res.json([]);

  res.json(await db.select({
    id: professionals.id,
    name: professionals.name,
    bio: professionals.bio,
    avatarUrl: professionals.avatarUrl,
  }).from(professionals).where(and(
    eq(professionals.tenantId, tenant.id),
    eq(professionals.active, true),
    inArray(professionals.id, profissionaisIds),
  )));
});

app.get("/api/public/:slug/availability", async (req, res) => {
  const ids = parseServiceIds(req.query as Record<string, unknown>);
  const consulta = z.object({
    professionalId: z.coerce.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).parse(req.query);
  if (!ids.length) return res.status(400).json({ erro: "Informe serviceIds ou serviceId." });
  const tenant = await tenantPorSlug(req.params.slug);
  if (!tenant) return res.status(404).json({ erro: "Estabelecimento não encontrado." });
  res.json(await calcularDisponibilidade(tenant.id, consulta.professionalId, ids, consulta.date));
});

app.get("/api/public/:slug/availability-month", async (req, res) => {
  const ids = parseServiceIds(req.query as Record<string, unknown>);
  const consulta = z.object({
    professionalId: z.coerce.number().int().positive(),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  }).parse(req.query);
  if (!ids.length) return res.status(400).json({ erro: "Informe serviceIds ou serviceId." });
  const tenant = await tenantPorSlug(req.params.slug);
  if (!tenant) return res.status(404).json({ erro: "Estabelecimento não encontrado." });

  const diasNoMes = new Date(consulta.year, consulta.month, 0).getDate();
  const mapa: Record<string, number> = {};
  const hojeStr = new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone }).format(new Date());

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = `${consulta.year}-${String(consulta.month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    if (data < hojeStr) {
      mapa[data] = 0;
      continue;
    }
    const slots = await calcularDisponibilidade(tenant.id, consulta.professionalId, ids, data);
    mapa[data] = slots.length;
  }
  res.json(mapa);
});

app.post("/api/public/:slug/appointments", async (req, res) => {
  const corpo = z.object({
    serviceId: z.number().int().positive().optional(),
    serviceIds: z.array(z.number().int().positive()).min(1).optional(),
    professionalId: z.number().int().positive(),
    startsAt: z.coerce.date(),
    customer: z.object({
      name: z.string().min(2),
      phone: z.string().min(8),
      email: z.string().email().optional().or(z.literal("")),
    }).optional(),
    notes: z.string().max(500).optional(),
  }).parse(req.body);

  const serviceIds = corpo.serviceIds?.length
    ? [...new Set(corpo.serviceIds)]
    : corpo.serviceId
      ? [corpo.serviceId]
      : [];
  if (!serviceIds.length) return res.status(400).json({ erro: "Informe serviceIds ou serviceId." });

  const tenant = await tenantPorSlug(req.params.slug);
  if (!tenant) return res.status(404).json({ erro: "Estabelecimento não encontrado." });

  const sessao = tentarSessaoCliente(req);
  let clienteLogado: typeof customers.$inferSelect | undefined;
  if (sessao?.role === "customer" && sessao.tenantId === tenant.id) {
    const [cadastro] = await db.select().from(customers).where(and(
      eq(customers.userId, sessao.userId),
      eq(customers.tenantId, tenant.id),
    )).limit(1);
    clienteLogado = cadastro;
  }

  if (!clienteLogado && !corpo.customer) {
    return res.status(400).json({ erro: "Dados do cliente são obrigatórios." });
  }

  const data = new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone }).format(corpo.startsAt);
  const slots = await calcularDisponibilidade(tenant.id, corpo.professionalId, serviceIds, data);
  if (!slots.includes(corpo.startsAt.toISOString())) return res.status(409).json({ erro: "Horário não está mais disponível." });

  const agendamento = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${tenant.id}, ${corpo.professionalId})`);
    const listaServicos = await tx.select().from(services).where(and(
      eq(services.tenantId, tenant.id),
      inArray(services.id, serviceIds),
      eq(services.active, true),
    ));
    if (listaServicos.length !== serviceIds.length) throw new Error("SERVICO_INVALIDO");
    const ordenados = serviceIds.map((id) => listaServicos.find((s) => s.id === id)!);
    const duracaoTotal = ordenados.reduce((soma, s) => soma + s.durationMinutes, 0);
    const endsAt = new Date(corpo.startsAt.getTime() + duracaoTotal * 60_000);

    const conflito = await tx.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.tenantId, tenant.id),
      eq(appointments.professionalId, corpo.professionalId),
      ne(appointments.status, "cancelled"),
      lt(appointments.startsAt, endsAt),
      gt(appointments.endsAt, corpo.startsAt),
    )).limit(1);
    if (conflito.length) throw new Error("HORARIO_OCUPADO");

    let cliente = clienteLogado;
    if (!cliente) {
      const dadosCliente = corpo.customer!;
      const [upsert] = await tx.insert(customers).values({
        tenantId: tenant.id,
        name: dadosCliente.name,
        phone: dadosCliente.phone,
        email: dadosCliente.email || null,
        active: true,
      }).onConflictDoUpdate({
        target: [customers.tenantId, customers.phone],
        set: {
          name: dadosCliente.name,
          email: dadosCliente.email || null,
          active: true,
        },
      }).returning();
      cliente = upsert;
    }

    const nomesExtras = ordenados.slice(1).map((s) => s.name);
    const notasServicos = nomesExtras.length
      ? `Serviços extras: ${nomesExtras.join(", ")}`
      : undefined;
    const notes = [corpo.notes, notasServicos].filter(Boolean).join("\n") || null;

    const [novo] = await tx.insert(appointments).values({
      tenantId: tenant.id,
      customerId: cliente.id,
      professionalId: corpo.professionalId,
      serviceId: ordenados[0].id,
      extraServiceIds: ordenados.slice(1).map((s) => s.id),
      startsAt: corpo.startsAt,
      endsAt,
      notes,
    }).returning();
    return novo;
  });
  res.status(201).json(agendamento);
});

const admin = express.Router();
admin.use(autenticar(["admin", "staff"]));

admin.get("/appointments", async (req, res) => {
  const inicio = req.query.from ? new Date(String(req.query.from)) : new Date(0);
  const fim = req.query.to ? new Date(String(req.query.to)) : new Date("2999-01-01");
  res.json(await db.select({
    id: appointments.id,
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
    status: appointments.status,
    customerName: customers.name,
    professionalName: professionals.name,
    serviceName: services.name,
  }).from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .where(and(eq(appointments.tenantId, req.tenantId!), gte(appointments.startsAt, inicio), lt(appointments.startsAt, fim)))
    .orderBy(asc(appointments.startsAt)));
});

admin.get("/dashboard/day", async (req, res) => {
  const data = String(req.query.date ?? new Date().toISOString().slice(0, 10));
  const inicio = dataComHora(data, "00:00");
  const fim = new Date(inicio.getTime() + 86_400_000);
  const [metricas] = await db.select({
    total: sql<number>`count(*)::int`,
    confirmados: sql<number>`count(*) filter (where ${appointments.status} = 'confirmed')::int`,
    receitaCents: sql<number>`coalesce(sum(${services.priceCents}) filter (where ${appointments.status} != 'cancelled'), 0)::int`,
  }).from(appointments).innerJoin(services, eq(services.id, appointments.serviceId)).where(and(
    eq(appointments.tenantId, req.tenantId!),
    gte(appointments.startsAt, inicio),
    lt(appointments.startsAt, fim),
  ));
  res.json(metricas);
});

admin.get("/customers", async (req, res) => {
  res.json(await db.select().from(customers).where(eq(customers.tenantId, req.tenantId!)).orderBy(asc(customers.name)));
});

admin.post("/customers", async (req, res) => {
  const dados = clienteAdminSchema.parse(req.body);
  const [item] = await db.insert(customers).values({
    tenantId: req.tenantId!,
    name: dados.name,
    phone: dados.phone,
    email: dados.email || null,
    active: true,
  }).returning();
  res.status(201).json(item);
});

admin.put("/customers/:id", async (req, res) => {
  const dados = clienteAdminSchema.partial().parse(req.body);
  const [item] = await db.update(customers).set({
    ...(dados.name !== undefined ? { name: dados.name } : {}),
    ...(dados.phone !== undefined ? { phone: dados.phone } : {}),
    ...(dados.email !== undefined ? { email: dados.email || null } : {}),
    ...(dados.active !== undefined ? { active: dados.active } : {}),
  }).where(and(eq(customers.id, Number(req.params.id)), eq(customers.tenantId, req.tenantId!))).returning();
  if (!item) return res.status(404).json({ erro: "Cliente não encontrado." });
  res.json(item);
});

admin.delete("/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [cliente] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.tenantId, req.tenantId!))).limit(1);
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado." });

  const [temAgenda] = await db.select({ id: appointments.id }).from(appointments).where(and(
    eq(appointments.tenantId, req.tenantId!),
    eq(appointments.customerId, id),
  )).limit(1);

  if (temAgenda) {
    await db.update(customers).set({ active: false }).where(and(eq(customers.id, id), eq(customers.tenantId, req.tenantId!)));
    return res.json({ inactivated: true });
  }

  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.tenantId, req.tenantId!)));
  return res.json({ deleted: true });
});

admin.get("/services", async (req, res) => res.json(await db.select().from(services).where(eq(services.tenantId, req.tenantId!))));
admin.post("/services", async (req, res) => {
  const item = await db.transaction(async (tx) => {
    const [novo] = await tx.insert(services).values({ ...servicoSchema.parse(req.body), tenantId: req.tenantId! }).returning();
    const equipe = await tx.select({ id: professionals.id }).from(professionals).where(and(
      eq(professionals.tenantId, req.tenantId!),
      eq(professionals.active, true),
    ));
    if (equipe.length) {
      await tx.insert(serviceProfessionals).values(equipe.map((profissional) => ({
        tenantId: req.tenantId!,
        serviceId: novo.id,
        professionalId: profissional.id,
      })));
    }
    return novo;
  });
  res.status(201).json(item);
});
admin.put("/services/:id", async (req, res) => {
  const [item] = await db.update(services).set(servicoSchema.partial().parse(req.body)).where(and(eq(services.id, Number(req.params.id)), eq(services.tenantId, req.tenantId!))).returning();
  res.json(item);
});
admin.delete("/services/:id", async (req, res) => {
  await db.update(services).set({ active: false }).where(and(eq(services.id, Number(req.params.id)), eq(services.tenantId, req.tenantId!)));
  res.status(204).end();
});

admin.get("/professionals", async (req, res) => res.json(await db.select().from(professionals).where(eq(professionals.tenantId, req.tenantId!))));
admin.post("/professionals", async (req, res) => {
  const item = await db.transaction(async (tx) => {
    const [novo] = await tx.insert(professionals).values({ ...profissionalSchema.parse(req.body), tenantId: req.tenantId! }).returning();
    const catalogo = await tx.select({ id: services.id }).from(services).where(and(
      eq(services.tenantId, req.tenantId!),
      eq(services.active, true),
    ));
    if (catalogo.length) {
      await tx.insert(serviceProfessionals).values(catalogo.map((servico) => ({
        tenantId: req.tenantId!,
        serviceId: servico.id,
        professionalId: novo.id,
      })));
    }
    return novo;
  });
  res.status(201).json(item);
});
admin.put("/professionals/:id", async (req, res) => {
  const [item] = await db.update(professionals).set(profissionalSchema.partial().parse(req.body)).where(and(eq(professionals.id, Number(req.params.id)), eq(professionals.tenantId, req.tenantId!))).returning();
  res.json(item);
});
admin.delete("/professionals/:id", async (req, res) => {
  await db.update(professionals).set({ active: false }).where(and(eq(professionals.id, Number(req.params.id)), eq(professionals.tenantId, req.tenantId!)));
  res.status(204).end();
});

admin.get("/hours", async (req, res) => res.json(await db.select().from(workingHours).where(eq(workingHours.tenantId, req.tenantId!))));
admin.post("/hours", async (req, res) => {
  const dados = horaSchema.parse(req.body);
  const profissional = await db.select({ id: professionals.id }).from(professionals).where(and(
    eq(professionals.id, dados.professionalId),
    eq(professionals.tenantId, req.tenantId!),
  )).limit(1);
  if (!profissional.length) return res.status(404).json({ erro: "Profissional não encontrado." });
  const [item] = await db.insert(workingHours).values({ ...dados, tenantId: req.tenantId! }).onConflictDoUpdate({
    target: [workingHours.professionalId, workingHours.weekday],
    set: { startTime: dados.startTime, endTime: dados.endTime },
  }).returning();
  res.status(201).json(item);
});
admin.delete("/hours/:id", async (req, res) => {
  await db.delete(workingHours).where(and(eq(workingHours.id, Number(req.params.id)), eq(workingHours.tenantId, req.tenantId!)));
  res.status(204).end();
});

admin.get("/blocks", async (req, res) => res.json(await db.select().from(blocks).where(eq(blocks.tenantId, req.tenantId!))));
admin.post("/blocks", async (req, res) => {
  const dados = bloqueioSchema.parse(req.body);
  if (dados.professionalId) {
    const profissional = await db.select({ id: professionals.id }).from(professionals).where(and(
      eq(professionals.id, dados.professionalId),
      eq(professionals.tenantId, req.tenantId!),
    )).limit(1);
    if (!profissional.length) return res.status(404).json({ erro: "Profissional não encontrado." });
  }
  if (dados.endsAt <= dados.startsAt) return res.status(400).json({ erro: "O fim deve ser posterior ao início." });
  const [item] = await db.insert(blocks).values({ ...dados, tenantId: req.tenantId! }).returning();
  res.status(201).json(item);
});
admin.delete("/blocks/:id", async (req, res) => {
  await db.delete(blocks).where(and(eq(blocks.id, Number(req.params.id)), eq(blocks.tenantId, req.tenantId!)));
  res.status(204).end();
});

admin.put("/branding", async (req, res) => {
  const dados = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).parse(req.body);
  const [tenant] = await db.update(tenants).set(dados).where(eq(tenants.id, req.tenantId!)).returning();
  res.json(tenant);
});
app.use("/api/admin", admin);

const cliente = express.Router();
cliente.use(autenticar(["customer"]));

cliente.get("/me", async (req, res) => {
  const [cadastro] = await db.select({
    name: customers.name,
    email: customers.email,
    phone: customers.phone,
  }).from(customers).where(and(
    eq(customers.userId, req.sessao!.userId),
    eq(customers.tenantId, req.tenantId!),
  )).limit(1);
  if (!cadastro) {
    const [usuario] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, req.sessao!.userId)).limit(1);
    if (!usuario) return res.status(404).json({ erro: "Cliente não encontrado." });
    return res.json({ name: usuario.name, email: usuario.email, phone: "" });
  }
  res.json(cadastro);
});

cliente.get("/appointments", async (req, res) => {
  const [cadastro] = await db.select().from(customers).where(and(eq(customers.userId, req.sessao!.userId), eq(customers.tenantId, req.tenantId!))).limit(1);
  if (!cadastro) return res.json([]);
  res.json(await db.select({
    id: appointments.id,
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
    status: appointments.status,
    serviceName: services.name,
    professionalName: professionals.name,
    notes: appointments.notes,
  }).from(appointments)
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(professionals, eq(professionals.id, appointments.professionalId))
    .where(and(
      eq(appointments.tenantId, req.tenantId!),
      eq(appointments.customerId, cadastro.id),
      gte(appointments.startsAt, new Date()),
    )).orderBy(asc(appointments.startsAt)));
});

cliente.patch("/appointments/:id/cancel", async (req, res) => {
  const [cadastro] = await db.select().from(customers).where(and(eq(customers.userId, req.sessao!.userId), eq(customers.tenantId, req.tenantId!))).limit(1);
  if (!cadastro) return res.status(404).json({ erro: "Cliente não encontrado." });
  const [item] = await db.update(appointments).set({ status: "cancelled" }).where(and(
    eq(appointments.id, Number(req.params.id)),
    eq(appointments.customerId, cadastro.id),
    eq(appointments.tenantId, req.tenantId!),
    eq(appointments.status, "confirmed"),
    gte(appointments.startsAt, new Date()),
  )).returning();
  if (!item) return res.status(409).json({ erro: "Agendamento não pode ser cancelado." });
  res.json(item);
});
app.use("/api/customer", cliente);

app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (erro instanceof ZodError) return res.status(400).json({ erro: "Dados inválidos.", detalhes: erro.issues });
  if (erro instanceof Error && ["HORARIO_OCUPADO", "SERVICO_INVALIDO"].includes(erro.message)) {
    return res.status(409).json({ erro: "Horário não está mais disponível." });
  }
  if (erro && typeof erro === "object" && "code" in erro && erro.code === "23505") {
    return res.status(409).json({ erro: "Este registro já existe." });
  }
  console.error(erro);
  return res.status(500).json({ erro: "Erro interno. Tente novamente." });
});

const porta = Number(process.env.PORT ?? 5000);
const servidor = app.listen(porta, "0.0.0.0", () => console.log(`API Encaixe disponível na porta ${porta}.`));

async function encerrar() {
  servidor.close();
  await closeDb();
}
process.on("SIGTERM", encerrar);
process.on("SIGINT", encerrar);
