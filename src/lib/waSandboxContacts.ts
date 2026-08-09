const KEY = "encaixe.wa.sandbox.contacts";

export type SandboxContact = {
  phone: string;
  name: string;
  updated_at: string;
};

const DEFAULTS: SandboxContact[] = [
  { phone: "11999990001", name: "Cliente Teste", updated_at: new Date(0).toISOString() },
  { phone: "11988880002", name: "Maria Agenda", updated_at: new Date(0).toISOString() },
  { phone: "11977770003", name: "João Cancelar", updated_at: new Date(0).toISOString() },
];

export function loadSandboxContacts(): SandboxContact[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS.map((c) => ({ ...c }));
    const parsed = JSON.parse(raw) as SandboxContact[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULTS.map((c) => ({ ...c }));
    return parsed;
  } catch {
    return DEFAULTS.map((c) => ({ ...c }));
  }
}

export function saveSandboxContacts(contacts: SandboxContact[]) {
  localStorage.setItem(KEY, JSON.stringify(contacts));
}

export function clearSandboxContacts() {
  localStorage.removeItem(KEY);
}

export function removeSandboxContact(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const next = loadSandboxContacts().filter((c) => c.phone.replace(/\D/g, "") !== digits);
  saveSandboxContacts(next.length ? next : DEFAULTS.map((c) => ({ ...c })));
}
