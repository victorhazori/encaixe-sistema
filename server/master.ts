import bcrypt from "bcryptjs";
import express from "express";
import { and, asc, count, eq, or } from "drizzle-orm";
import { z } from "zod";
import { autenticar, criarToken, credenciaisMaster } from "./auth.js";
import { db } from "./db/client.js";
import {
  appointments,
  customers,
  plans,
  professionals,
  serviceProfessionals,
  services,
  tenantWhatsapp,
  tenants,
  users,
  workingHours,
} from "./db/schema.js";
import { PLANOS_SEED, normalizarFeatures, temFeature } from "./plans.js";
import { evolutionConfig, instanciaTenant } from "./whatsapp/evolution.js";
import { featuresDoTenant, garantirWhatsapp, podeUsarWhatsapp } from "./whatsapp/tenant.js";

const slugSchema = z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.");
const midiaSchema = z.string().max(500).optional().nullable().or(z.literal(""));

const criarTenantSchema = z.object({
  name: z.string().min(2).max(160),
  slug: slugSchema,
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: midiaSchema,
  heroImageUrl: midiaSchema,
  galleryUrls: z.array(z.string().max(500)).max(6).optional(),
  planId: z.number().int().positive().optional(),
  adminName: z.string().min(2).max(160),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(120),
  seedDefaults: z.boolean().optional().default(true),
});

const atualizarTenantSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(400).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: midiaSchema,
  heroImageUrl: midiaSchema,
  galleryUrls: z.array(z.string().max(500)).max(6).optional(),
  active: z.boolean().optional(),
  planId: z.number().int().positive().nullable().optional(),
});

async function garantirPlanos() {
  for (const plano of PLANOS_SEED) {
    await db.insert(plans).values({
      name: plano.name,
      slug: plano.slug,
      priceCents: plano.priceCents,
      limits: plano.limits,
      features: plano.features,
      active: true,
    }).onConflictDoUpdate({
      target: plans.slug,
      set: {
        name: plano.name,
        priceCents: plano.priceCents,
        limits: plano.limits,
        features: plano.features,
        active: true,
      },
    });
  }
  return db.select().from(plans).orderBy(asc(plans.priceCents));
}

async function planoPorIdOuBasico(planId?: number) {
  const lista = await garantirPlanos();
  if (planId) {
    const achado = lista.find((p) => p.id === planId);
    if (achado) return achado;
  }
  return lista.find((p) => p.slug === "basic") ?? lista[0]!;
}

async function seedPadraoTenant(tenantId: number) {
  const [profissional] = await db.insert(professionals).values({
    tenantId,
    name: "Profissional 1",
    bio: "Equipe inicial — edite no painel do negócio.",
  }).returning();

  const [servico] = await db.insert(services).values({
    tenantId,
    name: "Atendimento",
    description: "Serviço inicial — personalize no painel.",
    durationMinutes: 45,
    priceCents: 5000,
    icon: "scissors",
  }).returning();

  await db.insert(serviceProfessionals).values({
    tenantId,
    serviceId: servico.id,
    professionalId: profissional.id,
  });

  await db.insert(workingHours).values(
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      tenantId,
      professionalId: profissional.id,
      weekday,
      startTime: "09:00",
      endTime: weekday === 6 ? "14:00" : "19:00",
    })),
  );
}

export const master = express.Router();

master.post("/login", async (req, res) => {
  const dados = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }).parse(req.body);
  const masterCred = credenciaisMaster();
  if (dados.email.toLowerCase() !== masterCred.email || dados.password !== masterCred.password) {
    return res.status(401).json({ erro: "Credenciais inválidas." });
  }
  return res.json({
    token: criarToken({ userId: 0, tenantId: 0, role: "platform" }),
    user: { name: "Master Encaixe", email: masterCred.email, role: "platform" as const },
  });
});

master.use(autenticar(["platform"]));

master.get("/config", async (_req, res) => {
  const evo = evolutionConfig();
  res.json({
    masterEmail: credenciaisMaster().email,
    whatsappProvider: evo.provider,
    evolutionConfigured: evo.configured,
    evolutionUrl: evo.base,
  });
});

master.get("/plans", async (_req, res) => {
  const lista = await garantirPlanos();
  res.json(lista.map((p) => ({
    ...p,
    features: normalizarFeatures(p.features),
  })));
});

master.patch("/plans/:id", async (req, res) => {
  const id = Number(req.params.id);
  const dados = z.object({
    name: z.string().min(2).max(80).optional(),
    priceCents: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    limits: z.record(z.string(), z.unknown()).optional(),
    features: z.record(z.string(), z.boolean()).optional(),
  }).parse(req.body);

  const patch: Record<string, unknown> = {};
  if (dados.name !== undefined) patch.name = dados.name;
  if (dados.priceCents !== undefined) patch.priceCents = dados.priceCents;
  if (dados.active !== undefined) patch.active = dados.active;
  if (dados.limits !== undefined) patch.limits = dados.limits;
  if (dados.features !== undefined) patch.features = normalizarFeatures(dados.features);

  const [plano] = await db.update(plans).set(patch).where(eq(plans.id, id)).returning();
  if (!plano) return res.status(404).json({ erro: "Plano não encontrado." });
  res.json({ ...plano, features: normalizarFeatures(plano.features) });
});

master.get("/tenants", async (_req, res) => {
  await garantirPlanos();
  const lista = await db.select({
    id: tenants.id,
    name: tenants.name,
    slug: tenants.slug,
    phone: tenants.phone,
    address: tenants.address,
    logoUrl: tenants.logoUrl,
    heroImageUrl: tenants.heroImageUrl,
    galleryUrls: tenants.galleryUrls,
    primaryColor: tenants.primaryColor,
    active: tenants.active,
    planId: tenants.planId,
    createdAt: tenants.createdAt,
  }).from(tenants).orderBy(asc(tenants.name));

  const planos = await db.select().from(plans);
  const planoPorId = new Map(planos.map((p) => [p.id, p]));

  const comContagem = await Promise.all(lista.map(async (tenant) => {
    const [cli] = await db.select({ total: count() }).from(customers).where(eq(customers.tenantId, tenant.id));
    const [age] = await db.select({ total: count() }).from(appointments).where(eq(appointments.tenantId, tenant.id));
    const [adm] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(and(
      eq(users.tenantId, tenant.id),
      eq(users.role, "admin"),
      eq(users.active, true),
    )).limit(1);
    const [wa] = await db.select().from(tenantWhatsapp).where(eq(tenantWhatsapp.tenantId, tenant.id)).limit(1);
    const plano = tenant.planId ? planoPorId.get(tenant.planId) : undefined;
    return {
      ...tenant,
      customersCount: cli?.total ?? 0,
      appointmentsCount: age?.total ?? 0,
      admin: adm ?? null,
      plan: plano ? { id: plano.id, name: plano.name, slug: plano.slug, features: normalizarFeatures(plano.features) } : null,
      whatsapp: wa ?? null,
    };
  }));

  res.json(comContagem);
});

master.post("/tenants", async (req, res) => {
  const dados = criarTenantSchema.parse(req.body);
  const [slugLivre] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, dados.slug)).limit(1);
  if (slugLivre) return res.status(409).json({ erro: "Este identificador (slug) já está em uso." });

  const plano = await planoPorIdOuBasico(dados.planId);
  const senha = await bcrypt.hash(dados.adminPassword, 12);

  const criado = await db.transaction(async (tx) => {
    const [tenant] = await tx.insert(tenants).values({
      planId: plano.id,
      name: dados.name,
      slug: dados.slug,
      phone: dados.phone || null,
      address: dados.address || null,
      primaryColor: dados.primaryColor ?? "#d99442",
      logoUrl: dados.logoUrl || null,
      heroImageUrl: dados.heroImageUrl || null,
      galleryUrls: dados.galleryUrls ?? [],
      active: true,
    }).returning();

    const [admin] = await tx.insert(users).values({
      tenantId: tenant.id,
      name: dados.adminName,
      email: dados.adminEmail.toLowerCase(),
      passwordHash: senha,
      role: "admin",
    }).returning();

    const feats = normalizarFeatures(plano.features);
    await tx.insert(tenantWhatsapp).values({
      tenantId: tenant.id,
      authorized: temFeature(feats, "whatsapp_bot"),
      enabled: false,
      mode: "rules",
      evolutionInstance: instanciaTenant(tenant.slug),
      welcomeMessage: "Olá! Aqui é o assistente de agendamentos.",
      handoffMessage: "Um atendente humano vai continuar. Digite *bot* para voltar ao menu.",
    });

    return { tenant, admin };
  });

  if (dados.seedDefaults) await seedPadraoTenant(criado.tenant.id);

  res.status(201).json({
    ...criado.tenant,
    admin: { id: criado.admin.id, name: criado.admin.name, email: criado.admin.email },
    loginHint: {
      slug: criado.tenant.slug,
      email: criado.admin.email,
      adminUrl: "/admin",
      publicUrl: `/${criado.tenant.slug}`,
    },
  });
});

master.patch("/tenants/:id", async (req, res) => {
  const id = Number(req.params.id);
  const dados = atualizarTenantSchema.parse(req.body);
  const patch: Record<string, unknown> = {};
  if (dados.name !== undefined) patch.name = dados.name;
  if (dados.phone !== undefined) patch.phone = dados.phone || null;
  if (dados.address !== undefined) patch.address = dados.address || null;
  if (dados.primaryColor !== undefined) patch.primaryColor = dados.primaryColor;
  if (dados.logoUrl !== undefined) patch.logoUrl = dados.logoUrl || null;
  if (dados.heroImageUrl !== undefined) patch.heroImageUrl = dados.heroImageUrl || null;
  if (dados.galleryUrls !== undefined) patch.galleryUrls = dados.galleryUrls;
  if (dados.active !== undefined) patch.active = dados.active;
  if (dados.planId !== undefined) patch.planId = dados.planId;

  const [tenant] = await db.update(tenants).set(patch).where(eq(tenants.id, id)).returning();
  if (!tenant) return res.status(404).json({ erro: "Negócio não encontrado." });
  res.json(tenant);
});

master.post("/tenants/:id/reset-admin", async (req, res) => {
  const id = Number(req.params.id);
  const dados = z.object({
    email: z.string().email().optional(),
    password: z.string().min(8).max(120),
    name: z.string().min(2).max(160).optional(),
  }).parse(req.body);

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) return res.status(404).json({ erro: "Negócio não encontrado." });

  const senha = await bcrypt.hash(dados.password, 12);
  const [admin] = await db.select().from(users).where(and(
    eq(users.tenantId, id),
    eq(users.role, "admin"),
  )).limit(1);

  if (admin) {
    const [atualizado] = await db.update(users).set({
      passwordHash: senha,
      active: true,
      ...(dados.email ? { email: dados.email.toLowerCase() } : {}),
      ...(dados.name ? { name: dados.name } : {}),
    }).where(eq(users.id, admin.id)).returning();
    return res.json({ id: atualizado.id, name: atualizado.name, email: atualizado.email });
  }

  if (!dados.email || !dados.name) {
    return res.status(400).json({ erro: "Informe nome e e-mail para criar o admin deste negócio." });
  }
  const [novo] = await db.insert(users).values({
    tenantId: id,
    name: dados.name,
    email: dados.email.toLowerCase(),
    passwordHash: senha,
    role: "admin",
  }).returning();
  res.status(201).json({ id: novo.id, name: novo.name, email: novo.email });
});

master.post("/tenants/:id/impersonate", async (req, res) => {
  const id = Number(req.params.id);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) return res.status(404).json({ erro: "Negócio não encontrado." });
  if (!tenant.active) return res.status(400).json({ erro: "Negócio inativo." });

  const [admin] = await db.select().from(users).where(and(
    eq(users.tenantId, id),
    or(eq(users.role, "admin"), eq(users.role, "staff")),
    eq(users.active, true),
  )).limit(1);
  if (!admin) return res.status(404).json({ erro: "Nenhum admin ativo neste negócio." });

  res.json({
    token: criarToken({ userId: admin.id, tenantId: tenant.id, role: admin.role }),
    user: { id: admin.id, name: admin.name, role: admin.role },
    tenant,
  });
});

/* —— WhatsApp: master só autoriza; config fica no painel da loja —— */
master.get("/whatsapp", async (_req, res) => {
  const lista = await db.select({
    id: tenants.id,
    name: tenants.name,
    slug: tenants.slug,
    planId: tenants.planId,
    active: tenants.active,
  }).from(tenants).orderBy(asc(tenants.name));

  const planos = await db.select().from(plans);
  const planoPorId = new Map(planos.map((p) => [p.id, p]));

  const itens = await Promise.all(lista.map(async (tenant) => {
    const cfg = await garantirWhatsapp(tenant.id, tenant.slug);
    const plano = tenant.planId ? planoPorId.get(tenant.planId) : undefined;
    const features = normalizarFeatures(plano?.features);
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      active: tenant.active,
      plan: plano ? { id: plano.id, name: plano.name, slug: plano.slug, features } : null,
      authorized: cfg.authorized,
      enabled: cfg.enabled,
      canUse: podeUsarWhatsapp(cfg.authorized, features),
      phone: cfg.phone,
    };
  }));

  res.json(itens);
});

master.patch("/whatsapp/:tenantId/authorize", async (req, res) => {
  const tenantId = Number(req.params.tenantId);
  const dados = z.object({ authorized: z.boolean() }).parse(req.body);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return res.status(404).json({ erro: "Negócio não encontrado." });

  const features = await featuresDoTenant(tenantId);
  if (dados.authorized && !temFeature(features, "whatsapp_bot")) {
    return res.status(403).json({
      erro: "Este plano não inclui WhatsApp Bot. Mude o plano para Pro/Enterprise (ou ative a feature no plano) antes de autorizar.",
    });
  }

  await garantirWhatsapp(tenantId, tenant.slug);
  const [atualizado] = await db.update(tenantWhatsapp).set({
    authorized: dados.authorized,
    ...(dados.authorized ? {} : { enabled: false }),
    updatedAt: new Date(),
  }).where(eq(tenantWhatsapp.tenantId, tenantId)).returning();

  res.json({
    tenantId,
    authorized: atualizado.authorized,
    enabled: atualizado.enabled,
    canUse: podeUsarWhatsapp(atualizado.authorized, features),
  });
});
