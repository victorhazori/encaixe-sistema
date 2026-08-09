import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { plans, tenantWhatsapp, tenants } from "../db/schema.js";
import { normalizarFeatures } from "../plans.js";
import { instanciaTenant } from "./evolution.js";

export async function featuresDoTenant(tenantId: number) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant?.planId) return normalizarFeatures({});
  const [plano] = await db.select().from(plans).where(eq(plans.id, tenant.planId)).limit(1);
  return normalizarFeatures(plano?.features);
}

export async function garantirWhatsapp(tenantId: number, slug: string) {
  const [existente] = await db.select().from(tenantWhatsapp).where(eq(tenantWhatsapp.tenantId, tenantId)).limit(1);
  if (existente) return existente;
  const [criado] = await db.insert(tenantWhatsapp).values({
    tenantId,
    authorized: false,
    enabled: false,
    mode: "rules",
    evolutionInstance: instanciaTenant(slug),
    welcomeMessage: "Olá! Aqui é o assistente de agendamentos.",
    handoffMessage: "Um atendente humano vai continuar. Digite *bot* para voltar ao menu.",
  }).returning();
  return criado;
}

export function podeUsarWhatsapp(authorized: boolean, features: Record<string, boolean>) {
  return Boolean(authorized && features.whatsapp_bot);
}
