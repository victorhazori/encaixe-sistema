import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { closeDb, db, usingPglite } from "./client.js";
import {
  loyaltyRules,
  plans,
  professionals,
  serviceProfessionals,
  services,
  tenants,
  users,
  workingHours,
} from "./schema.js";

async function executarSeed() {
  if (!usingPglite && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não definida. Use pglite no .env ou um PostgreSQL.");
  }

  const [planoBasic] = await db
    .insert(plans)
    .values({
      name: "Basic",
      slug: "basic",
      priceCents: 4900,
      limits: { professionals: 3, appointmentsMonth: 200 },
      features: {
        whatsapp_bot: false,
        whatsapp_ai: false,
        reminders: true,
        multi_professional: true,
        custom_branding: true,
      },
    })
    .onConflictDoUpdate({
      target: plans.slug,
      set: {
        name: "Basic",
        active: true,
        limits: { professionals: 3, appointmentsMonth: 200 },
        features: {
          whatsapp_bot: false,
          whatsapp_ai: false,
          reminders: true,
          multi_professional: true,
          custom_branding: true,
        },
      },
    })
    .returning();

  await db.insert(plans).values([
    {
      name: "Pro",
      slug: "pro",
      priceCents: 9900,
      limits: { professionals: 10, appointmentsMonth: 1000 },
      features: {
        whatsapp_bot: true,
        whatsapp_ai: false,
        reminders: true,
        multi_professional: true,
        custom_branding: true,
      },
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      priceCents: 19900,
      limits: { professionals: 50, appointmentsMonth: null },
      features: {
        whatsapp_bot: true,
        whatsapp_ai: true,
        reminders: true,
        multi_professional: true,
        custom_branding: true,
      },
    },
  ]).onConflictDoUpdate({
    target: plans.slug,
    set: { active: true },
  });

  const plano = planoBasic;

  const [tenant] = await db
    .insert(tenants)
    .values({
      planId: plano.id,
      name: "Barbearia Demo",
      slug: "barbearia-demo",
      phone: "(11) 99999-0000",
      address: "Rua das Tesouras, 42",
    })
    .onConflictDoUpdate({ target: tenants.slug, set: { planId: plano.id, active: true } })
    .returning();

  const senha = await bcrypt.hash("Demo@1234", 12);
  await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      name: "Administrador Demo",
      email: "admin@demo.encaixe",
      passwordHash: senha,
      role: "admin",
    })
    .onConflictDoUpdate({
      target: [users.tenantId, users.email],
      set: { passwordHash: senha, active: true },
    });

  const existentes = await db.select().from(professionals).where(eq(professionals.tenantId, tenant.id));
  let profissionais = existentes;
  if (profissionais.length === 0) {
    profissionais = await db
      .insert(professionals)
      .values([
        { tenantId: tenant.id, name: "Rafael Costa", bio: "Cortes clássicos e modernos." },
        { tenantId: tenant.id, name: "Bruno Lima", bio: "Especialista em barba e acabamento." },
      ])
      .returning();
  }

  const servicosExistentes = await db.select().from(services).where(eq(services.tenantId, tenant.id));
  let listaServicos = servicosExistentes;
  if (listaServicos.length === 0) {
    listaServicos = await db
      .insert(services)
      .values([
        { tenantId: tenant.id, name: "Corte", description: "Corte completo", durationMinutes: 45, priceCents: 4500, icon: "scissors" },
        { tenantId: tenant.id, name: "Barba", description: "Barba com toalha quente", durationMinutes: 30, priceCents: 3500, icon: "sparkles" },
        { tenantId: tenant.id, name: "Corte + Barba", description: "Experiência completa", durationMinutes: 75, priceCents: 7500, icon: "razor" },
      ])
      .returning();
  } else {
    // Atualiza ícones demo se ainda estiverem no padrão
    const icones: Record<string, string> = { Corte: "scissors", Barba: "sparkles", "Corte + Barba": "razor" };
    for (const servico of listaServicos) {
      const icon = icones[servico.name];
      if (icon) {
        await db.update(services).set({ icon }).where(eq(services.id, servico.id));
      }
    }
  }

  await db
    .insert(serviceProfessionals)
    .values(
      listaServicos.flatMap((servico) =>
        profissionais.map((profissional) => ({
          tenantId: tenant.id,
          serviceId: servico.id,
          professionalId: profissional.id,
        })),
      ),
    )
    .onConflictDoNothing();

  const horas = profissionais.flatMap((profissional) =>
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      tenantId: tenant.id,
      professionalId: profissional.id,
      weekday,
      startTime: "09:00",
      endTime: weekday === 6 ? "14:00" : "19:00",
    })),
  );
  await db.insert(workingHours).values(horas).onConflictDoNothing();

  const regras = await db.select().from(loyaltyRules).where(eq(loyaltyRules.tenantId, tenant.id));
  if (regras.length === 0) {
    await db.insert(loyaltyRules).values({
      tenantId: tenant.id,
      name: "Cliente fiel",
      appointmentsRequired: 10,
      rewardDescription: "Um corte gratuito após 10 atendimentos.",
    });
  }

  console.log("Seed concluído. Público: /barbearia-demo · Admin: /barbearia-demo/admin · admin@demo.encaixe / Demo@1234");
}

executarSeed()
  .catch((erro) => {
    console.error("Falha ao executar seed:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
