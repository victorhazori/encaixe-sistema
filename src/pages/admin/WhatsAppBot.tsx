import { useEffect, useState, type FormEvent } from "react";
import { MessageCircle, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { Aviso } from "../../components/ui";
import { api } from "../../lib/api";
import { digitsOnly, maskPhone } from "../../lib/phone";
import { clearSandboxContacts, removeSandboxContact } from "../../lib/waSandboxContacts";

type WaSettings = {
  authorized: boolean;
  enabled: boolean;
  phone?: string | null;
  welcomeMessage?: string | null;
  handoffMessage?: string | null;
  mode: string;
};

type WaPayload = {
  authorized: boolean;
  canUse: boolean;
  features: Record<string, boolean>;
  settings: WaSettings;
  provider: string;
  evolutionConfigured: boolean;
};

type Conversa = {
  phone: string;
  lastBody: string;
  lastAt: string;
  lastDirection?: string;
  count: number;
  handoff?: boolean;
};

type Msg = { id: number; phone: string; direction: string; body: string; createdAt: string };

export function WhatsAppBot({ token, onOpenSandbox }: { token: string; onOpenSandbox: () => void }) {
  const [cfg, setCfg] = useState<WaPayload | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [welcome, setWelcome] = useState("");
  const [handoff, setHandoff] = useState("");
  const [mode, setMode] = useState<"rules" | "ai">("rules");
  const [report, setReport] = useState<{ messages7d: number; handoffsActive: number; conversations: Conversa[] } | null>(null);
  const [evo, setEvo] = useState<{ state?: string; instance?: string; provider?: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [thread, setThread] = useState<{ phone: string; msgs: Msg[] } | null>(null);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const dados = await api<WaPayload>("/admin/whatsapp", {}, token);
      setCfg(dados);
      setEnabled(Boolean(dados.settings.enabled));
      setPhone(dados.settings.phone ?? "");
      setWelcome(dados.settings.welcomeMessage ?? "");
      setHandoff(dados.settings.handoffMessage ?? "");
      setMode(dados.settings.mode === "ai" ? "ai" : "rules");
      if (dados.canUse) {
        const [rep, status] = await Promise.all([
          api<typeof report>("/admin/whatsapp/report", {}, token).catch(() => null),
          api<{ state?: string; instance?: string; provider?: string }>("/admin/whatsapp/evolution/status", {}, token).catch(() => null),
        ]);
        setReport(rep);
        setEvo(status);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar WhatsApp.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token]);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!cfg?.canUse) return;
    setSalvando(true);
    setErro("");
    setOk("");
    try {
      await api("/admin/whatsapp", {
        method: "PUT",
        body: JSON.stringify({
          enabled,
          phone: digitsOnly(phone) || null,
          welcomeMessage: welcome || null,
          handoffMessage: handoff || null,
          mode,
        }),
      }, token);
      setOk(enabled ? "Integração WhatsApp ativa e salva." : "Integração desativada. Configurações salvas.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function gerarQr() {
    setErro("");
    try {
      await api("/admin/whatsapp/evolution/ensure", { method: "POST" }, token);
      const data = await api<{ base64?: string | null }>("/admin/whatsapp/evolution/qr", {}, token);
      setQr(data.base64 ?? null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao gerar QR.");
    }
  }

  async function abrirConversa(item: Conversa) {
    const msgs = await api<Msg[]>(`/admin/whatsapp/messages?phone=${encodeURIComponent(item.phone)}`, {}, token);
    setThread({ phone: item.phone, msgs });
  }

  async function apagarUma(phoneAlvo: string) {
    if (!window.confirm(`Apagar conversa de ${maskPhone(phoneAlvo)}?`)) return;
    await api(`/admin/whatsapp/conversations/${phoneAlvo}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    }, token);
    removeSandboxContact(phoneAlvo);
    if (thread?.phone === phoneAlvo) setThread(null);
    setOk("Conversa apagada.");
    await carregar();
  }

  async function limparTodas() {
    if (!window.confirm("Limpar todas as conversas do WhatsApp?")) return;
    await api("/admin/whatsapp/conversations", {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    }, token);
    clearSandboxContacts();
    setThread(null);
    setOk("Todas as conversas foram apagadas.");
    await carregar();
  }

  if (carregando) return <p className="hint">Carregando WhatsApp…</p>;

  if (!cfg?.canUse) {
    return (
      <section className="admin-panel">
        <div className="admin-panel__title">
          <h2>WhatsApp</h2>
          <p>Conecte o número da loja e configure o assistente de agendamentos.</p>
        </div>
        <Aviso erro>
          {!cfg?.authorized
            ? "Este módulo ainda não foi autorizado pelo Encaixe. Peça ao suporte/master para liberar."
            : "O plano atual não inclui WhatsApp Bot. Atualize para Pro ou Enterprise."}
        </Aviso>
      </section>
    );
  }

  const aiAllowed = Boolean(cfg.features.whatsapp_ai);

  return (
    <div className="wa-page">
      <section className="admin-panel">
        <div className="admin-panel__title">
          <h2>WhatsApp</h2>
          <p>Conecte o WhatsApp da loja, ative o bot, configure as mensagens e acompanhe o uso.</p>
        </div>
        <div className="wa-help">
          <strong>Sobre a integração</strong>
          <ul>
            <li>Use <strong>Conexão WhatsApp</strong> para gerar o QR (quando Evolution estiver disponível).</li>
            <li>Com a integração <strong>ativa</strong>, o bot responde agendamentos, cancelamentos e handoff.</li>
            <li>
              Para testar sem celular, abra o{" "}
              <button type="button" className="wa-link" onClick={onOpenSandbox}>Simulador de chat</button>.
            </li>
          </ul>
        </div>
      </section>

      {ok && <Aviso>{ok}</Aviso>}
      {erro && <Aviso erro>{erro}</Aviso>}

      <form className="admin-panel" onSubmit={salvar}>
        <div className="admin-panel__title">
          <h2>Integração</h2>
          <p>Liga ou desliga o assistente WhatsApp da loja.</p>
          <span className={`wa-pill${enabled ? " is-on" : ""}`}>{enabled ? "Ativa" : "Desativada"}</span>
        </div>

        <label className="wa-check">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>
            <strong>Ativar integração com o bot do WhatsApp</strong>
            <small>Controla respostas automáticas (menu, agenda, cancelar, atendente).</small>
          </span>
        </label>

        <label className="admin-field">
          <span>Número WhatsApp da loja</span>
          <input
            value={maskPhone(phone)}
            onChange={(e) => setPhone(digitsOnly(e.target.value))}
            inputMode="tel"
            placeholder="(11) 99999-0000"
          />
        </label>

        <div className="admin-panel__title" style={{ marginTop: "1.5rem" }}>
          <h2>Mensagens do bot</h2>
          <p>Textos que o cliente vê no WhatsApp.</p>
        </div>
        <label className="admin-field">
          <span>Boas-vindas</span>
          <textarea rows={3} value={welcome} disabled={!enabled} onChange={(e) => setWelcome(e.target.value)} placeholder="Olá! Sou o assistente. Digite menu para ver as opções." />
        </label>
        <label className="admin-field">
          <span>Handoff (falar com atendente)</span>
          <textarea rows={2} value={handoff} disabled={!enabled} onChange={(e) => setHandoff(e.target.value)} placeholder="Um atendente vai continuar. Digite *bot* para voltar." />
          <small className="hint">Após o handoff o bot para até o cliente digitar *bot*.</small>
        </label>

        <div className="admin-panel__title" style={{ marginTop: "1.5rem" }}>
          <h2>Modo do assistente</h2>
          <p>Regras (menu numérico) ou IA (quando o plano incluir).</p>
        </div>
        {!aiAllowed && (
          <p className="hint">Modo IA não está no plano atual. Peça ao master a feature <code>whatsapp_ai</code>.</p>
        )}
        <label className="admin-field" style={{ maxWidth: "22rem" }}>
          <span>Modo</span>
          <select
            value={mode === "ai" && aiAllowed ? "ai" : "rules"}
            disabled={!enabled || !aiAllowed}
            onChange={(e) => setMode(e.target.value === "ai" ? "ai" : "rules")}
          >
            <option value="rules">Regras (números / menu)</option>
            <option value="ai" disabled={!aiAllowed}>IA + ferramentas</option>
          </select>
        </label>

        <div className="admin-actions" style={{ marginTop: "1.25rem" }}>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar configurações do WhatsApp"}
          </button>
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-panel__title">
          <h2>Conexão WhatsApp</h2>
          <p>
            Provider: <strong>{cfg.provider}</strong>
            {cfg.provider === "console"
              ? " · modo local — use o simulador (sem Docker)"
              : ` · ${evo?.instance || "—"} · ${evo?.state || "—"}`}
          </p>
        </div>
        {cfg.provider === "console" ? (
          <Aviso>
            Em desenvolvimento local o provider é <code>console</code>. Teste pelo simulador.
            QR real só com Evolution configurada no servidor.
          </Aviso>
        ) : (
          <div className="wa-evo-actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => carregar()}>
              <RefreshCw size={14} /> Atualizar status
            </button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={gerarQr} disabled={!cfg.evolutionConfigured || evo?.state === "open"}>
              <QrCode size={14} /> {evo?.state === "open" ? "Já conectado" : "Gerar / atualizar QR"}
            </button>
          </div>
        )}
        {qr && (
          <img className="wa-qr" src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`} alt="QR Code WhatsApp" />
        )}
      </section>

      {report && (
        <section className="admin-metrics wa-metrics">
          <article><strong>{report.messages7d}</strong><span>Mensagens (7d)</span></article>
          <article><strong>{report.handoffsActive}</strong><span>Handoffs ativos</span></article>
          <article><strong>{report.conversations.length}</strong><span>Conversas</span></article>
        </section>
      )}

      <section className="admin-panel">
        <div className="admin-panel__title">
          <h2>Conversas</h2>
          <p>Últimas conversas agrupadas por número.</p>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={limparTodas} disabled={!report?.conversations.length}>
            <Trash2 size={14} /> Limpar todas
          </button>
        </div>
        {!report?.conversations.length ? (
          <p className="hint">Nenhuma conversa ainda. Use o simulador para gerar histórico.</p>
        ) : (
          <ul className="wa-conv-list">
            {report.conversations.map((c) => (
              <li key={c.phone}>
                <button type="button" className="wa-conv-item" onClick={() => abrirConversa(c)}>
                  <MessageCircle size={16} />
                  <span>
                    <strong>{maskPhone(c.phone)}</strong>
                    {c.handoff ? " · handoff" : ""}
                    <small>{c.count} msgs · {c.lastBody.slice(0, 70)}</small>
                  </span>
                </button>
                <button type="button" className="admin-btn admin-btn--ghost" aria-label="Apagar" onClick={() => apagarUma(c.phone)}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {thread && (
        <div className="wa-modal" role="dialog" aria-modal>
          <div className="wa-modal__card">
            <header>
              <div>
                <strong>{maskPhone(thread.phone)}</strong>
                <small>Últimas mensagens</small>
              </div>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setThread(null)}>Fechar</button>
            </header>
            <div className="wa-thread">
              {thread.msgs.map((m) => (
                <div key={m.id} className={`wa-bubble ${m.direction === "in" ? "is-in" : "is-out"}`}>
                  <small>{m.direction === "in" ? "Cliente" : "Bot"}</small>
                  <p>{m.body}</p>
                </div>
              ))}
            </div>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => apagarUma(thread.phone)}>
              <Trash2 size={14} /> Apagar esta conversa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
