import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { CalendarOff, Clock3, Palette, Plus, Trash2 } from "lucide-react";
import { api, dataHora, type Professional, type Tenant } from "../../lib/api";

export function Configuracoes({
  token,
  tenant,
  atualizar,
}: {
  token: string;
  tenant: Tenant;
  atualizar: (t: Tenant) => void;
}) {
  type Horario = { id: number; professionalId: number; weekday: number; startTime: string; endTime: string };
  type Bloqueio = { id: number; professionalId?: number; startsAt: string; endsAt: string; reason?: string };

  const [profissionais, setProfissionais] = useState<Professional[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [corPreview, setCorPreview] = useState(tenant.primaryColor);
  const [corTexto, setCorTexto] = useState(tenant.primaryColor);
  const [aviso, setAviso] = useState("");

  const carregarAgenda = () =>
    Promise.all([
      api<Professional[]>("/admin/professionals", {}, token),
      api<Horario[]>("/admin/hours", {}, token),
      api<Bloqueio[]>("/admin/blocks", {}, token),
    ]).then(([p, h, b]) => {
      setProfissionais(p);
      setHorarios(h);
      setBloqueios(b);
    });

  useEffect(() => {
    carregarAgenda();
  }, [token]);

  useEffect(() => {
    setCorPreview(tenant.primaryColor);
    setCorTexto(tenant.primaryColor);
  }, [tenant.primaryColor]);

  function aplicarCorPreview(hex: string) {
    setCorPreview(hex);
    setCorTexto(hex);
    document.documentElement.style.setProperty("--cor-marca", hex);
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setAviso("");
    const f = new FormData(evento.currentTarget);
    const galeria = [f.get("gallery1"), f.get("gallery2"), f.get("gallery3")]
      .map((v) => String(v || "").trim())
      .filter(Boolean);
    const novo = await api<Tenant>(
      "/admin/branding",
      {
        method: "PUT",
        body: JSON.stringify({
          name: f.get("name"),
          phone: f.get("phone"),
          address: f.get("address"),
          primaryColor: f.get("primaryColor") || corPreview,
          logoUrl: String(f.get("logoUrl") || "").trim() || null,
          heroImageUrl: String(f.get("heroImageUrl") || "").trim() || null,
          galleryUrls: galeria,
        }),
      },
      token,
    );
    localStorage.setItem("encaixe_tenant", JSON.stringify(novo));
    document.documentElement.style.setProperty("--cor-marca", novo.primaryColor);
    setCorPreview(novo.primaryColor);
    setCorTexto(novo.primaryColor);
    atualizar(novo);
    setAviso("Identidade visual e fotos atualizadas.");
  }

  async function salvarHorario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    await api(
      "/admin/hours",
      {
        method: "POST",
        body: JSON.stringify({
          professionalId: Number(f.get("professionalId")),
          weekday: Number(f.get("weekday")),
          startTime: f.get("startTime"),
          endTime: f.get("endTime"),
        }),
      },
      token,
    );
    carregarAgenda();
  }

  async function salvarBloqueio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const f = new FormData(evento.currentTarget);
    await api(
      "/admin/blocks",
      {
        method: "POST",
        body: JSON.stringify({
          professionalId: f.get("professionalId") ? Number(f.get("professionalId")) : null,
          startsAt: new Date(String(f.get("startsAt"))),
          endsAt: new Date(String(f.get("endsAt"))),
          reason: f.get("reason"),
        }),
      },
      token,
    );
    evento.currentTarget.reset();
    carregarAgenda();
  }

  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <section className="admin-config">
      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>
              <Palette size={18} style={{ verticalAlign: -3, marginRight: 8, color: "var(--cor-marca)" }} />
              Identidade do negócio
            </h2>
            <p className="admin-panel__lead">Nome, contato e a cor da marca usada em todo o Encaixe.</p>
          </div>
        </div>

        <div className="admin-color-preview" style={{ "--cor-marca": corPreview } as CSSProperties}>
          <div className="admin-color-preview__swatch" aria-hidden />
          <div>
            <strong>Pré-visualização de --cor-marca</strong>
            <small>
              {corPreview} · botões, menu ativo e destaques do painel usam esta cor.
            </small>
          </div>
        </div>

        <form className="admin-form admin-config__grid" onSubmit={salvar} style={{ marginTop: "1rem" }}>
          <label className="admin-field">
            <span>Nome</span>
            <input name="name" defaultValue={tenant.name} required />
          </label>
          <label className="admin-field">
            <span>Telefone</span>
            <input name="phone" defaultValue={tenant.phone} />
          </label>
          <label className="admin-field">
            <span>Endereço</span>
            <input name="address" defaultValue={tenant.address} />
          </label>
          <label className="admin-field">
            <span>Cor da marca</span>
            <div className="admin-color-field">
              <input
                name="primaryColor"
                type="color"
                value={corPreview}
                onChange={(e) => aplicarCorPreview(e.target.value)}
                aria-label="Seletor de cor da marca"
              />
              <input
                type="text"
                value={corTexto}
                onChange={(e) => {
                  const v = e.target.value;
                  setCorTexto(v);
                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) aplicarCorPreview(v);
                }}
                onBlur={() => {
                  if (!/^#[0-9A-Fa-f]{6}$/.test(corTexto)) setCorTexto(corPreview);
                }}
                pattern="^#[0-9A-Fa-f]{6}$"
                aria-label="Código hexadecimal da cor"
              />
            </div>
          </label>
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              Salvar alterações
            </button>
          </div>
        </form>

        {aviso && <div className="admin-notice admin-notice--ok">{aviso}</div>}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>
              <Clock3 size={18} style={{ verticalAlign: -3, marginRight: 8, color: "var(--cor-marca)" }} />
              Jornada de trabalho
            </h2>
            <p className="admin-panel__lead">Horários semanais por profissional.</p>
          </div>
        </div>

        <form className="admin-form admin-form--inline" onSubmit={salvarHorario}>
          <label className="admin-field">
            <span>Profissional</span>
            <select name="professionalId" required>
              {profissionais.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Dia</span>
            <select name="weekday">
              {dias.map((dia, indice) => (
                <option value={indice} key={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Início</span>
            <input name="startTime" type="time" defaultValue="09:00" required />
          </label>
          <label className="admin-field">
            <span>Fim</span>
            <input name="endTime" type="time" defaultValue="18:00" required />
          </label>
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              <Plus size={16} /> Salvar jornada
            </button>
          </div>
        </form>

        <div className="admin-list" style={{ marginTop: "1rem" }}>
          {horarios.map((h) => (
            <article key={h.id} className="admin-row">
              <span className="admin-icon">
                <Clock3 size={18} />
              </span>
              <div className="admin-row__body">
                <strong>{profissionais.find((p) => p.id === h.professionalId)?.name}</strong>
                <small>
                  {dias[h.weekday]} · {h.startTime.slice(0, 5)} às {h.endTime.slice(0, 5)}
                </small>
              </div>
              <div className="admin-row__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  onClick={() => api(`/admin/hours/${h.id}`, { method: "DELETE" }, token).then(carregarAgenda)}
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </article>
          ))}
        </div>

        {!horarios.length && (
          <div className="admin-empty" style={{ marginTop: "1rem" }}>
            <h3>Sem jornadas cadastradas</h3>
            <p>Defina pelo menos um horário semanal para liberar slots na reserva pública.</p>
          </div>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__title">
          <div>
            <h2>
              <CalendarOff size={18} style={{ verticalAlign: -3, marginRight: 8, color: "var(--cor-marca)" }} />
              Bloqueios de agenda
            </h2>
            <p className="admin-panel__lead">Feriados, folgas e intervalos indisponíveis.</p>
          </div>
        </div>

        <form className="admin-form admin-form--inline" onSubmit={salvarBloqueio}>
          <label className="admin-field">
            <span>Escopo</span>
            <select name="professionalId">
              <option value="">Toda a equipe</option>
              {profissionais.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Início</span>
            <input name="startsAt" type="datetime-local" required />
          </label>
          <label className="admin-field">
            <span>Fim</span>
            <input name="endsAt" type="datetime-local" required />
          </label>
          <label className="admin-field">
            <span>Motivo</span>
            <input name="reason" placeholder="Ex.: Feriado" />
          </label>
          <div className="admin-actions">
            <button type="submit" className="admin-btn admin-btn--primary">
              <Plus size={16} /> Bloquear
            </button>
          </div>
        </form>

        <div className="admin-list" style={{ marginTop: "1rem" }}>
          {bloqueios.map((b) => (
            <article key={b.id} className="admin-row">
              <span className="admin-icon admin-icon--muted">
                <CalendarOff size={18} />
              </span>
              <div className="admin-row__body">
                <strong>{b.reason || "Horário bloqueado"}</strong>
                <small>
                  {dataHora(b.startsAt)} até {dataHora(b.endsAt)}
                </small>
              </div>
              <div className="admin-row__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  onClick={() => api(`/admin/blocks/${b.id}`, { method: "DELETE" }, token).then(carregarAgenda)}
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </article>
          ))}
        </div>

        {!bloqueios.length && (
          <div className="admin-empty" style={{ marginTop: "1rem" }}>
            <h3>Nenhum bloqueio</h3>
            <p>Bloqueios removem intervalos específicos da disponibilidade.</p>
          </div>
        )}
      </div>
    </section>
  );
}
