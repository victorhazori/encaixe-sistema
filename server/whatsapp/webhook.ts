import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../db/client.js";
import { tenantWhatsapp, tenants } from "../db/schema.js";
import { temFeature } from "../plans.js";
import { processarMensagemEntrada } from "./conversation.js";
import { evolutionSendText, evolutionWebhookSecret } from "./evolution.js";
import { featuresDoTenant, podeUsarWhatsapp } from "./tenant.js";

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeBrPhone(phone: string) {
  let d = digits(phone);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  return d;
}

function requireWebhookSecret(req: Request, res: Response) {
  const expected = evolutionWebhookSecret();
  if (!expected) {
    res.status(503).json({ erro: "Segredo de webhook não configurado (EVOLUTION_WEBHOOK_SECRET)." });
    return false;
  }
  const got =
    String(req.query.apikey || "")
    || String(req.headers.apikey || "")
    || String(req.headers["x-webhook-secret"] || "")
    || String(req.headers["x-bot-secret"] || "");
  if (!got || got !== expected) {
    res.status(401).json({ erro: "Webhook não autorizado." });
    return false;
  }
  return true;
}

function parseIncoming(body: unknown): { instance: string; phone: string; text: string } | null {
  const payload = body as Record<string, unknown>;
  const event = String(payload.event || payload.Event || "").toLowerCase();
  if (event && !event.includes("messages.upsert") && !event.includes("messages_upsert")) {
    // Alguns payloads vêm sem event; só filtramos quando o campo existe.
    if (event.includes("connection") || event.includes("qrcode")) return null;
  }

  const instance = String(
    payload.instance
    || (payload.data as { instance?: string } | undefined)?.instance
    || "",
  ).trim().toLowerCase();
  if (!instance) return null;

  const data = (payload.data || payload) as Record<string, unknown>;
  const keyObj = (data.key || {}) as Record<string, unknown>;
  if (keyObj.fromMe) return null;

  const remote = String(keyObj.remoteJid || data.remoteJid || "");
  if (!remote || remote.includes("@g.us")) return null;

  const phone = normalizeBrPhone(remote.split("@")[0] || "");
  if (phone.length < 10) return null;

  const message = (data.message || {}) as Record<string, unknown>;
  const text = String(
    message.conversation
    || (message.extendedTextMessage as { text?: string } | undefined)?.text
    || (message.buttonsResponseMessage as { selectedDisplayText?: string } | undefined)?.selectedDisplayText
    || (message.listResponseMessage as { title?: string } | undefined)?.title
    || "",
  ).trim();
  if (!text) return null;

  return { instance, phone, text };
}

async function tenantPorInstancia(instance: string) {
  const [cfg] = await db.select().from(tenantWhatsapp)
    .where(eq(tenantWhatsapp.evolutionInstance, instance))
    .limit(1);
  if (!cfg) return null;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, cfg.tenantId)).limit(1);
  if (!tenant || !tenant.active) return null;
  return { tenant, cfg };
}

export async function handleEvolutionWebhook(req: Request, res: Response) {
  if (!requireWebhookSecret(req, res)) return;

  try {
    const parsed = parseIncoming(req.body);
    if (!parsed) {
      return res.json({ ok: true, ignored: true });
    }

    const ctx = await tenantPorInstancia(parsed.instance);
    if (!ctx) {
      console.warn(`[wa-webhook] instância desconhecida: ${parsed.instance}`);
      return res.json({ ok: true, ignored: true, reason: "unknown_instance" });
    }

    const features = await featuresDoTenant(ctx.tenant.id);
    if (!podeUsarWhatsapp(ctx.cfg.authorized, features) || !ctx.cfg.enabled) {
      return res.json({ ok: true, ignored: true, reason: "disabled" });
    }
    if (!temFeature(features, "whatsapp_bot")) {
      return res.json({ ok: true, ignored: true, reason: "plan" });
    }

    const resultado = await processarMensagemEntrada(ctx.tenant.id, parsed.phone, parsed.text);
    if (resultado.reply) {
      const number = parsed.phone.startsWith("55") ? parsed.phone : `55${parsed.phone}`;
      await evolutionSendText(parsed.instance, number, resultado.reply);
    }

    return res.json({
      ok: true,
      tenantId: ctx.tenant.id,
      slug: ctx.tenant.slug,
      handoff: Boolean(resultado.handoff),
    });
  } catch (erro) {
    console.error("[wa-webhook]", erro);
    return res.status(500).json({ erro: "Falha ao processar webhook." });
  }
}
