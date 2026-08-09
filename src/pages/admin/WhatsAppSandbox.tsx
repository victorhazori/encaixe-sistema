import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Plus, RefreshCw, RotateCcw, Search, Send, Trash2 } from "lucide-react";
import { Aviso } from "../../components/ui";
import { api } from "../../lib/api";
import { digitsOnly, maskPhone } from "../../lib/phone";
import {
  clearSandboxContacts,
  loadSandboxContacts,
  removeSandboxContact,
  saveSandboxContacts,
  type SandboxContact,
} from "../../lib/waSandboxContacts";

type Bubble = { id: string; direction: "in" | "out"; body: string; created_at: string; pending?: boolean };
type Conversa = {
  phone: string;
  lastBody: string;
  lastAt: string;
  lastDirection?: string;
  count: number;
  handoff?: boolean;
  state?: string | null;
};
type Msg = { id: number; phone: string; direction: string; body: string; createdAt: string };

const QUICK = ["menu", "oi", "1", "2", "3", "bot"];

function previewBody(body: string, max = 56) {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

function initials(name: string, phone: string) {
  const clean = name.trim();
  if (clean) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }
  return phone.slice(-2) || "?";
}

function stateLabel(state?: string | null) {
  if (!state) return "sem sessão";
  const map: Record<string, string> = {
    idle: "menu",
    cancel_pick: "escolher cancelamento",
    handoff_human: "atendente",
  };
  return map[state] || state;
}

export function WhatsAppSandbox({ token }: { token: string }) {
  const [contacts, setContacts] = useState<SandboxContact[]>(() => loadSandboxContacts());
  const [conversations, setConversations] = useState<Conversa[]>([]);
  const [phone, setPhone] = useState(() => loadSandboxContacts()[0]?.phone || "");
  const [draft, setDraft] = useState("");
  const [pushName, setPushName] = useState(() => loadSandboxContacts()[0]?.name || "Cliente Teste");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [sessionState, setSessionState] = useState<string | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const phoneDigits = digitsOnly(phone);

  const loadList = useCallback(async () => {
    try {
      const access = await api<{ canUse: boolean }>("/admin/whatsapp", {}, token);
      if (!access.canUse) {
        setBlocked(true);
        return;
      }
      setBlocked(false);
      const lista = await api<Conversa[]>("/admin/whatsapp/conversations", {}, token);
      setConversations(lista);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao listar conversas.");
    }
  }, [token]);

  const loadThread = useCallback(async (alvo: string) => {
    const digits = digitsOnly(alvo);
    if (digits.length < 10) return;
    const msgs = await api<Msg[]>(`/admin/whatsapp/messages?phone=${encodeURIComponent(digits)}`, {}, token);
    setBubbles(msgs.map((m) => ({
      id: String(m.id),
      direction: m.direction === "in" ? "in" : "out",
      body: m.body,
      created_at: m.createdAt,
    })));
    const conv = conversations.find((c) => digitsOnly(c.phone) === digits);
    setHandoff(Boolean(conv?.handoff));
    setSessionState(conv?.state ?? null);
  }, [token, conversations]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!phoneDigits) return;
    loadThread(phoneDigits).catch(() => undefined);
  }, [phoneDigits, loadThread]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [bubbles]);

  const conversationByPhone = useMemo(() => {
    const map = new Map<string, Conversa>();
    for (const row of conversations) map.set(digitsOnly(row.phone), row);
    return map;
  }, [conversations]);

  const sidebarRows = useMemo(() => {
    const map = new Map<string, {
      phone: string;
      name: string;
      last_at: string;
      last_body: string;
      handoff: boolean;
    }>();
    for (const contact of contacts) {
      const conv = conversationByPhone.get(contact.phone);
      map.set(contact.phone, {
        phone: contact.phone,
        name: contact.name || "Cliente",
        last_at: conv?.lastAt || contact.updated_at,
        last_body: conv?.lastBody || "Nenhuma mensagem ainda",
        handoff: Boolean(conv?.handoff),
      });
    }
    for (const conv of conversations) {
      const p = digitsOnly(conv.phone);
      if (map.has(p)) continue;
      map.set(p, {
        phone: p,
        name: "Cliente",
        last_at: conv.lastAt,
        last_body: conv.lastBody,
        handoff: Boolean(conv.handoff),
      });
    }
    const rows = [...map.values()];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.phone.includes(digitsOnly(q)))
      : rows;
    return filtered.sort((a, b) => String(b.last_at).localeCompare(String(a.last_at)));
  }, [contacts, conversations, conversationByPhone, query]);

  function selectContact(p: string, name?: string) {
    setPhone(p);
    if (name) setPushName(name);
    else {
      const c = contacts.find((x) => x.phone === p);
      setPushName(c?.name || "Cliente");
    }
    setMobileShowChat(true);
  }

  function criarContato(evento: FormEvent) {
    evento.preventDefault();
    const p = digitsOnly(newPhone);
    if (p.length < 10) {
      setErro("Telefone inválido.");
      return;
    }
    const next = [
      { phone: p, name: newName.trim() || "Cliente", updated_at: new Date().toISOString() },
      ...contacts.filter((c) => c.phone !== p),
    ];
    setContacts(next);
    saveSandboxContacts(next);
    setShowNew(false);
    setNewPhone("");
    setNewName("");
    selectContact(p, newName.trim() || "Cliente");
  }

  async function enviar(texto?: string) {
    const message = (texto ?? draft).trim();
    if (!message || phoneDigits.length < 10 || sending) return;
    setSending(true);
    setErro("");
    const tempId = `tmp-${Date.now()}`;
    setBubbles((b) => [...b, {
      id: tempId,
      direction: "in",
      body: message,
      created_at: new Date().toISOString(),
      pending: true,
    }]);
    setDraft("");
    try {
      const resp = await api<{ reply: string; handoff?: boolean; state?: string | null }>("/admin/whatsapp/sandbox", {
        method: "POST",
        body: JSON.stringify({ phone: phoneDigits, message, pushName }),
      }, token);
      setBubbles((b) => [
        ...b.filter((x) => x.id !== tempId),
        { id: `${tempId}-in`, direction: "in", body: message, created_at: new Date().toISOString() },
        { id: `${tempId}-out`, direction: "out", body: resp.reply, created_at: new Date().toISOString() },
      ]);
      setHandoff(Boolean(resp.handoff));
      setSessionState(resp.state ?? null);
      const next = contacts.map((c) => c.phone === phoneDigits
        ? { ...c, name: pushName, updated_at: new Date().toISOString() }
        : c);
      if (!next.some((c) => c.phone === phoneDigits)) {
        next.unshift({ phone: phoneDigits, name: pushName, updated_at: new Date().toISOString() });
      }
      setContacts(next);
      saveSandboxContacts(next);
      await loadList();
    } catch (e) {
      setBubbles((b) => b.filter((x) => x.id !== tempId));
      setErro(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setSending(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar();
    }
  }

  async function resetar() {
    await api("/admin/whatsapp/sandbox/reset", {
      method: "POST",
      body: JSON.stringify({ phone: phoneDigits }),
    }, token);
    setSessionState("idle");
    setHandoff(false);
    setOk("Sessão resetada.");
    await loadThread(phoneDigits);
  }

  async function apagarAtual() {
    if (!window.confirm(`Apagar conversa de ${maskPhone(phoneDigits)}?`)) return;
    await api(`/admin/whatsapp/conversations/${phoneDigits}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    }, token);
    removeSandboxContact(phoneDigits);
    setContacts(loadSandboxContacts());
    setBubbles([]);
    setOk("Conversa apagada.");
    await loadList();
  }

  async function limparTodas() {
    if (!window.confirm("Apagar todas as conversas?")) return;
    await api("/admin/whatsapp/conversations", {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    }, token);
    clearSandboxContacts();
    setContacts(loadSandboxContacts());
    setBubbles([]);
    setOk("Todas as conversas apagadas.");
    await loadList();
  }

  if (blocked) {
    return (
      <section className="admin-panel">
        <Aviso erro>WhatsApp não autorizado para este negócio. Peça liberação ao master.</Aviso>
      </section>
    );
  }

  return (
    <div className="wa-sandbox-page">
      <section className="admin-panel">
        <div className="admin-panel__title">
          <h2>Simulador WhatsApp</h2>
          <p>Teste o bot como se fossem vários clientes — sem celular e sem WhatsApp real.</p>
        </div>
        <Aviso>
          Só para teste local. Os números são simulados; a lógica é a mesma do bot de produção.
        </Aviso>
      </section>

      {ok && <Aviso>{ok}</Aviso>}
      {erro && <Aviso erro>{erro}</Aviso>}

      <div className={`wa-sandbox-app${mobileShowChat ? " is-chat-open" : ""}`}>
        <aside className="wa-sandbox-sidebar">
          <div className="wa-sandbox-side-head">
            <strong>Conversas · {sidebarRows.length}</strong>
            <div>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => loadList()} aria-label="Atualizar"><RefreshCw size={14} /></button>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={limparTodas} aria-label="Limpar"><Trash2 size={14} /></button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => setShowNew((v) => !v)}><Plus size={14} /> Nova</button>
            </div>
          </div>

          {showNew && (
            <form className="wa-sandbox-new" onSubmit={criarContato}>
              <input placeholder="Telefone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              <input placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="admin-actions">
                <button type="submit" className="admin-btn admin-btn--primary">Criar e abrir</button>
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setShowNew(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <label className="wa-sandbox-search">
            <Search size={14} />
            <input placeholder="Buscar nome ou número…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>

          <ul className="wa-sandbox-list">
            {!sidebarRows.length && <li className="hint">Nenhuma conversa. Clique em Nova.</li>}
            {sidebarRows.map((row) => (
              <li key={row.phone} className="wa-sandbox-item-wrap">
                <button
                  type="button"
                  className={`wa-sandbox-item${digitsOnly(row.phone) === phoneDigits ? " is-active" : ""}`}
                  onClick={() => selectContact(row.phone, row.name)}
                >
                  <span className="wa-sandbox-avatar">{initials(row.name, row.phone)}</span>
                  <span>
                    <strong>{row.name}</strong>
                    <small>{maskPhone(row.phone)} · {previewBody(row.last_body)}</small>
                  </span>
                  {row.handoff && <span className="wa-sandbox-dot" title="Handoff" />}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="wa-sandbox-chat">
          {!phoneDigits ? (
            <div className="wa-sandbox-empty">Selecione ou crie uma conversa.</div>
          ) : (
            <>
              <header className="wa-chat-head">
                <button type="button" className="wa-sandbox-back admin-btn admin-btn--ghost" onClick={() => setMobileShowChat(false)}>
                  Conversas
                </button>
                <div>
                  <strong>{pushName}</strong>
                  <small>{maskPhone(phoneDigits)} · {stateLabel(sessionState)}{handoff ? " · handoff" : ""}</small>
                </div>
                <span className={`wa-pill${handoff ? "" : " is-on"}`}>{handoff ? "Handoff" : "Bot"}</span>
                <div className="wa-chat-actions">
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={resetar}><RotateCcw size={14} /> Resetar</button>
                  <button type="button" className="admin-btn admin-btn--ghost" onClick={apagarAtual}><Trash2 size={14} /></button>
                </div>
              </header>

              <label className="admin-field wa-sim-name">
                <span>Nome do cliente</span>
                <input value={pushName} onChange={(e) => setPushName(e.target.value)} />
              </label>

              <div className="wa-quick">
                {QUICK.map((chip) => (
                  <button key={chip} type="button" className="chip" onClick={() => void enviar(chip)}>{chip}</button>
                ))}
              </div>

              <div className="wa-chat-scroll" ref={scrollerRef}>
                {!bubbles.length && <p className="hint">Conversa vazia — digite como o cliente.</p>}
                {bubbles.map((b) => (
                  <div key={b.id} className={`wa-bubble ${b.direction === "in" ? "is-in" : "is-out"}${b.pending ? " is-pending" : ""}`}>
                    <p>{b.body}</p>
                  </div>
                ))}
              </div>

              <div className="wa-chat-compose">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Digite como o cliente… (Enter envia)"
                  disabled={sending}
                />
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => void enviar()} disabled={sending || !draft.trim()}>
                  <Send size={14} /> Enviar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
