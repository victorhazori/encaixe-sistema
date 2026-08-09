import { useEffect, useState } from "react";
import { api, type Tenant } from "./api";

export function useTenantTheme(slug?: string, fallbackColor?: string) {
  const [tenant, setTenant] = useState<Tenant>();

  useEffect(() => {
    const cor = fallbackColor || tenant?.primaryColor;
    if (cor) document.documentElement.style.setProperty("--cor-marca", cor);
  }, [fallbackColor, tenant?.primaryColor]);

  useEffect(() => {
    if (!slug) return;
    let ativo = true;
    api<Tenant>(`/public/${slug}`)
      .then((t) => {
        if (!ativo) return;
        setTenant(t);
        document.documentElement.style.setProperty("--cor-marca", t.primaryColor);
      })
      .catch(() => { /* slug inválido — mantém fallback */ });
    return () => { ativo = false; };
  }, [slug]);

  return tenant;
}
