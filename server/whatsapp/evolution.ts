export function evolutionConfig() {
  return {
    base: (process.env.EVOLUTION_API_URL || "http://127.0.0.1:8081").replace(/\/$/, ""),
    key: process.env.EVOLUTION_API_KEY || "",
    provider: (process.env.WHATSAPP_PROVIDER || "console").toLowerCase(),
    configured: Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY),
  };
}

export function instanciaTenant(slug: string) {
  const limpo = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "tenant";
  return `encaixe-${limpo}`.toLowerCase();
}

export function evolutionWebhookSecret() {
  return (
    process.env.EVOLUTION_WEBHOOK_SECRET
    || process.env.BOT_WEBHOOK_SECRET
    || process.env.EVOLUTION_API_KEY
    || ""
  ).trim();
}

/** URL que o container Evolution usa para chamar a API no host (Linux: host-gateway). */
export function evolutionWebhookUrl() {
  const explicit = (process.env.EVOLUTION_WEBHOOK_URL || "").trim();
  if (explicit) return explicit;
  const secret = evolutionWebhookSecret();
  const host = (process.env.EVOLUTION_WEBHOOK_HOST || "host.docker.internal").trim();
  const port = process.env.PORT || "5000";
  const url = `http://${host}:${port}/api/webhooks/evolution`;
  return secret ? `${url}?apikey=${encodeURIComponent(secret)}` : url;
}

export async function evolutionFetch(path: string, init?: RequestInit) {
  const { base, key } = evolutionConfig();
  if (!key) {
    return { ok: false, status: 503, data: { erro: "EVOLUTION_API_KEY não configurada." } };
  }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function evolutionStatus(instance: string) {
  const result = await evolutionFetch(`/instance/connectionState/${encodeURIComponent(instance)}`);
  const payload = result.data as { instance?: { state?: string }; state?: string };
  const state = payload?.instance?.state || payload?.state || (result.ok ? "unknown" : "not_created");
  return { ok: result.ok, status: result.status, state, raw: result.data };
}

export async function evolutionSetWebhook(instance: string) {
  const url = evolutionWebhookUrl();
  const secret = evolutionWebhookSecret();
  const body = {
    enabled: true,
    url,
    webhookByEvents: false,
    webhookBase64: false,
    events: [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE",
    ],
    ...(secret ? { headers: { apikey: secret } } : {}),
  };
  // Evolution v2 aceita /webhook/set/:instance
  const result = await evolutionFetch(`/webhook/set/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    // fallback envelope "webhook"
    return evolutionFetch(`/webhook/set/${encodeURIComponent(instance)}`, {
      method: "POST",
      body: JSON.stringify({ webhook: body }),
    });
  }
  return result;
}

export async function evolutionEnsure(instance: string) {
  const status = await evolutionStatus(instance);
  let created = false;
  if (!status.state || status.state === "not_created" || !status.ok) {
    const result = await evolutionFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: instance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
    created = result.ok;
    if (!result.ok) {
      return { created: false, ok: false, status: result.status, raw: result.data, state: "not_created" as const };
    }
  }
  const webhook = await evolutionSetWebhook(instance);
  return {
    created,
    ok: true,
    status: 200,
    raw: { webhook: webhook.data },
    state: status.state && status.state !== "not_created" ? status.state : "connecting",
  };
}

export async function evolutionQr(instance: string) {
  const result = await evolutionFetch(`/instance/connect/${encodeURIComponent(instance)}`);
  const data = result.data as {
    base64?: string;
    qrcode?: { base64?: string };
    code?: string;
  };
  const base64 = data.base64 || data.qrcode?.base64 || null;
  return { ok: result.ok, status: result.status, base64, raw: result.data };
}

export async function evolutionSendText(instance: string, phone: string, text: string) {
  const { provider } = evolutionConfig();
  if (provider !== "evolution") {
    return { ok: true, simulated: true as const };
  }
  const number = phone.replace(/\D/g, "");
  return evolutionFetch(`/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: JSON.stringify({ number, text }),
  });
}
