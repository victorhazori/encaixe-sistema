export type PlanFeatureKey =
  | "whatsapp_bot"
  | "whatsapp_ai"
  | "reminders"
  | "multi_professional"
  | "custom_branding";

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

export type PlanLimits = {
  professionals: number;
  appointmentsMonth: number | null;
};

export const PLANOS_SEED: Array<{
  name: string;
  slug: "basic" | "pro" | "enterprise";
  priceCents: number;
  limits: PlanLimits;
  features: PlanFeatures;
}> = [
  {
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
  },
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
];

export function normalizarFeatures(raw: unknown): PlanFeatures {
  const base: PlanFeatures = {
    whatsapp_bot: false,
    whatsapp_ai: false,
    reminders: true,
    multi_professional: true,
    custom_branding: true,
  };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as PlanFeatureKey[]) {
    if (obj[key] !== undefined) base[key] = Boolean(obj[key]);
  }
  return base;
}

export function temFeature(features: unknown, chave: PlanFeatureKey) {
  return Boolean(normalizarFeatures(features)[chave]);
}
