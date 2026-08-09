import { useEffect, useState } from "react";
import { api, type Tenant } from "./api";

export type ModoTema = "light" | "dark";

const CHAVE_MODO = "encaixe_tema";

function hexValido(valor: string) {
  return /^#[0-9a-fA-F]{6}$/.test(valor);
}

function luminanciaRelativa(hex: string) {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Texto legível sobre a cor de marca (botões, ícone da marca). */
export function textoSobreMarca(hex: string) {
  return luminanciaRelativa(hex) > 0.55 ? "#12171c" : "#ffffff";
}

/** Aplica a cor base e deriva contraste; variantes de UI vêm do CSS via color-mix. */
export function aplicarCorMarca(hex?: string | null) {
  if (!hex || !hexValido(hex)) return;
  const root = document.documentElement;
  root.style.setProperty("--cor-marca", hex);
  root.style.setProperty("--texto-on-marca", textoSobreMarca(hex));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", hex);
}

export function obterModoTema(): ModoTema {
  try {
    const salvo = localStorage.getItem(CHAVE_MODO);
    if (salvo === "light" || salvo === "dark") return salvo;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function aplicarModoTema(modo: ModoTema) {
  document.documentElement.dataset.theme = modo;
  try {
    localStorage.setItem(CHAVE_MODO, modo);
  } catch {
    /* ignore */
  }
}

export function alternarModoTema(): ModoTema {
  const proximo: ModoTema = obterModoTema() === "dark" ? "light" : "dark";
  aplicarModoTema(proximo);
  return proximo;
}

/** Inicializa modo claro/escuro o quanto antes (evita flash). */
export function iniciarTema() {
  aplicarModoTema(obterModoTema());
}

export function useModoTema() {
  const [modo, setModo] = useState<ModoTema>(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
      ? "dark"
      : obterModoTema(),
  );

  useEffect(() => {
    aplicarModoTema(modo);
  }, [modo]);

  function alternar() {
    setModo((atual) => (atual === "dark" ? "light" : "dark"));
  }

  return { modo, setModo, alternar, escuro: modo === "dark" };
}

export function useTenantTheme(slug?: string, fallbackColor?: string) {
  const [tenant, setTenant] = useState<Tenant>();

  useEffect(() => {
    const cor = fallbackColor || tenant?.primaryColor;
    if (cor) aplicarCorMarca(cor);
  }, [fallbackColor, tenant?.primaryColor]);

  useEffect(() => {
    if (!slug) return;
    let ativo = true;
    api<Tenant>(`/public/${slug}`)
      .then((t) => {
        if (!ativo) return;
        setTenant(t);
        aplicarCorMarca(t.primaryColor);
      })
      .catch(() => { /* slug inválido — mantém fallback */ });
    return () => { ativo = false; };
  }, [slug]);

  return tenant;
}
