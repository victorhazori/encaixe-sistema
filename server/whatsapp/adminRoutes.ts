import { and, eq, gte, sql } from "drizzle-orm";
import express from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { tenantWhatsapp, tenants, waMessageLog, waSessions } from "../db/schema.js";
import { temFeature } from "../plans.js";
import {
  apagarConversa,
  limparConversas,
  listarConversas,
  mensagensTelefone,
  processarMensagemEntrada,
  resetarSessao,
} from "./conversation.js";
import {
  evolutionConfig,
  evolutionEnsure,
  evolutionQr,
  evolutionStatus,
  instanciaTenant,
} from "./evolution.js";
import { featuresDoTenant, garantirWhatsapp, podeUsarWhatsapp } from "./tenant.js";

async function contexto(req: express.Request) {
  const tenantId = req.tenantId!;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) return null;
  const features = await featuresDoTenant(tenantId);
  const settings = await garantirWhatsapp(tenantId, tenant.slug);
  return { tenant, features, settings };
}

function bloquearSeNaoAutorizado(
  ctx: NonNullable<Awaited<ReturnType<typeof contexto>>>,
  res: express.Response,
) {
  if (!podeUsarWhatsapp(ctx.settings.authorized, ctx.features)) {
    res.status(403).json({
      erro: ctx.settings.authorized
        ? "O plano deste negócio não inclui WhatsApp Bot."
        : "WhatsApp ainda não foi autorizado pelo Encaixe (master).",
    });
    return true;
  }
  return false;
}

export function montarWhatsappAdmin(admin: express.Router) {
  admin.get("/whatsapp", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    const evo = evolutionConfig();
    res.json({
      authorized: ctx.settings.authorized,
      canUse: podeUsarWhatsapp(ctx.settings.authorized, ctx.features),
      features: ctx.features,
      settings: ctx.settings,
      provider: evo.provider,
      evolutionConfigured: evo.configured,
      evolutionUrl: evo.base,
    });
  });

  admin.put("/whatsapp", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;

    const dados = z.object({
      enabled: z.boolean().optional(),
      phone: z.string().max(30).optional().nullable(),
      welcomeMessage: z.string().max(1000).optional().nullable(),
      handoffMessage: z.string().max(1000).optional().nullable(),
      mode: z.enum(["rules", "ai"]).optional(),
    }).parse(req.body);

    if (dados.mode === "ai" && !temFeature(ctx.features, "whatsapp_ai")) {
      return res.status(403).json({ erro: "Modo IA exige plano Enterprise (feature whatsapp_ai)." });
    }

    const [atualizado] = await db.update(tenantWhatsapp).set({
      ...(dados.enabled !== undefined ? { enabled: dados.enabled } : {}),
      ...(dados.phone !== undefined ? { phone: dados.phone || null } : {}),
      ...(dados.welcomeMessage !== undefined ? { welcomeMessage: dados.welcomeMessage || null } : {}),
      ...(dados.handoffMessage !== undefined ? { handoffMessage: dados.handoffMessage || null } : {}),
      ...(dados.mode !== undefined ? { mode: dados.mode } : {}),
      evolutionInstance: instanciaTenant(ctx.tenant.slug),
      updatedAt: new Date(),
    }).where(eq(tenantWhatsapp.tenantId, ctx.tenant.id)).returning();

    res.json(atualizado);
  });

  admin.get("/whatsapp/report", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [msgCount] = await db.select({ total: sql<number>`count(*)::int` })
      .from(waMessageLog)
      .where(and(eq(waMessageLog.tenantId, ctx.tenant.id), gte(waMessageLog.createdAt, since)));
    const [handoffs] = await db.select({ total: sql<number>`count(*)::int` })
      .from(waSessions)
      .where(and(eq(waSessions.tenantId, ctx.tenant.id), eq(waSessions.handoff, true)));
    const conversations = await listarConversas(ctx.tenant.id);

    res.json({
      messages7d: msgCount?.total ?? 0,
      handoffsActive: handoffs?.total ?? 0,
      conversations,
    });
  });

  admin.get("/whatsapp/conversations", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    res.json(await listarConversas(ctx.tenant.id));
  });

  admin.get("/whatsapp/messages", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    const phone = String(req.query.phone || "").replace(/\D/g, "");
    if (phone.length < 10) return res.status(400).json({ erro: "Telefone inválido." });
    const limit = Math.min(Number(req.query.limit) || 80, 200);
    res.json(await mensagensTelefone(ctx.tenant.id, phone, limit));
  });

  admin.delete("/whatsapp/conversations/:phone", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    z.object({ confirm: z.literal(true) }).parse(req.body ?? {});
    await apagarConversa(ctx.tenant.id, req.params.phone);
    res.status(204).end();
  });

  admin.delete("/whatsapp/conversations", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    z.object({ confirm: z.literal(true) }).parse(req.body ?? {});
    await limparConversas(ctx.tenant.id);
    res.status(204).end();
  });

  admin.get("/whatsapp/evolution/status", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    const instance = ctx.settings.evolutionInstance || instanciaTenant(ctx.tenant.slug);
    const status = await evolutionStatus(instance);
    const evo = evolutionConfig();
    res.json({
      instance,
      provider: evo.provider,
      evolutionConfigured: evo.configured,
      ...status,
    });
  });

  admin.post("/whatsapp/evolution/ensure", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    const instance = ctx.settings.evolutionInstance || instanciaTenant(ctx.tenant.slug);
    const result = await evolutionEnsure(instance);
    res.json({ instance, ...result });
  });

  admin.get("/whatsapp/evolution/qr", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    const instance = ctx.settings.evolutionInstance || instanciaTenant(ctx.tenant.slug);
    await evolutionEnsure(instance);
    const qr = await evolutionQr(instance);
    res.json({ instance, ...qr });
  });

  admin.post("/whatsapp/sandbox", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    const dados = z.object({
      phone: z.string().min(10).max(30),
      message: z.string().min(1).max(2000),
      pushName: z.string().max(80).optional(),
    }).parse(req.body);
    const phone = dados.phone.replace(/\D/g, "");
    const resultado = await processarMensagemEntrada(ctx.tenant.id, phone, dados.message);
    const [sessao] = await db.select().from(waSessions).where(and(
      eq(waSessions.tenantId, ctx.tenant.id),
      eq(waSessions.phone, phone),
    )).limit(1);
    res.json({
      ...resultado,
      state: sessao?.state ?? null,
      handoff: Boolean(sessao?.handoff || resultado.handoff),
    });
  });

  admin.post("/whatsapp/sandbox/reset", async (req, res) => {
    const ctx = await contexto(req);
    if (!ctx) return res.status(404).json({ erro: "Negócio não encontrado." });
    if (bloquearSeNaoAutorizado(ctx, res)) return;
    const dados = z.object({ phone: z.string().min(10).max(30) }).parse(req.body);
    const sessao = await resetarSessao(ctx.tenant.id, dados.phone);
    res.json({ state: sessao.state, handoff: sessao.handoff });
  });
}
